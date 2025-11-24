import { supabase } from '@/integrations/supabase/client';

// Types for data migration operations
export interface MigrationResult {
  success: boolean;
  oldMode: string | null;
  newMode: string;
  backupTableName: string | null;
  recordsConverted: number;
  errorMessage: string | null;
}

export interface BackupInfo {
  tableName: string;
  recordCount: number;
  backupDate: string;
  backupReason: string;
}

export interface ResyncOptions {
  preserveExistingData: boolean;
  createBackup: boolean;
  forceFreshSync: boolean;
}

export type SyncMode = 'daily_aggregate' | 'individual_records';

export class DataMigrationService {
  /**
   * Switch sync mode with automatic data migration
   */
  static async switchSyncMode(
    projectId: string,
    newSyncMode: SyncMode,
    options: ResyncOptions = {
      preserveExistingData: true,
      createBackup: true,
      forceFreshSync: false
    }
  ): Promise<MigrationResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('switch_sync_mode_with_data_migration', {
        p_project_id: projectId,
        p_user_id: user.user.id,
        p_new_sync_mode: newSyncMode,
        p_preserve_existing_data: options.preserveExistingData,
        p_backup_before_switch: options.createBackup
      });

      if (error) {
        console.error('Failed to switch sync mode:', error);
        throw new Error(`Migration failed: ${error.message}`);
      }

