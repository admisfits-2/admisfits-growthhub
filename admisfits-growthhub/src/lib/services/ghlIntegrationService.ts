// GHL Integration Configuration Service
// Manages GHL integration configs and metric mappings in Supabase

import { supabase } from '@/integrations/supabase/client';
import {
  GHLIntegration,
  CreateGHLIntegrationInput,
  UpdateGHLIntegrationInput,
  GHLIntegrationStatus,
  GHLLocation
} from '@/types/ghlIntegration';
import { createGHLRealClient } from './ghlRealClient';
import { shouldUseMockData } from '../config/ghlConfig';

export class GHLIntegrationService {
  /**
   * Get GHL integration config for a project
   */
  static async getIntegration(projectId: string): Promise<GHLIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('ghl_integrations')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching GHL integration:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getIntegration:', error);
      return null;
    }
  }

  /**
   * Create GHL integration config for a project
   */
  static async createIntegration(
    projectId: string,
    config: CreateGHLIntegrationInput
  ): Promise<GHLIntegration> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // With Private Integration Tokens, we skip validation as the token is already scoped to specific locations
      // The user provides their location ID directly

      const insertData = {
        project_id: projectId,
        user_id: user.id,
        ...config,
      };
      
      // Remove skip_validation flag from data to be inserted
      delete (insertData as any).skip_validation;

      const { data, error } = await supabase
        .from('ghl_integrations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating GHL integration:', error);
        throw new Error(`Failed to create GHL integration: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createIntegration:', error);
      throw error;
    }
  }

  /**
   * Update GHL integration config
   */
  static async updateIntegration(
    projectId: string,
    updates: UpdateGHLIntegrationInput
  ): Promise<GHLIntegration> {
    try {
      // With Private Integration Tokens, we don't validate on update
      // The user can update their token and location ID as needed

      // Calendar fields should now exist in database (migration added)
      const dbUpdates = { ...updates };
      
      const { data, error } = await supabase
        .from('ghl_integrations')
        .update(dbUpdates)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating GHL integration:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateIntegration:', error);
      throw error;
    }
  }

  /**
   * Delete GHL integration config
   */
  static async deleteIntegration(projectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ghl_integrations')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        console.error('Error deleting GHL integration:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteIntegration:', error);
      throw error;
    }
  }

  /**
   * Get available locations for an API key
   */
  static async getAvailableLocations(apiKey: string): Promise<GHLLocation[]> {
    // With Private Integration Tokens, we don't have a generic locations endpoint
    // This method is no longer applicable
    console.warn('getAvailableLocations is not supported with Private Integration Tokens');
    return [];
  }

  /**
   * Test GHL integration connection
   */
  static async testConnection(apiKey: string, locationId?: string): Promise<{
    success: boolean;
    locations?: GHLLocation[];
    error?: string;
  }> {
    if (!locationId) {
      return {
        success: false,
        error: 'Location ID is required'
      };
    }
    
    const client = createGHLRealClient(apiKey, locationId, shouldUseMockData());
    
    try {
      const result = await client.testConnection();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Connection test failed'
        };
      }
      
      return {
        success: true,
        locations: []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to test connection'
      };
    }
  }

  /**
   * Update sync status for integration
   */
  static async updateSyncStatus(
    projectId: string,
    status: 'pending' | 'success' | 'error' | 'in_progress',
    error?: string
  ): Promise<void> {
    try {
      const updates: Partial<GHLIntegration> = {
        last_sync_status: status,
        last_sync_at: new Date().toISOString(),
      };

      if (error) {
        updates.last_sync_error = error;
      } else if (status === 'success') {
        updates.last_sync_error = null;
      }

      const { error: updateError } = await supabase
        .from('ghl_integrations')
        .update(updates)
        .eq('project_id', projectId);

      if (updateError) {
        console.error('Error updating sync status:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error in updateSyncStatus:', error);
      throw error;
    }
  }

  /**
   * Increment daily API usage counter
   */
  static async incrementApiUsage(integrationId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_ghl_api_usage', {
        integration_id: integrationId
      });

      if (error) {
        console.error('Error incrementing API usage:', error);
        // Don't throw error for usage tracking failures
      }
    } catch (error) {
      console.error('Error in incrementApiUsage:', error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Get integration status for a project
   */
  static async getIntegrationStatus(projectId: string): Promise<GHLIntegrationStatus> {
    try {
      const config = await this.getIntegration(projectId);
      
      if (!config) {
        return {
          isConfigured: false,
          isActive: false,
          syncStatus: 'pending',
          apiUsage: {
            dailyCalls: 0,
            limit: 200000, // GHL daily limit
            resetDate: new Date().toISOString().split('T')[0]
          }
        };
      }

      return {
        isConfigured: true,
        isActive: config.is_active,
        lastSync: config.last_sync_at,
        syncStatus: config.last_sync_status,
        error: config.last_sync_error,
        apiUsage: {
          dailyCalls: config.daily_api_calls,
          limit: 200000, // GHL daily limit
          resetDate: config.last_reset_date
        }
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      throw error;
    }
  }

  // Backwards compatibility methods
  static getProjectIntegrationConfig(projectId: string): Promise<GHLIntegration | null> {
    return this.getIntegration(projectId);
  }

  static createIntegrationConfig(projectId: string, userId: string, config: CreateGHLIntegrationInput): Promise<GHLIntegration> {
    return this.createIntegration(projectId, config);
  }

  static updateIntegrationConfig(projectId: string, updates: UpdateGHLIntegrationInput): Promise<GHLIntegration> {
    return this.updateIntegration(projectId, updates);
  }

  static deleteIntegrationConfig(projectId: string): Promise<void> {
    return this.deleteIntegration(projectId);
  }

  /**
   * Get GHL integration for a project (alias for backward compatibility)
   */
  static async getConfig(projectId: string): Promise<GHLIntegration | null> {
    return this.getIntegration(projectId);
  }
}