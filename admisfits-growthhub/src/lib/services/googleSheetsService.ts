import { supabase } from '@/integrations/supabase/client';

export type SheetColumnMappings = {
  date: string; // header name for date column (e.g., "Date")
  ad_spend?: string; // header name for ad spend column
  revenue?: string; // header name for revenue column
  leads?: string; // header name for leads column
};

export type GoogleSheetConnection = {
  spreadsheetId: string;
  sheetName: string;
  mappings: SheetColumnMappings;
};

export async function fetchSheetCsv(spreadsheetId: string, sheetName: string): Promise<string> {
  // Public CSV export URL via gviz - requires the sheet to be shared appropriately or published
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Sheet CSV: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function parseCsv(csvText: string): string[][] {
  // Minimal CSV parser supporting quoted fields and commas
  const rows: string[][] = [];
  let i = 0;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  while (i < csvText.length) {
    const char = csvText[i];
    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // ignore
      } else {
        field += char;
      }
    }
    i += 1;
  }
  // last field
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[$,%\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeDate(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export type MetricRow = {
  date: string; // yyyy-mm-dd
  ad_spend?: number | null;
  revenue?: number | null;
  leads?: number | null;
};

export function mapCsvToMetrics(csvText: string, mappings: SheetColumnMappings): MetricRow[] {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim());
  const idx = (name?: string) => (name ? header.indexOf(name) : -1);

  const dateIdx = idx(mappings.date);
  const spendIdx = idx(mappings.ad_spend);
  const revenueIdx = idx(mappings.revenue);
  const leadsIdx = idx(mappings.leads);

  const result: MetricRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const dateRaw = cols[dateIdx] ?? '';
    const date = normalizeDate(dateRaw);
    if (!date) continue;
    result.push({
      date,
      ad_spend: spendIdx >= 0 ? toNumber(cols[spendIdx]) : null,
      revenue: revenueIdx >= 0 ? toNumber(cols[revenueIdx]) : null,
      leads: leadsIdx >= 0 ? toNumber(cols[leadsIdx]) : null,
    });
  }
  return result;
}

export async function upsertMetricsForProject(projectId: string, metricRows: MetricRow[]) {
  if (metricRows.length === 0) return { inserted: 0, updated: 0 };
  // Fetch existing rows for the dates present
  const dates = metricRows.map(r => r.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const { data: existing, error } = await supabase
    .from('project_metrics')
    .select('id,date')
    .eq('project_id', projectId)
    .gte('date', minDate)
    .lte('date', maxDate);
  if (error) throw error;

  const dateToId = new Map<string, string>();
  (existing || []).forEach(r => dateToId.set(r.date as unknown as string, r.id as unknown as string));

  let inserted = 0;
  let updated = 0;
  for (const row of metricRows) {
    const existingId = dateToId.get(row.date);
    if (existingId) {
      const { error: upErr } = await supabase
        .from('project_metrics')
        .update({
          ad_spend: row.ad_spend ?? undefined,
          cash_collected_post_refund: row.revenue ?? undefined,
          qualified_leads: row.leads ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId);
      if (upErr) throw upErr;
      updated += 1;
    } else {
      const { error: insErr } = await supabase
        .from('project_metrics')
        .insert({
          project_id: projectId,
          date: row.date,
          ad_spend: row.ad_spend ?? null,
          cash_collected_post_refund: row.revenue ?? null,
          qualified_leads: row.leads ?? null,
        });
      if (insErr) throw insErr;
      inserted += 1;
    }
  }

  return { inserted, updated };
}

export async function syncGoogleSheetToProject(projectId: string, connection: GoogleSheetConnection) {
  const csv = await fetchSheetCsv(connection.spreadsheetId, connection.sheetName);
  const rows = mapCsvToMetrics(csv, connection.mappings);
  return upsertMetricsForProject(projectId, rows);
} 