      const result = data[0];
      return {
        success: result.success,
        oldMode: result.old_mode,
        newMode: result.new_mode,
        backupTableName: result.backup_table_name,
        recordsConverted: result.records_converted,
        errorMessage: result.error_message
      };
    } catch (error) {
      console.error('Error switching sync mode:', error);
      return {
        success: false,
        oldMode: null,
        newMode: newSyncMode,
        backupTableName: null,
        recordsConverted: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get list of backup tables for a project
   */
  static async getProjectBackups(projectId: string): Promise<BackupInfo[]> {
    try {
      const { data, error } = await supabase.rpc('list_project_backup_tables', {
        p_project_id: projectId
      });

      if (error) {
        console.error('Failed to get project backups:', error);
        throw error;
      }

      return data.map((backup: any) => ({
        tableName: backup.table_name,
        recordCount: backup.record_count,
        backupDate: backup.backup_date,
        backupReason: backup.backup_reason
      }));
    } catch (error) {
      console.error('Error getting project backups:', error);
      return [];
    }
  }

  /**
   * Restore project data from a backup
   */
  static async restoreFromBackup(
    projectId: string,
    backupTableName: string
  ): Promise<{ success: boolean; restoredRecords: number; errorMessage?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('restore_from_backup_table', {
        p_project_id: projectId,
        p_user_id: user.user.id,
        p_backup_table_name: backupTableName
      });

      if (error) {
        console.error('Failed to restore from backup:', error);
        throw error;
      }

      const result = data[0];
      return {
        success: result.success,
        restoredRecords: result.restored_records,
        errorMessage: result.error_message
      };
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return {
        success: false,
        restoredRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert existing daily aggregates to individual records
   */
  static async convertDailyAggregatesToIndividualRecords(
    projectId: string,
    recordType: string = 'converted_sale'
  ): Promise<{ success: boolean; convertedRecords: number; errorMessage?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('convert_daily_aggregates_to_individual_records', {
        p_project_id: projectId,
        p_user_id: user.user.id,
        p_record_type: recordType
      });

      if (error) {
        console.error('Failed to convert daily aggregates:', error);
        throw error;
      }

      const result = data[0];
      return {
        success: result.success,
        convertedRecords: result.converted_records,
        errorMessage: result.error_message
      };
    } catch (error) {
      console.error('Error converting daily aggregates:', error);
      return {
        success: false,
        convertedRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert individual records back to daily aggregates
   */
  static async convertIndividualRecordsToDailyAggregates(
    projectId: string,
    source: string = 'google_sheets'
  ): Promise<{ success: boolean; convertedDays: number; errorMessage?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('convert_individual_records_to_daily_aggregates', {
        p_project_id: projectId,
        p_user_id: user.user.id,
        p_source: source
      });

      if (error) {
        console.error('Failed to convert individual records:', error);
        throw error;
      }

      const result = data[0];
      return {
        success: result.success,
        convertedDays: result.converted_days,
        errorMessage: result.error_message
      };
    } catch (error) {
      console.error('Error converting individual records:', error);
      return {
        success: false,
        convertedDays: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get data statistics for a project (useful for showing migration impact)
   */
  static async getProjectDataStats(projectId: string): Promise<{
    dailyMetricsCount: number;
    individualRecordsCount: number;
    dateRange: { earliest: string | null; latest: string | null };
    recordTypes: string[];
  }> {
    try {
      // Get daily metrics count
      const { count: dailyCount } = await supabase
        .from('project_daily_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get individual records count
      const { count: individualCount } = await supabase
        .from('project_individual_records')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get date range from both tables
      const { data: dailyDateRange } = await supabase
        .from('project_daily_metrics')
        .select('date')
        .eq('project_id', projectId)
        .order('date', { ascending: true })
        .limit(1);

      const { data: dailyDateRangeEnd } = await supabase
        .from('project_daily_metrics')
        .select('date')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(1);

      const { data: individualDateRange } = await supabase
        .from('project_individual_records')
        .select('date')
        .eq('project_id', projectId)
        .order('date', { ascending: true })
        .limit(1);

      const { data: individualDateRangeEnd } = await supabase
        .from('project_individual_records')
        .select('date')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(1);

      // Get unique record types
      const { data: recordTypesData } = await supabase
        .from('project_individual_records')
        .select('record_type')
        .eq('project_id', projectId)
        .group('record_type');

      const allDates = [
        ...(dailyDateRange || []),
        ...(dailyDateRangeEnd || []),
        ...(individualDateRange || []),
        ...(individualDateRangeEnd || [])
      ].map(item => item.date).filter(Boolean);

      return {
        dailyMetricsCount: dailyCount || 0,
        individualRecordsCount: individualCount || 0,
        dateRange: {
          earliest: allDates.length > 0 ? Math.min(...allDates.map(d => new Date(d).getTime())).toString() : null,
          latest: allDates.length > 0 ? Math.max(...allDates.map(d => new Date(d).getTime())).toString() : null
        },
        recordTypes: recordTypesData?.map(item => item.record_type) || []
      };
    } catch (error) {
      console.error('Error getting project data stats:', error);
      return {
        dailyMetricsCount: 0,
        individualRecordsCount: 0,
        dateRange: { earliest: null, latest: null },
        recordTypes: []
      };
    }
  }

  /**
   * Validate if project is ready for mode switch
   */
  static async validateModeSwitch(
    projectId: string,
    targetMode: SyncMode
  ): Promise<{
    canSwitch: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const stats = await this.getProjectDataStats(projectId);
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (targetMode === 'individual_records') {
      if (stats.dailyMetricsCount > 0) {
        warnings.push(`You have ${stats.dailyMetricsCount} daily aggregate records that will be converted.`);
        recommendations.push('Consider creating a backup before switching modes.');
      }
      
      if (stats.dailyMetricsCount > 100) {
        warnings.push('Large dataset detected. Conversion may take some time.');
        recommendations.push('Consider running the conversion during off-peak hours.');
      }
    } else if (targetMode === 'daily_aggregate') {
      if (stats.individualRecordsCount > 0) {
        warnings.push(`You have ${stats.individualRecordsCount} individual records that will be aggregated by date.`);
        warnings.push('Multiple records on the same date will be combined into single daily totals.');
      }
      
      if (stats.recordTypes.length > 1) {
        warnings.push(`Multiple record types found: ${stats.recordTypes.join(', ')}. These will be combined.`);
      }
    }

    return {
      canSwitch: true,
      warnings,
      recommendations
    };
  }
}

export default DataMigrationService;