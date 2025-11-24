import { supabase } from '@/integrations/supabase/client';
import { MetricConfig, CreateMetricConfigInput } from '@/types/metricConfig';

export class MetricConfigService {
  /**
   * Get all metric configurations for a project
   */
  static async getProjectMetricConfigs(projectId: string): Promise<MetricConfig[]> {
    try {
      const { data, error } = await supabase
        .from('project_metric_configs')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('project_metric_configs table does not exist. Please run the setup SQL scripts.');
          return [];
        }
        console.error('Error fetching metric configs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectMetricConfigs:', error);
      return [];
    }
  }

  /**
   * Get main metrics (up to 8) for project details page
   */
  static async getMainMetricConfigs(projectId: string): Promise<MetricConfig[]> {
    const { data, error } = await supabase
      .from('project_metric_configs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_main_metric', true)
      .eq('is_visible', true)
      .order('display_order', { ascending: true })
      .limit(8);

    if (error) {
      console.error('Error fetching main metric configs:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new metric configuration
   */
  static async createMetricConfig(
    projectId: string,
    config: CreateMetricConfigInput
  ): Promise<MetricConfig> {
    try {
      // Prepare insert data with safe defaults for new columns
      const insertData = {
        project_id: projectId,
        metric_name: config.metric_name,
        metric_key: config.metric_key,
        database_field: config.database_field || null,
        aggregation_type: config.aggregation_type || 'sum',
        calculation_type: config.calculation_type || 'total',
        format_type: config.format_type || 'number',
        icon: config.icon || 'TrendingUp',
        display_order: config.display_order || 0,
        is_visible: config.is_visible !== undefined ? config.is_visible : true,
        is_main_metric: config.is_main_metric || false,
        data_source_type: config.data_source_type || 'database',
        data_source_config: config.data_source_config || {}
      };

      const { data, error } = await supabase
        .from('project_metric_configs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          throw new Error('Database table not found. Please run the setup SQL scripts first. Check the manual_fix_metric_configs_schema.sql file.');
        }
        
        if (error.message?.includes('data_source_config') || error.message?.includes('data_source_type')) {
          throw new Error('Database schema is outdated. Please run the manual_fix_metric_configs_schema.sql script in your Supabase SQL editor to add the missing columns.');
        }
        
        console.error('Error creating metric config:', error);
        throw new Error(`Failed to create metric: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createMetricConfig:', error);
      throw error;
    }
  }

  /**
   * Update an existing metric configuration
   */
  static async updateMetricConfig(
    configId: string,
    updates: Partial<CreateMetricConfigInput>
  ): Promise<MetricConfig> {
    const { data, error } = await supabase
      .from('project_metric_configs')
      .update(updates)
      .eq('id', configId)
      .select()
      .single();

    if (error) {
      console.error('Error updating metric config:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a metric configuration
   */
  static async deleteMetricConfig(configId: string): Promise<void> {
    const { error } = await supabase
      .from('project_metric_configs')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error('Error deleting metric config:', error);
      throw error;
    }
  }

  /**
   * Update display order of metrics
   */
  static async updateDisplayOrder(
    updates: Array<{ id: string; display_order: number }>
  ): Promise<void> {
    const promises = updates.map(({ id, display_order }) =>
      supabase
        .from('project_metric_configs')
        .update({ display_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    for (const { error } of results) {
      if (error) {
        console.error('Error updating display order:', error);
        throw error;
      }
    }
  }

  /**
   * Create default metric configurations for a new project
   */
  static async createDefaultMetricConfigs(projectId: string): Promise<MetricConfig[]> {
    const defaultConfigs: CreateMetricConfigInput[] = [
      {
        metric_name: 'Revenue',
        metric_key: 'revenue',
        database_field: 'revenue',
        format_type: 'currency',
        icon: 'DollarSign',
        display_order: 1,
        is_main_metric: true,
        aggregation_type: 'sum'
      },
      {
        metric_name: 'Ad Spend',
        metric_key: 'spend',
        database_field: 'amount_spent',
        format_type: 'currency',
        icon: 'TrendingUp',
        display_order: 2,
        is_main_metric: true,
        aggregation_type: 'sum'
      },
      {
        metric_name: 'ROAS',
        metric_key: 'roas',
        database_field: 'roas',
        format_type: 'number',
        icon: 'Target',
        display_order: 3,
        is_main_metric: true,
        aggregation_type: 'average'
      },
      {
        metric_name: 'Conversions',
        metric_key: 'conversions',
        database_field: 'conversions',
        format_type: 'number',
        icon: 'Users',
        display_order: 4,
        is_main_metric: true,
        aggregation_type: 'sum'
      },
      // Additional non-main metrics
      {
        metric_name: 'Clicks',
        metric_key: 'clicks',
        database_field: 'outbound_clicks',
        format_type: 'number',
        icon: 'MousePointer',
        display_order: 5,
        is_main_metric: false,
        aggregation_type: 'sum'
      },
      {
        metric_name: 'Impressions',
        metric_key: 'impressions',
        database_field: 'impressions',
        format_type: 'number',
        icon: 'Eye',
        display_order: 6,
        is_main_metric: false,
        aggregation_type: 'sum'
      },
      {
        metric_name: 'CTR',
        metric_key: 'ctr',
        database_field: 'outbound_ctr',
        format_type: 'percentage',
        icon: 'Activity',
        display_order: 7,
        is_main_metric: false,
        aggregation_type: 'average'
      },
      {
        metric_name: 'CPC',
        metric_key: 'cpc',
        database_field: 'cpc',
        format_type: 'currency',
        icon: 'DollarSign',
        display_order: 8,
        is_main_metric: false,
        aggregation_type: 'average'
      }
    ];

    const { data, error } = await supabase
      .from('project_metric_configs')
      .insert(
        defaultConfigs.map(config => ({
          project_id: projectId,
          ...config,
        }))
      )
      .select();

    if (error) {
      console.error('Error creating default metric configs:', error);
      throw error;
    }

    return data || [];
  }
}