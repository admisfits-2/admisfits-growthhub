import { supabase } from '@/integrations/supabase/client';
import { GoogleOAuthService, ProjectGoogleConnection } from './googleOAuthService';
import { autoSyncService } from './autoSyncService';

// Sync mode type
export type SyncMode = 'daily_aggregate' | 'individual_records';

// Configuration interface for Google Sheets sync
export interface GoogleSheetsSyncConfig {
  id?: string;
  project_id: string;
  spreadsheet_id: string;
  sheet_name: string;
  range_start: string;
  date_column: string;
  
  // Sync mode configuration
  sync_mode?: SyncMode; // 'daily_aggregate' (default) or 'individual_records'
  unique_id_column?: string; // Required for individual_records mode (e.g., close_id)
  record_type?: string; // 'sale', 'lead', 'call', etc. - required for individual_records
  amount_column?: string; // For individual records - maps to the amount field
  status_column?: string; // For individual records - maps to the status field
  
  // Standard metric columns (for daily_aggregate mode)
  outbound_clicks_column?: string;
  amount_spent_column?: string;
  outbound_ctr_column?: string;
  cpm_column?: string;
  cpc_column?: string;
  impressions_column?: string;
  reach_column?: string;
  frequency_column?: string;
  conversions_column?: string;
  conversion_rate_column?: string;
  cost_per_conversion_column?: string;
  revenue_column?: string;
  roas_column?: string;
  custom_metrics?: { [key: string]: string }; // Custom metric name -> column letter mapping
  
  // Sync settings
  is_active: boolean;
  sync_frequency_minutes: number;
  auto_aggregate?: boolean; // Generate daily aggregates from individual records
}

// Single spreadsheet configuration with multiple sheets
export interface SpreadsheetConfig {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheets: string[];
  column_mappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } };
  is_active: boolean;
  
  // Per-spreadsheet sync mode configuration
  sync_mode?: SyncMode; // 'daily_aggregate' (default) or 'individual_records'
  unique_id_column?: string; // Required for individual_records mode
  record_type?: string; // 'sale', 'lead', 'call', etc.
  amount_column?: string; // For individual records
  status_column?: string; // For individual records
  auto_aggregate?: boolean; // Generate daily aggregates from individual records
}

// Multi-spreadsheet configuration for a project
export interface MultiSpreadsheetSyncConfig {
  id?: string;
  project_id: string;
  spreadsheets: SpreadsheetConfig[];
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error' | 'syncing';
  last_sync_error?: string;
}

// Daily metrics interface
export interface DailyMetrics {
  project_id: string;
  date: string; // YYYY-MM-DD format
  source: string;
  outbound_clicks?: number;
  amount_spent?: number;
  outbound_ctr?: number;
  cpm?: number;
  cpc?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  conversions?: number;
  conversion_rate?: number;
  cost_per_conversion?: number;
  revenue?: number;
  roas?: number;
  raw_data?: any;
}

// Individual record interface
export interface IndividualRecord {
  project_id: string;
  record_id: string; // Unique identifier (close_id, lead_id, etc.)
  date: string; // YYYY-MM-DD format
  source: string;
  record_type: string; // 'sale', 'lead', 'call', etc.
  amount?: number; // Sale amount, lead value, etc.
  status?: string; // 'closed', 'pending', 'cancelled', etc.
  record_data: { [key: string]: any }; // All other fields from the sheet
}

