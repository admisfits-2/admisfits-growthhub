export interface SheetConfig {
  sheetId: string;
  sheetName: string;
  isSelected: boolean;
  columnHeaders: string[];
  lastSyncedAt?: string;
}

export interface ColumnMapping {
  sheetId: string;
  mappings: {
    [columnLetter: string]: {
      metricKey: string;
      metricName: string;
      isCustom: boolean;
    };
  };
}

export interface GoogleSheetsSyncConfig {
  id: string;
  project_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_configs: SheetConfig[];
  column_mappings: { [sheetId: string]: ColumnMapping['mappings'] };
  auto_sync_enabled: boolean;
  sync_interval_hours: number;
  last_sync_at?: string;
  next_sync_at?: string;
  sync_status: 'idle' | 'syncing' | 'success' | 'error';
  last_sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncHistory {
  id: string;
  sync_config_id: string;
  project_id: string;
  sync_type: 'manual' | 'scheduled';
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'error';
  sheets_synced: number;
  rows_processed: number;
  rows_inserted: number;
  rows_updated: number;
  error_message?: string;
  details: any;
}

export const SYNC_INTERVALS = [
  { value: 1, label: 'Every hour' },
  { value: 2, label: 'Every 2 hours' },
  { value: 4, label: 'Every 4 hours' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
] as const;