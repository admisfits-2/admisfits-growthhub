import { supabase } from '@/integrations/supabase/client';
import { MetaOAuthService } from './metaOAuthService';
import { getMetaAdsService } from './metaAdsService';
import { format } from 'date-fns';

interface MetaAdsSyncOptions {
  projectId: string;
  startDate: Date;
  endDate: Date;
}

export class MetaAdsSyncService {
  /**
   * Sync Meta Ads data to project_daily_metrics table
   */
  static async syncMetaAdsData({ projectId, startDate, endDate }: MetaAdsSyncOptions) {
    try {
      // Get Meta connection for the project
      const connection = await MetaOAuthService.getConnection(projectId);
      if (!connection) {
        throw new Error('No Meta Ads connection found for this project');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Refresh token if needed
      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      
      // Get Meta Ads service instance
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      
      // Fetch daily metrics from Meta Ads
      const dailyMetrics = await metaService.getDailyMetrics({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });

      if (!dailyMetrics || dailyMetrics.length === 0) {
        console.log('No Meta Ads data found for the specified date range');
        return { success: true, recordsUpserted: 0 };
      }

      // Prepare data for upsert
      const metricsToUpsert = dailyMetrics.map(metric => ({
        project_id: projectId,
        user_id: user.id,
        date: metric.date,
        source: 'meta_ads',
        
        // Basic Performance Metrics
        impressions: metric.impressions || 0,
        reach: metric.reach || 0,
        frequency: metric.frequency || 0,
        outbound_clicks: metric.outbound_clicks || metric.clicks || 0, // Prefer outbound_clicks over general clicks
        outbound_ctr: metric.outbound_clicks_ctr || metric.ctr || 0, // Use correct field name
        
        // Cost Metrics
        cpc: metric.cpc || 0,
        amount_spent: metric.spend || 0, // Map spend to amount_spent
        cpm: metric.cpm || 0,
        
        // Conversion Metrics
        conversions: metric.conversions || 0,
        conversion_rate: metric.conversionRate || 0,
        cost_per_conversion: metric.cost_per_conversion || metric.cpa || 0,
        roas: metric.roas || metric.purchase_roas || 0,
        
        // Revenue calculation (if conversion_values is available)
        revenue: metric.conversion_values || 0,
        
        // Store comprehensive raw data including all the new metrics
        custom_data: {
          // Basic Performance Metrics (ALL fields accessible via custom_data)
          impressions: metric.impressions || 0,
          reach: metric.reach || 0,
          frequency: metric.frequency || 0,
          clicks: metric.clicks || 0, // Basic clicks field
          unique_clicks: metric.unique_clicks || 0,
          outbound_clicks: metric.outbound_clicks || 0,
          unique_outbound_clicks: metric.unique_outbound_clicks || 0,
          
          // Cost Metrics
          spend: metric.spend || 0, // Basic spend field
          cpc: metric.cpc || 0,
          cpm: metric.cpm || 0,
          cpp: metric.cpp || 0,
          cost_per_unique_click: metric.cost_per_unique_click || 0,
          cost_per_outbound_click: metric.cost_per_outbound_click || 0,
          cost_per_unique_outbound_click: metric.cost_per_unique_outbound_click || 0,
          
          // Click-Through Rate Metrics
          ctr: metric.ctr || 0, // Basic CTR field
          unique_ctr: metric.unique_ctr || 0,
          outbound_clicks_ctr: metric.outbound_clicks_ctr || 0,
          
          // Conversion Metrics
          conversions: metric.conversions || 0, // Basic conversions field
          cost_per_conversion: metric.cost_per_conversion || 0,
          
          // Engagement Metrics
          inline_link_clicks: metric.inline_link_clicks || 0,
          inline_link_click_ctr: metric.inline_link_click_ctr || 0,
          cost_per_inline_link_click: metric.cost_per_inline_link_click || 0,
          inline_post_engagement: metric.inline_post_engagement || 0,
          cost_per_inline_post_engagement: metric.cost_per_inline_post_engagement || 0,
          
          // Video Metrics
          video_play_actions: metric.video_play_actions || 0,
          video_avg_time_watched_actions: metric.video_avg_time_watched_actions || 0,
          video_p25_watched_actions: metric.video_p25_watched_actions || 0,
          video_p50_watched_actions: metric.video_p50_watched_actions || 0,
          video_p75_watched_actions: metric.video_p75_watched_actions || 0,
          video_p100_watched_actions: metric.video_p100_watched_actions || 0,
          video_thruplay_watched_actions: metric.video_thruplay_watched_actions || 0,
          cost_per_thruplay: metric.cost_per_thruplay || 0,
          
          // Quality Rankings
          quality_ranking: metric.quality_ranking || 'unknown',
          engagement_rate_ranking: metric.engagement_rate_ranking || 'unknown',
          conversion_rate_ranking: metric.conversion_rate_ranking || 'unknown',
          
          // Conversion Values
          conversion_values: metric.conversion_values || 0,
          purchase_roas: metric.purchase_roas || 0,
          
          // Action Data
          actions: metric.actions || [],
          action_values: metric.action_values || [],
        },
        
        // Store complete raw data for debugging and future use
        raw_data: metric,
      }));

      // Upsert data to project_daily_metrics
      const { data, error } = await supabase
        .from('project_daily_metrics')
        .upsert(metricsToUpsert, {
          onConflict: 'project_id,date,source',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error('Error upserting Meta Ads metrics:', error);
        throw error;
      }

      console.log(`Successfully synced ${data?.length || 0} Meta Ads metrics`);
      
      return { 
        success: true, 
        recordsUpserted: data?.length || 0,
        data,
      };
    } catch (error) {
      console.error('Meta Ads sync failed:', error);
      throw error;
    }
  }

  /**
   * Check if Meta Ads is connected for a project
   */
  static async isConnected(projectId: string): Promise<boolean> {
    try {
      const connection = await MetaOAuthService.getConnection(projectId);
      return !!connection && connection.is_active;
    } catch {
      return false;
    }
  }

  /**
   * Get the last sync date for Meta Ads data
   */
  static async getLastSyncDate(projectId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('project_daily_metrics')
        .select('date')
        .eq('project_id', projectId)
        .eq('source', 'meta_ads')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return new Date(data.date);
    } catch {
      return null;
    }
  }
}