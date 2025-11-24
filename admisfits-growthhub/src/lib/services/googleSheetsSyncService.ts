import { supabase } from '@/integrations/supabase/client';
import { GoogleSheetsSyncConfig, SyncHistory, SheetConfig } from '@/types/googleSheetsSync';
import { GoogleSheetsMetricsService } from './googleSheetsMetricsService';

export class GoogleSheetsSyncService {
  /**
   * Get sync configuration for a project
   */
  static async getSyncConfig(projectId: string): Promise<GoogleSheetsSyncConfig | null> {
    const { data, error } = await supabase
      .from('google_sheets_connections')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching sync config:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all sync configurations for auto-sync
   */
  static async getAutoSyncConfigs(): Promise<GoogleSheetsSyncConfig[]> {
    const { data, error } = await supabase
      .from('google_sheets_connections')
      .select('*')
      .eq('auto_sync_enabled', true)
      .lte('next_sync_at', new Date().toISOString())
      .eq('sync_status', 'idle');

    if (error) {
      console.error('Error fetching auto-sync configs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Create or update sync configuration
   */
  static async upsertSyncConfig(
    projectId: string,
    config: Partial<GoogleSheetsSyncConfig>
  ): Promise<GoogleSheetsSyncConfig | null> {
    const { data, error } = await supabase
      .from('google_sheets_connections')
      .upsert({
        project_id: projectId,
        ...config,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,spreadsheet_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting sync config:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update sync status
   */
  static async updateSyncStatus(
    configId: string,
    status: GoogleSheetsSyncConfig['sync_status'],
    error?: string
  ): Promise<void> {
    const updates: any = {
      sync_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'success') {
      updates.last_sync_at = new Date().toISOString();
      updates.last_sync_error = null;
    } else if (status === 'error' && error) {
      updates.last_sync_error = error;
    }

    const { error: updateError } = await supabase
      .from('google_sheets_connections')
      .update(updates)
      .eq('id', configId);

    if (updateError) {
      console.error('Error updating sync status:', updateError);
    }
  }

  /**
   * Schedule next sync
   */
  static async scheduleNextSync(configId: string, intervalHours: number): Promise<void> {
    const nextSyncAt = new Date();
    nextSyncAt.setHours(nextSyncAt.getHours() + intervalHours);

    const { error } = await supabase
      .from('google_sheets_connections')
      .update({
        next_sync_at: nextSyncAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', configId);

    if (error) {
      console.error('Error scheduling next sync:', error);
    }
  }

  /**
   * Create sync history entry
   */
  static async createSyncHistory(
    configId: string,
    projectId: string,
    syncType: 'manual' | 'scheduled'
  ): Promise<string> {
    const { data, error } = await supabase
      .from('google_sheets_sync_history')
      .insert({
        sync_config_id: configId,
        project_id: projectId,
        sync_type: syncType,
        status: 'running',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating sync history:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Update sync history
   */
  static async updateSyncHistory(
    historyId: string,
    updates: Partial<SyncHistory>
  ): Promise<void> {
    const { error } = await supabase
      .from('google_sheets_sync_history')
      .update({
        ...updates,
        completed_at: updates.status !== 'running' ? new Date().toISOString() : undefined,
      })
      .eq('id', historyId);

    if (error) {
      console.error('Error updating sync history:', error);
    }
  }

  /**
   * Get sync history for a project
   */
  static async getSyncHistory(
    projectId: string,
    limit: number = 10
  ): Promise<SyncHistory[]> {
    const { data, error } = await supabase
      .from('google_sheets_sync_history')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Perform sync for a configuration
   */
  static async performSync(
    config: GoogleSheetsSyncConfig,
    syncType: 'manual' | 'scheduled' = 'manual'
  ): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    let historyId: string | null = null;

    try {
      // Update status to syncing
      await this.updateSyncStatus(config.id, 'syncing');

      // Create history entry
      historyId = await this.createSyncHistory(config.id, config.project_id, syncType);

      // Get Google connection
      const connection = await GoogleOAuthService.getConnection(config.project_id);
      if (!connection) {
        throw new Error('Google connection not found');
      }

      // Initialize metrics service
      const metricsService = new GoogleSheetsMetricsService(connection);

      // Track sync results
      let totalSheetsSynced = 0;
      let totalRowsProcessed = 0;
      let totalRowsInserted = 0;
      let totalRowsUpdated = 0;
      const sheetResults = [];

      // Sync each selected sheet
      for (const sheetConfig of config.sheet_configs) {
        if (!sheetConfig.isSelected) continue;

        const sheetMappings = config.column_mappings[sheetConfig.sheetId];
        if (!sheetMappings || Object.keys(sheetMappings).length === 0) {
          console.warn(`No mappings for sheet ${sheetConfig.sheetName}, skipping`);
          continue;
        }

        try {
          // Fetch and parse sheet data
          const result = await metricsService.syncSheetToProject(
            config.project_id,
            config.spreadsheet_id,
            sheetConfig.sheetName,
            sheetMappings
          );

          totalSheetsSynced++;
          totalRowsProcessed += result.rows_processed || 0;
          totalRowsInserted += result.inserted || 0;
          totalRowsUpdated += result.updated || 0;

          sheetResults.push({
            sheetName: sheetConfig.sheetName,
            success: true,
            ...result
          });

        } catch (sheetError: any) {
          console.error(`Error syncing sheet ${sheetConfig.sheetName}:`, sheetError);
          sheetResults.push({
            sheetName: sheetConfig.sheetName,
            success: false,
            error: sheetError.message
          });
        }
      }

      // Update history with results
      await this.updateSyncHistory(historyId, {
        status: 'success',
        sheets_synced: totalSheetsSynced,
        rows_processed: totalRowsProcessed,
        rows_inserted: totalRowsInserted,
        rows_updated: totalRowsUpdated,
        details: { sheetResults }
      });

      // Update sync status
      await this.updateSyncStatus(config.id, 'success');

      // Schedule next sync if auto-sync is enabled
      if (config.auto_sync_enabled) {
        await this.scheduleNextSync(config.id, config.sync_interval_hours);
      }

      return {
        success: true,
        message: `Successfully synced ${totalSheetsSynced} sheets. Inserted: ${totalRowsInserted}, Updated: ${totalRowsUpdated}`,
        details: {
          sheets_synced: totalSheetsSynced,
          rows_processed: totalRowsProcessed,
          rows_inserted: totalRowsInserted,
          rows_updated: totalRowsUpdated,
          sheetResults
        }
      };

    } catch (error: any) {
      console.error('Sync error:', error);

      // Update history if created
      if (historyId) {
        await this.updateSyncHistory(historyId, {
          status: 'error',
          error_message: error.message
        });
      }

      // Update sync status
      await this.updateSyncStatus(config.id, 'error', error.message);

      return {
        success: false,
        message: `Sync failed: ${error.message}`
      };
    }
  }

  /**
   * Delete sync configuration
   */
  static async deleteSyncConfig(configId: string): Promise<void> {
    const { error } = await supabase
      .from('google_sheets_connections')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error('Error deleting sync config:', error);
      throw error;
    }
  }
}

// Import GoogleOAuthService (avoid circular dependency)
import { GoogleOAuthService } from './googleOAuthService';