// Google Sheets API configuration
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class GoogleSheetsMetricsService {
  /**
   * Sync multiple spreadsheets to project
   */
  async syncMultipleSpreadsheets(
    projectId: string,
    config: MultiSpreadsheetSyncConfig
  ): Promise<{
    success: boolean;
    total_rows_processed: number;
    total_inserted: number;
    total_updated: number;
    spreadsheet_results: Array<{
      spreadsheet_id: string;
      spreadsheet_name: string;
      rows_processed: number;
      inserted: number;
      updated: number;
      sheets_synced: number;
      error?: string;
    }>;
    error?: string;
  }> {
    const results = {
      success: true,
      total_rows_processed: 0,
      total_inserted: 0,
      total_updated: 0,
      spreadsheet_results: [] as Array<{
        spreadsheet_id: string;
        spreadsheet_name: string;
        rows_processed: number;
        inserted: number;
        updated: number;
        sheets_synced: number;
        error?: string;
      }>,
    };

    try {
      // Ensure we have a connection
      if (!this.connection) {
        throw new Error('Google connection is required');
      }

      // Sync each spreadsheet
      for (const spreadsheetConfig of config.spreadsheets) {
        if (!spreadsheetConfig.is_active) continue;

        try {
          const spreadsheetResult = await this.syncMultipleSheetsToProject(
            projectId,
            spreadsheetConfig.spreadsheet_id,
            spreadsheetConfig.sheets,
            spreadsheetConfig.column_mappings
          );
          
          results.spreadsheet_results.push({
            spreadsheet_id: spreadsheetConfig.spreadsheet_id,
            spreadsheet_name: spreadsheetConfig.spreadsheet_name,
            rows_processed: spreadsheetResult.total_rows_processed,
            inserted: spreadsheetResult.total_inserted,
            updated: spreadsheetResult.total_updated,
            sheets_synced: spreadsheetResult.sheet_results.length,
            error: spreadsheetResult.error,
          });

          if (spreadsheetResult.success) {
            results.total_rows_processed += spreadsheetResult.total_rows_processed;
            results.total_inserted += spreadsheetResult.total_inserted;
            results.total_updated += spreadsheetResult.total_updated;
          } else {
            results.success = false;
          }
        } catch (error: any) {
          results.success = false;
          results.spreadsheet_results.push({
            spreadsheet_id: spreadsheetConfig.spreadsheet_id,
            spreadsheet_name: spreadsheetConfig.spreadsheet_name,
            rows_processed: 0,
            inserted: 0,
            updated: 0,
            sheets_synced: 0,
            error: error.message || 'Unknown error',
          });
        }
      }

      return results;
    } catch (error: any) {
      console.error('Error syncing multiple spreadsheets:', error);
      return {
        ...results,
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Save multi-spreadsheet configuration
   */
  async saveMultiSpreadsheetConfig(config: MultiSpreadsheetSyncConfig): Promise<MultiSpreadsheetSyncConfig> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Store multi-spreadsheet config as JSON in custom_metrics field
    const configData = {
      project_id: config.project_id,
      spreadsheet_id: 'multi-spreadsheet', // Special identifier for multi-configs
      sheet_name: 'multi-config',
      range_start: 'A2',
      date_column: 'A',
      is_active: config.auto_sync_enabled,
      sync_frequency_minutes: config.sync_frequency_minutes,
      custom_metrics: {
        _multi_spreadsheet_config: JSON.stringify(config)
      },
      user_id: user.user.id
    };

    // Check if a config already exists for this project
    const { data: existingConfig } = await supabase
      .from('google_sheets_sync_configs')
      .select('id')
      .eq('project_id', config.project_id)
      .single();

    let data, error;

    if (existingConfig) {
      // Update existing configuration
      const result = await supabase
        .from('google_sheets_sync_configs')
        .update(configData)
        .eq('project_id', config.project_id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new configuration
      const result = await supabase
        .from('google_sheets_sync_configs')
        .insert(configData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Failed to save multi-spreadsheet config:', error);
      throw new Error(`Failed to save configuration: ${error.message}`);
    }

    // Update auto-sync service
    if (config.auto_sync_enabled && config.sync_frequency_minutes > 0) {
      await autoSyncService.updateSyncJob(config.project_id, 'multi', config.sync_frequency_minutes);
    } else {
      autoSyncService.removeSyncJob(config.project_id, 'multi');
    }

    return config;
  }

  /**
   * Get multi-spreadsheet configuration
   */
  async getMultiSpreadsheetConfig(projectId: string): Promise<MultiSpreadsheetSyncConfig | null> {
    const { data, error } = await supabase
      .from('google_sheets_sync_configs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No config found
      console.error('Failed to get multi-spreadsheet config:', error);
      throw error;
    }

    // Check if this config contains multi-spreadsheet data
    if (data?.custom_metrics?._multi_spreadsheet_config) {
      try {
        return JSON.parse(data.custom_metrics._multi_spreadsheet_config);
      } catch (e) {
        console.error('Failed to parse multi-spreadsheet config:', e);
        return null;
      }
    }

    return null;
  }

  /**
   * Sync multiple sheets to project with custom column mappings
   */
  async syncMultipleSheetsToProject(
    projectId: string,
    spreadsheetId: string,
    sheets: string[],
    columnMappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } }
  ): Promise<{
    success: boolean;
    total_rows_processed: number;
    total_inserted: number;
    total_updated: number;
    sheet_results: Array<{
      sheet_name: string;
      rows_processed: number;
      inserted: number;
      updated: number;
      error?: string;
    }>;
    error?: string;
  }> {
    const results = {
      success: true,
      total_rows_processed: 0,
      total_inserted: 0,
      total_updated: 0,
      sheet_results: [] as Array<{
        sheet_name: string;
        rows_processed: number;
        inserted: number;
        updated: number;
        error?: string;
      }>,
    };

    try {
      // Ensure we have a connection
      if (!this.connection) {
        throw new Error('Google connection is required');
      }

      // Sync each sheet
      for (const sheetName of sheets) {
        try {
          const sheetResult = await this.syncSheetToProject(projectId, spreadsheetId, sheetName, columnMappings);
          
          results.sheet_results.push({
            sheet_name: sheetName,
            rows_processed: sheetResult.rows_processed,
            inserted: sheetResult.inserted,
            updated: sheetResult.updated,
            error: sheetResult.error,
          });

          if (sheetResult.success) {
            results.total_rows_processed += sheetResult.rows_processed;
            results.total_inserted += sheetResult.inserted;
            results.total_updated += sheetResult.updated;
          } else {
            results.success = false;
          }
        } catch (error: any) {
          results.success = false;
          results.sheet_results.push({
            sheet_name: sheetName,
            rows_processed: 0,
            inserted: 0,
            updated: 0,
            error: error.message || 'Unknown error',
          });
        }
      }

      return results;
    } catch (error: any) {
      console.error('Error syncing multiple sheets:', error);
      return {
        ...results,
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get sheet data from Google Sheets
   */
  async getSheetData(spreadsheetId: string, sheetName: string): Promise<any[][]> {
    if (!this.connection) {
      throw new Error('Google connection is required');
    }

    const accessToken = await this.getAccessToken();
    const range = `${sheetName}!A1:Z1000`; // Get a large range to capture all data
    
    return await GoogleOAuthService.getSheetData(spreadsheetId, range, accessToken);
  }

  /**
   * Parse date value from sheet
   */
  private parseDate(value: any): string | null {
    return this.parseValue(value, 'date');
  }

  /**
   * Sync a specific sheet to project with custom column mappings
   */
  async syncSheetToProject(
    projectId: string,
    spreadsheetId: string,
    sheetName: string,
    columnMappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } }
  ): Promise<{
    success: boolean;
    rows_processed: number;
    inserted: number;
    updated: number;
    error?: string;
  }> {
    try {
      // Ensure we have a connection
      if (!this.connection) {
        throw new Error('Google connection is required');
      }

      // Fetch sheet data
      const sheetData = await this.getSheetData(spreadsheetId, sheetName);
      if (!sheetData || sheetData.length === 0) {
        return {
          success: false,
          rows_processed: 0,
          inserted: 0,
          updated: 0,
          error: 'No data found in sheet'
        };
      }

      // Parse and transform data based on column mappings
      const metrics = await this.parseSheetDataWithMappings(sheetData, columnMappings);

      // Upsert metrics with overwrite for existing dates
      const results = await this.upsertMetricsWithOverwrite(projectId, metrics);

      return {
        success: true,
        rows_processed: metrics.length,
        inserted: results.inserted,
        updated: results.updated
      };
    } catch (error: any) {
      console.error('Error syncing sheet:', error);
      return {
        success: false,
        rows_processed: 0,
        inserted: 0,
        updated: 0,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Parse sheet data with custom column mappings
   */
  private async parseSheetDataWithMappings(
    sheetData: any[][],
    columnMappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } }
  ): Promise<any[]> {
    const metrics = [];
    const headers = sheetData[0] || [];

    // Find date column
    const dateColumnLetter = Object.entries(columnMappings)
      .find(([_, mapping]) => mapping.metricKey === 'date')?.[0];
    
    if (!dateColumnLetter) {
      throw new Error('Date column mapping is required');
    }

    const dateColumnIndex = this.columnLetterToIndex(dateColumnLetter);

    // Process each row (skip header)
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const dateValue = row[dateColumnIndex];
      
      if (!dateValue) continue;

      const date = this.parseDate(dateValue);
      if (!date || date === 'Invalid Date') continue;

      const metric: any = { date };

      // Process each mapped column
      for (const [columnLetter, mapping] of Object.entries(columnMappings)) {
        if (mapping.metricKey === 'date') continue;

        const columnIndex = this.columnLetterToIndex(columnLetter);
        const value = row[columnIndex];

        if (value === undefined || value === null || value === '') continue;

        if (mapping.isCustom) {
          // Store custom metrics in custom_data field
          if (!metric.custom_data) metric.custom_data = {};
          metric.custom_data[mapping.metricName] = this.parseValue(value, 'number');
        } else {
          // Map to standard fields
          metric[mapping.metricKey] = this.parseValue(value, 'number');
        }
      }

      metrics.push(metric);
    }

    return metrics;
  }

  /**
   * Upsert metrics with overwrite logic
   */
  private async upsertMetricsWithOverwrite(
    projectId: string,
    metrics: any[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    // Get user authentication once
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Get existing dates for this project
    const dates = metrics.map(m => m.date);
    const { data: existing } = await supabase
      .from('project_daily_metrics')
      .select('date')
      .eq('project_id', projectId)
      .eq('source', 'google_sheets')
      .in('date', dates);

    const existingDates = new Set(existing?.map(e => e.date) || []);

    // Upsert each metric
    for (const metric of metrics) {
      const isUpdate = existingDates.has(metric.date);

      const { error } = await supabase
        .from('project_daily_metrics')
        .upsert({
          ...metric,
          project_id: projectId,
          source: 'google_sheets',
          user_id: user.user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id,date,source'
        });

      if (!error) {
        if (isUpdate) {
          updated++;
        } else {
          inserted++;
        }
      } else {
        console.error('Error upserting metric:', error);
      }
    }

    return { inserted, updated };
  }
  private connection: ProjectGoogleConnection | null = null;

  constructor(connection?: ProjectGoogleConnection) {
    this.connection = connection || null;
  }

  // Set connection
  setConnection(connection: ProjectGoogleConnection) {
    this.connection = connection;
  }

  // Validate connection
  private validateConnection(): boolean {
    if (!this.connection) {
      console.error('Google connection is required');
      return false;
    }
    return true;
  }

  // Get valid access token
  private async getAccessToken(): Promise<string> {
    if (!this.connection) {
      throw new Error('No Google connection available');
    }
    return await GoogleOAuthService.getValidAccessToken(this.connection);
  }

  // Convert column letter to index (A=0, B=1, etc.)
  private columnLetterToIndex(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  // Parse value safely
  private parseValue(value: any, type: 'number' | 'date' | 'string' = 'string'): any {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    switch (type) {
      case 'number':
        const num = parseFloat(String(value).replace(/[,$%]/g, ''));
        return isNaN(num) ? null : num;
      
      case 'date':
        // Handle different date formats
        if (typeof value === 'string') {
          // Try parsing YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
          }
          // Try parsing other formats and convert to YYYY-MM-DD
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
        return null;
      
      default:
        return String(value);
    }
  }

  // Fetch data from Google Sheets using OAuth
  async fetchSheetData(spreadsheetId: string, range: string): Promise<any[][]> {
    if (!this.validateConnection()) {
      throw new Error('Google connection is required');
    }

    try {
      const accessToken = await this.getAccessToken();
      return await GoogleOAuthService.getSheetData(spreadsheetId, range, accessToken);
    } catch (error) {
      console.error('Failed to fetch Google Sheets data:', error);
      throw error;
    }
  }

  // Parse sheet data into metrics
  parseMetricsFromSheet(
    rows: any[][],
    config: GoogleSheetsSyncConfig,
    projectId: string
  ): DailyMetrics[] {
    const metrics: DailyMetrics[] = [];

    for (const row of rows) {
      try {
        // Parse date
        const dateValue = this.parseValue(
          row[this.columnLetterToIndex(config.date_column)],
          'date'
        );

        if (!dateValue) {
          continue; // Skip rows without valid dates
        }

        // Parse metrics
        const outbound_clicks = config.outbound_clicks_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.outbound_clicks_column)],
              'number'
            )
          : null;

        const amount_spent = config.amount_spent_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.amount_spent_column)],
              'number'
            )
          : null;

        const outbound_ctr = config.outbound_ctr_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.outbound_ctr_column)],
              'number'
            )
          : null;

        const cpm = config.cpm_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.cpm_column)],
              'number'
            )
          : null;

        const cpc = config.cpc_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.cpc_column)],
              'number'
            )
          : null;

        // Parse additional predefined metrics
        const impressions = config.impressions_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.impressions_column)],
              'number'
            )
          : null;

        const reach = config.reach_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.reach_column)],
              'number'
            )
          : null;

        const frequency = config.frequency_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.frequency_column)],
              'number'
            )
          : null;

        const conversions = config.conversions_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.conversions_column)],
              'number'
            )
          : null;

        const conversion_rate = config.conversion_rate_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.conversion_rate_column)],
              'number'
            )
          : null;

        const cost_per_conversion = config.cost_per_conversion_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.cost_per_conversion_column)],
              'number'
            )
          : null;

        const revenue = config.revenue_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.revenue_column)],
              'number'
            )
          : null;

        const roas = config.roas_column
          ? this.parseValue(
              row[this.columnLetterToIndex(config.roas_column)],
              'number'
            )
          : null;

        // Parse custom metrics
        const custom_data: any = {};
        if (config.custom_metrics) {
          Object.entries(config.custom_metrics).forEach(([metricName, columnLetter]) => {
            custom_data[metricName] = this.parseValue(
              row[this.columnLetterToIndex(columnLetter)],
              'number'
            );
          });
        }

        metrics.push({
          project_id: projectId,
          date: dateValue,
          source: 'google_sheets',
          outbound_clicks,
          amount_spent,
          outbound_ctr,
          cpm,
          cpc,
          impressions,
          reach,
          frequency,
          conversions,
          conversion_rate,
          cost_per_conversion,
          revenue,
          roas,
          raw_data: {
            row_data: row,
            parsed_at: new Date().toISOString(),
            custom_data,
          },
        });
      } catch (error) {
        console.warn('Failed to parse row:', row, error);
        continue;
      }
    }

    return metrics;
  }

  // Save sync configuration
  async saveSyncConfig(config: GoogleSheetsSyncConfig): Promise<GoogleSheetsSyncConfig> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('google_sheets_sync_configs')
      .upsert({
        ...config,
        user_id: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save sync config:', error);
      throw error;
    }

    // Update auto-sync service for single spreadsheet config
    if (config.is_active && config.sync_frequency_minutes > 0) {
      await autoSyncService.updateSyncJob(config.project_id, 'single', config.sync_frequency_minutes);
    } else {
      autoSyncService.removeSyncJob(config.project_id, 'single');
    }

    return data;
  }

  // Get sync configuration for a project
  async getSyncConfig(projectId: string): Promise<GoogleSheetsSyncConfig | null> {
    const { data, error } = await supabase
      .from('google_sheets_sync_configs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No config found
      console.error('Failed to get sync config:', error);
      throw error;
    }

    // If this is a multi-spreadsheet config, don't return it as a single config
    if (data?.custom_metrics?._multi_spreadsheet_config) {
      return null;
    }

    return data;
  }

  // Save metrics to database
  async saveMetrics(metrics: DailyMetrics[]): Promise<{ inserted: number; updated: number }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    let inserted = 0;
    let updated = 0;

    for (const metric of metrics) {
      try {
        // Extract custom data from raw_data if it exists
        const custom_data = metric.raw_data?.custom_data || {};
        
        // Prepare metric data without raw_data custom_data
        const metricData = {
          project_id: metric.project_id,
          date: metric.date,
          source: metric.source,
          outbound_clicks: metric.outbound_clicks,
          amount_spent: metric.amount_spent,
          outbound_ctr: metric.outbound_ctr,
          cpm: metric.cpm,
          cpc: metric.cpc,
          impressions: metric.impressions,
          reach: metric.reach,
          frequency: metric.frequency,
          conversions: metric.conversions,
          conversion_rate: metric.conversion_rate,
          cost_per_conversion: metric.cost_per_conversion,
          revenue: metric.revenue,
          roas: metric.roas,
          custom_data: custom_data,
          raw_data: metric.raw_data,
          user_id: user.user.id,
        };

        const { data, error } = await supabase
          .from('project_daily_metrics')
          .upsert(metricData)
          .select()
          .single();

        if (error) {
          console.error('Failed to save metric:', metric, error);
          continue;
        }

        // Check if it was an insert or update (this is approximate)
        const { count } = await supabase
          .from('project_daily_metrics')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', metric.project_id)
          .eq('date', metric.date)
          .eq('source', metric.source);

        if (count === 1) {
          // Assume it was an insert if we only have 1 record for this date/project/source
          inserted++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error('Error saving metric:', err);
      }
    }

    return { inserted, updated };
  }

  // Parse sheet data into individual records
  parseIndividualRecordsFromSheet(
    rows: any[][],
    config: GoogleSheetsSyncConfig,
    projectId: string
  ): IndividualRecord[] {
    const records: IndividualRecord[] = [];

    if (!config.unique_id_column || !config.record_type) {
      throw new Error('unique_id_column and record_type are required for individual records mode');
    }

    const uniqueIdIndex = this.columnLetterToIndex(config.unique_id_column);
    const dateIndex = this.columnLetterToIndex(config.date_column);
    const amountIndex = config.amount_column ? this.columnLetterToIndex(config.amount_column) : -1;
    const statusIndex = config.status_column ? this.columnLetterToIndex(config.status_column) : -1;

    for (const row of rows) {
      try {
        // Parse required fields
        const recordId = row[uniqueIdIndex]?.toString().trim();
        const dateValue = this.parseValue(row[dateIndex], 'date');

        if (!recordId || !dateValue) {
          continue; // Skip rows without required fields
        }

        // Parse optional fields
        const amount = amountIndex >= 0 ? this.parseValue(row[amountIndex], 'number') : null;
        const status = statusIndex >= 0 ? row[statusIndex]?.toString().trim() : null;

        // Collect all other data
        const recordData: { [key: string]: any } = {};
        
        // Add custom metrics to record data
        if (config.custom_metrics) {
          Object.entries(config.custom_metrics).forEach(([metricName, columnLetter]) => {
            const columnIndex = this.columnLetterToIndex(columnLetter);
            const value = this.parseValue(row[columnIndex], 'string');
            if (value !== null) {
              recordData[metricName] = value;
            }
          });
        }

        // Add all standard metric columns to record data
        const standardColumns = [
          'outbound_clicks_column', 'amount_spent_column', 'outbound_ctr_column',
          'cpm_column', 'cpc_column', 'impressions_column', 'reach_column',
          'frequency_column', 'conversions_column', 'conversion_rate_column',
          'cost_per_conversion_column', 'revenue_column', 'roas_column'
        ];

        standardColumns.forEach(columnKey => {
          const columnLetter = (config as any)[columnKey];
          if (columnLetter) {
            const columnIndex = this.columnLetterToIndex(columnLetter);
            const value = this.parseValue(row[columnIndex], 'number');
            if (value !== null) {
              const fieldName = columnKey.replace('_column', '');
              recordData[fieldName] = value;
            }
          }
        });

        records.push({
          project_id: projectId,
          record_id: recordId,
          date: dateValue,
          source: 'google_sheets',
          record_type: config.record_type,
          amount,
          status,
          record_data: recordData,
        });
      } catch (error) {
        console.warn('Failed to parse individual record row:', row, error);
        continue;
      }
    }

    return records;
  }

  // Save individual records to database
  async saveIndividualRecords(records: IndividualRecord[]): Promise<{ inserted: number; updated: number }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    let inserted = 0;
    let updated = 0;

    // Get existing record IDs for this project and source
    const recordIds = records.map(r => r.record_id);
    const { data: existing } = await supabase
      .from('project_individual_records')
      .select('record_id')
      .eq('project_id', records[0]?.project_id)
      .eq('source', 'google_sheets')
      .in('record_id', recordIds);

    const existingIds = new Set(existing?.map(e => e.record_id) || []);

    // Insert/update each record
    for (const record of records) {
      try {
        const isUpdate = existingIds.has(record.record_id);

        const { error } = await supabase
          .from('project_individual_records')
          .upsert({
            ...record,
            user_id: user.user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'project_id,source,record_id'
          });

        if (!error) {
          if (isUpdate) {
            updated++;
          } else {
            inserted++;
          }
        } else {
          console.error('Error upserting individual record:', error);
        }
      } catch (err) {
        console.error('Error saving individual record:', err);
      }
    }

    return { inserted, updated };
  }

  // Sync individual records from sheet
  async syncIndividualRecordsFromSheet(
    projectId: string,
    config: GoogleSheetsSyncConfig
  ): Promise<{
    success: boolean;
    records_synced: number;
    inserted: number;
    updated: number;
    error?: string;
  }> {
    try {
      // Validate config for individual records mode
      if (!config.unique_id_column || !config.record_type) {
        throw new Error('unique_id_column and record_type are required for individual records mode');
      }

      // Get Google connection for this project
      const connection = await GoogleOAuthService.getConnection(projectId);
      if (!connection) {
        throw new Error('Google connection is required. Please reconnect your Google account.');
      }

      // Set the connection
      this.setConnection(connection);

      // Construct range
      const range = `${config.sheet_name}!${config.range_start}:Z1000`;

      // Fetch data from Google Sheets
      const rows = await this.fetchSheetData(config.spreadsheet_id, range);

      if (rows.length === 0) {
        return {
          success: true,
          records_synced: 0,
          inserted: 0,
          updated: 0,
        };
      }

      // Parse individual records
      const records = this.parseIndividualRecordsFromSheet(rows, config, projectId);

      // Save to database
      const { inserted, updated } = await this.saveIndividualRecords(records);

      // Update sync status
      await supabase
        .from('google_sheets_sync_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
        })
        .eq('project_id', projectId);

      return {
        success: true,
        records_synced: records.length,
        inserted,
        updated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update sync status with error
      await supabase
        .from('google_sheets_sync_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: errorMessage,
        })
        .eq('project_id', projectId);

      return {
        success: false,
        records_synced: 0,
        inserted: 0,
        updated: 0,
        error: errorMessage,
      };
    }
  }

  // Perform full sync (supports both daily aggregate and individual records modes)
  async syncProjectMetrics(projectId: string): Promise<{
    success: boolean;
    metrics_synced: number;
    inserted: number;
    updated: number;
    error?: string;
  }> {
    try {
      // Get sync configuration
      const config = await this.getSyncConfig(projectId);
      if (!config) {
        throw new Error('No sync configuration found for this project');
      }

      // Check sync mode and delegate to appropriate method
      const syncMode = config.sync_mode || 'daily_aggregate';
      
      if (syncMode === 'individual_records') {
        // Sync individual records
        const result = await this.syncIndividualRecordsFromSheet(projectId, config);
        return {
          success: result.success,
          metrics_synced: result.records_synced,
          inserted: result.inserted,
          updated: result.updated,
          error: result.error,
        };
      } else {
        // Default: sync daily aggregates
        return await this.syncDailyAggregatesFromSheet(projectId, config);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        metrics_synced: 0,
        inserted: 0,
        updated: 0,
        error: errorMessage,
      };
    }
  }

  // Sync daily aggregates from sheet (original logic)
  private async syncDailyAggregatesFromSheet(
    projectId: string,
    config: GoogleSheetsSyncConfig
  ): Promise<{
    success: boolean;
    metrics_synced: number;
    inserted: number;
    updated: number;
    error?: string;
  }> {
    try {
      // Get Google connection for this project
      const connection = await GoogleOAuthService.getConnection(projectId);
      if (!connection) {
        throw new Error('Google connection is required. Please reconnect your Google account.');
      }

      // Set the connection
      this.setConnection(connection);

      // Construct range (e.g., "Sheet1!A2:F1000")
      const range = `${config.sheet_name}!${config.range_start}:Z1000`;

      // Fetch data from Google Sheets
      const rows = await this.fetchSheetData(config.spreadsheet_id, range);

      if (rows.length === 0) {
        return {
          success: true,
          metrics_synced: 0,
          inserted: 0,
          updated: 0,
        };
      }

      // Parse metrics
      const metrics = this.parseMetricsFromSheet(rows, config, projectId);

      // Save to database
      const { inserted, updated } = await this.saveMetrics(metrics);

      // Update sync status
      await supabase
        .from('google_sheets_sync_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
        })
        .eq('project_id', projectId);

      return {
        success: true,
        metrics_synced: metrics.length,
        inserted,
        updated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update sync status with error
      await supabase
        .from('google_sheets_sync_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: errorMessage,
        })
        .eq('project_id', projectId);

      return {
        success: false,
        metrics_synced: 0,
        inserted: 0,
        updated: 0,
        error: errorMessage,
      };
    }
  }

  // Test connection to Google Sheets
  async testConnection(
    spreadsheetId: string,
    sheetName: string = 'Sheet1'
  ): Promise<{ success: boolean; message: string; sample_data?: any[] }> {
    if (!this.validateConnection()) {
      return {
        success: false,
        message: 'No Google connection available',
      };
    }

    try {
      // Test with a small range to validate connection
      const range = `${sheetName}!A1:F5`;
      const rows = await this.fetchSheetData(spreadsheetId, range);

      return {
        success: true,
        message: `Successfully connected. Found ${rows.length} rows.`,
        sample_data: rows.slice(0, 3), // Return first 3 rows as sample
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // Get metrics for a project
  async getProjectMetrics(
    projectId: string,
    dateRange?: { start: string; end: string }
  ): Promise<DailyMetrics[]> {
    let query = supabase
      .from('project_daily_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get project metrics:', error);
      throw error;
    }

    return data || [];
  }
}

// Service instances per connection
const serviceInstances = new Map<string, GoogleSheetsMetricsService>();

export function getGoogleSheetsMetricsService(connection?: ProjectGoogleConnection): GoogleSheetsMetricsService {
  if (connection) {
    const key = connection.project_id;
    if (!serviceInstances.has(key)) {
      serviceInstances.set(key, new GoogleSheetsMetricsService(connection));
    } else {
      // Update connection in existing service
      const service = serviceInstances.get(key)!;
      service.setConnection(connection);
    }
    return serviceInstances.get(key)!;
  }
  
  // Return a new service without connection (for testing purposes)
  return new GoogleSheetsMetricsService();
}