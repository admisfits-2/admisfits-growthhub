import { env } from '../config/env';

// Meta Ads API Configuration
const META_API_VERSION = 'v22.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Meta Ads Metrics Interface
export interface MetaAdsMetrics {
  // Basic Performance Metrics
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  unique_clicks: number;
  outbound_clicks: number;
  unique_outbound_clicks: number;
  
  // Cost Metrics
  spend: number;
  cpc: number; // Cost per click
  cpm: number; // Cost per mille (1000 impressions)
  cpp: number; // Cost per 1000 people reached
  cost_per_unique_click: number;
  cost_per_outbound_click: number;
  cost_per_unique_outbound_click: number;
  
  // Click-Through Rate Metrics
  ctr: number; // Click-through rate (all)
  unique_ctr: number;
  outbound_clicks_ctr: number;
  
  // Conversion Metrics
  conversions: number;
  conversionRate: number;
  cost_per_conversion: number;
  conversion_values: number;
  purchase_roas: number;
  cpa: number; // Cost per acquisition (calculated)
  roas: number; // Return on ad spend (calculated)
  
  // Engagement Metrics
  inline_link_clicks: number;
  inline_link_click_ctr: number;
  cost_per_inline_link_click: number;
  inline_post_engagement: number;
  cost_per_inline_post_engagement: number;
  
  // Video Metrics
  video_play_actions: number;
  video_avg_time_watched_actions: number;
  video_p25_watched_actions: number;
  video_p50_watched_actions: number;
  video_p75_watched_actions: number;
  video_p100_watched_actions: number;
  video_thruplay_watched_actions: number;
  cost_per_thruplay: number;
  
  // Quality Rankings
  quality_ranking: string;
  engagement_rate_ranking: string;
  conversion_rate_ranking: string;
  
  // Additional Action Metrics
  actions: any[]; // Array of action objects
  action_values: any[]; // Array of action value objects
}

// Meta Ads Campaign Interface
export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime: string;
  endTime?: string;
  metrics: MetaAdsMetrics;
}

// Meta Ads Ad Set Interface
export interface MetaAdsAdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  targetingSpec: any;
  metrics: MetaAdsMetrics;
}

// Meta Ads Creative Interface
export interface MetaAdsCreative {
  id: string;
  name: string;
  adSetId: string;
  status: string;
  creativeType: string;
  thumbnailUrl?: string;
  metrics: MetaAdsMetrics;
}

// Meta Ads Ad Interface with full details
export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  creative: {
    id: string;
    name?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    title?: string;
    body?: string;
    call_to_action?: string;
    link_url?: string;
    object_url?: string;
    object_story_spec?: any;
  };
  preview?: string;
  metrics: MetaAdsMetrics & {
    // Custom metrics for appointments/calls
    appointments?: number;
    calls?: number;
    revenue?: number;
    purchases?: number;
  };
}

// Date range interface
export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}

// Meta Ads Service Class
export class MetaAdsService {
  private accessToken: string;
  private adAccountId: string;

  constructor(accessToken?: string, adAccountId?: string) {
    this.accessToken = accessToken || env.META_ADS_ACCESS_TOKEN;
    this.adAccountId = adAccountId || env.META_ADS_AD_ACCOUNT_ID;
  }

  // Validate configuration
  private validateConfig(): boolean {
    if (!this.accessToken || !this.adAccountId) {
      console.error('Meta Ads: Missing access token or ad account ID');
      return false;
    }
    return true;
  }

  // Make API request
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.validateConfig()) {
      throw new Error('Meta Ads configuration is incomplete');
    }

    const url = new URL(`${META_API_BASE_URL}${endpoint}`);
    
    // Add access token
    url.searchParams.append('access_token', this.accessToken);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API Error: ${error.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Meta Ads API request failed:', error);
      throw error;
    }
  }

  // Get daily metrics
  async getDailyMetrics(dateRange: DateRange): Promise<Array<MetaAdsMetrics & { date: string }>> {
    const params: Record<string, any> = {
      fields: 'impressions,reach,frequency,clicks,unique_clicks,outbound_clicks,ctr,unique_ctr,outbound_clicks_ctr,cpc,cost_per_unique_click,cost_per_outbound_click,spend,cpm,cpp,conversions,cost_per_conversion,actions,action_values,conversion_values,purchase_roas,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,inline_post_engagement,cost_per_inline_post_engagement,video_play_actions,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_30_sec_watched_actions,quality_ranking,engagement_rate_ranking',
      level: 'account',
      time_increment: 1, // Daily breakdown
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    };

    const response = await this.makeRequest(`/${this.adAccountId}/insights`, params);
    
    if (!response.data || response.data.length === 0) {
      return [];
    }

    return response.data.map((data: any) => ({
      date: data.date_start,
      ...this.parseMetrics(data),
    }));
  }

  // Get account overview
  async getAccountOverview(dateRange?: DateRange): Promise<MetaAdsMetrics> {
    const params: Record<string, any> = {
      fields: 'impressions,reach,frequency,clicks,unique_clicks,outbound_clicks,ctr,unique_ctr,outbound_clicks_ctr,cpc,cost_per_unique_click,cost_per_outbound_click,spend,cpm,cpp,conversions,cost_per_conversion,actions,action_values,conversion_values,purchase_roas,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,inline_post_engagement,cost_per_inline_post_engagement,video_play_actions,quality_ranking,engagement_rate_ranking',
      level: 'account',
    };

    if (dateRange) {
      params.time_range = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    }

    const response = await this.makeRequest(`/${this.adAccountId}/insights`, params);
    
    if (!response.data || response.data.length === 0) {
      return this.getEmptyMetrics();
    }

    const data = response.data[0];
    return this.parseMetrics(data);
  }

  // Get campaigns with metrics
  async getCampaigns(dateRange?: DateRange): Promise<MetaAdsCampaign[]> {
    const params: Record<string, any> = {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{impressions,reach,frequency,clicks,ctr,cpc,spend,cpm,conversions,conversion_rate,cost_per_conversion}',
    };

    if (dateRange) {
      params['insights.time_range'] = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    }

    const response = await this.makeRequest(`/${this.adAccountId}/campaigns`, params);
    
    return response.data?.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : undefined,
      lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : undefined,
      startTime: campaign.start_time,
      endTime: campaign.stop_time,
      metrics: campaign.insights?.data?.[0] ? this.parseMetrics(campaign.insights.data[0]) : this.getEmptyMetrics(),
    })) || [];
  }

  // Get ad sets with metrics
  async getAdSets(campaignId?: string, dateRange?: DateRange): Promise<MetaAdsAdSet[]> {
    const endpoint = campaignId 
      ? `/${campaignId}/adsets`
      : `/${this.adAccountId}/adsets`;

    const params: Record<string, any> = {
      fields: 'id,name,campaign_id,status,targeting,insights{impressions,reach,frequency,clicks,ctr,cpc,spend,cpm,conversions,conversion_rate,cost_per_conversion}',
    };

    if (dateRange) {
      params['insights.time_range'] = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    }

    const response = await this.makeRequest(endpoint, params);
    
    return response.data?.map((adSet: any) => ({
      id: adSet.id,
      name: adSet.name,
      campaignId: adSet.campaign_id,
      status: adSet.status,
      targetingSpec: adSet.targeting,
      metrics: adSet.insights?.data?.[0] ? this.parseMetrics(adSet.insights.data[0]) : this.getEmptyMetrics(),
    })) || [];
  }

  // Get ads/creatives with metrics
  async getAds(adSetId?: string, dateRange?: DateRange): Promise<MetaAdsCreative[]> {
    const endpoint = adSetId 
      ? `/${adSetId}/ads`
      : `/${this.adAccountId}/ads`;

    const params: Record<string, any> = {
      fields: 'id,name,adset_id,status,creative{id,name,thumbnail_url},insights{impressions,reach,frequency,clicks,ctr,cpc,spend,cpm,conversions,conversion_rate,cost_per_conversion}',
    };

    if (dateRange) {
      params['insights.time_range'] = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    }

    const response = await this.makeRequest(endpoint, params);
    
    return response.data?.map((ad: any) => ({
      id: ad.id,
      name: ad.name,
      adSetId: ad.adset_id,
      status: ad.status,
      creativeType: ad.creative?.name || 'Unknown',
      thumbnailUrl: ad.creative?.thumbnail_url,
      metrics: ad.insights?.data?.[0] ? this.parseMetrics(ad.insights.data[0]) : this.getEmptyMetrics(),
    })) || [];
  }

  // Get spending by day
  async getDailySpend(dateRange: DateRange): Promise<Array<{ date: string; spend: number; impressions: number; clicks: number }>> {
    const params = {
      fields: 'spend,impressions,clicks',
      level: 'account',
      time_increment: 1, // Daily breakdown
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    };

    const response = await this.makeRequest(`/${this.adAccountId}/insights`, params);
    
    return response.data?.map((day: any) => ({
      date: day.date_start,
      spend: parseFloat(day.spend || 0),
      impressions: parseInt(day.impressions || 0),
      clicks: parseInt(day.clicks || 0),
    })) || [];
  }

  // Get top performing ads with full details
  async getTopPerformingAds(dateRange?: DateRange, limit: number = 8): Promise<MetaAd[]> {
    const params: Record<string, any> = {
      fields: `
        id,name,status,adset_id,adset{name},campaign_id,campaign{name},
        creative{
          id,name,thumbnail_url,image_url,video_id,title,body,
          call_to_action_type,link_url,object_url,
          object_story_spec,
          asset_feed_spec,
          effective_object_story_id
        },
        insights{
          impressions,reach,frequency,clicks,unique_clicks,outbound_clicks,
          ctr,unique_ctr,outbound_clicks_ctr,
          spend,cpc,cpm,cpp,
          conversions,cost_per_conversion,conversion_values,purchase_roas,
          actions,action_values,
          inline_link_clicks,inline_link_click_ctr,
          video_play_actions,video_p100_watched_actions,
          quality_ranking,engagement_rate_ranking,conversion_rate_ranking
        }
      `,
      limit: 50, // Fetch more to filter and sort
    };

    if (dateRange) {
      params['insights.time_range'] = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    }

    try {
      const response = await this.makeRequest(`/${this.adAccountId}/ads`, params);
      
      if (!response.data || response.data.length === 0) {
        return [];
      }

      // Process and sort ads by performance
      const adsWithMetrics = response.data
        .filter((ad: any) => ad.status === 'ACTIVE' && ad.insights?.data?.[0])
        .map((ad: any) => {
          const insights = ad.insights.data[0];
          const metrics = this.parseMetrics(insights);
          
          // Extract appointment and call actions
          const appointments = insights.actions?.find((a: any) => 
            a.action_type === 'lead' || 
            a.action_type === 'onsite_conversion.lead_grouped' ||
            a.action_type === 'offsite_conversion.fb_pixel_lead'
          )?.value || 0;
          
          const calls = insights.actions?.find((a: any) => 
            a.action_type === 'call' || 
            a.action_type === 'onsite_conversion.call'
          )?.value || 0;
          
          const purchases = insights.actions?.find((a: any) => 
            a.action_type === 'purchase' || 
            a.action_type === 'offsite_conversion.fb_pixel_purchase'
          )?.value || 0;
          
          const revenue = insights.action_values?.find((a: any) => 
            a.action_type === 'purchase' || 
            a.action_type === 'offsite_conversion.fb_pixel_purchase'
          )?.value || 0;

          return {
            id: ad.id,
            name: ad.name,
            status: ad.status,
            adset_id: ad.adset_id,
            adset_name: ad.adset?.name,
            campaign_id: ad.campaign_id,
            campaign_name: ad.campaign?.name,
            creative: {
              id: ad.creative?.id || '',
              name: ad.creative?.name,
              thumbnail_url: ad.creative?.thumbnail_url,
              image_url: ad.creative?.image_url,
              video_id: ad.creative?.video_id,
              title: ad.creative?.title,
              body: ad.creative?.body,
              call_to_action: ad.creative?.call_to_action_type,
              link_url: ad.creative?.link_url,
              object_url: ad.creative?.object_url,
              object_story_spec: ad.creative?.object_story_spec,
            },
            metrics: {
              ...metrics,
              appointments: parseInt(appointments),
              calls: parseInt(calls),
              revenue: parseFloat(revenue),
              purchases: parseInt(purchases),
            },
          };
        });

      // Sort by spend (top spenders first)
      adsWithMetrics.sort((a: MetaAd, b: MetaAd) => {
        return b.metrics.spend - a.metrics.spend;
      });

      // Get ad previews for top ads
      const topAds = adsWithMetrics.slice(0, limit);
      
      // Fetch previews in parallel
      const adsWithPreviews = await Promise.all(
        topAds.map(async (ad: MetaAd) => {
          try {
            const previewResponse = await this.makeRequest(`/${ad.id}/previews`, {
              ad_format: 'DESKTOP_FEED_STANDARD',
            });
            
            return {
              ...ad,
              preview: previewResponse.data?.[0]?.body || '',
            };
          } catch (error) {
            console.warn(`Failed to fetch preview for ad ${ad.id}:`, error);
            return ad;
          }
        })
      );

      return adsWithPreviews;
    } catch (error) {
      console.error('Failed to fetch top performing ads:', error);
      throw error;
    }
  }

  // Parse metrics from API response
  private parseMetrics(data: any): MetaAdsMetrics {
    const spend = parseFloat(data.spend || 0);
    const impressions = parseInt(data.impressions || 0);
    const clicks = parseInt(data.clicks || 0);
    const unique_clicks = parseInt(data.unique_clicks || 0);
    const outbound_clicks = parseInt(data.outbound_clicks || 0);
    const unique_outbound_clicks = parseInt(data.unique_outbound_clicks || 0);
    const conversions = parseInt(data.conversions || data.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0);
    const conversion_values = parseFloat(data.conversion_values || data.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0);
    
    // Video metrics
    const video_play_actions = parseInt(data.video_play_actions || data.actions?.find((a: any) => a.action_type === 'video_play')?.value || 0);
    
    // Engagement metrics
    const inline_link_clicks = parseInt(data.inline_link_clicks || 0);
    const inline_post_engagement = parseInt(data.inline_post_engagement || 0);

    return {
      // Basic Performance Metrics
      impressions,
      reach: parseInt(data.reach || 0),
      frequency: parseFloat(data.frequency || 0),
      clicks,
      unique_clicks,
      outbound_clicks,
      unique_outbound_clicks,
      
      // Cost Metrics
      spend,
      cpc: parseFloat(data.cpc || 0),
      cpm: parseFloat(data.cpm || 0),
      cpp: parseFloat(data.cpp || 0),
      cost_per_unique_click: parseFloat(data.cost_per_unique_click || 0),
      cost_per_outbound_click: parseFloat(data.cost_per_outbound_click || 0),
      cost_per_unique_outbound_click: parseFloat(data.cost_per_unique_outbound_click || 0),
      
      // Click-Through Rate Metrics
      ctr: parseFloat(data.ctr || 0),
      unique_ctr: parseFloat(data.unique_ctr || 0),
      outbound_clicks_ctr: parseFloat(data.outbound_clicks_ctr || 0),
      
      // Conversion Metrics
      conversions,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      cost_per_conversion: parseFloat(data.cost_per_conversion || 0),
      conversion_values,
      purchase_roas: parseFloat(data.purchase_roas || 0),
      cpa: conversions > 0 ? spend / conversions : 0, // Calculated Cost Per Acquisition
      roas: conversion_values > 0 ? conversion_values / spend : 0, // Calculated ROAS
      
      // Engagement Metrics
      inline_link_clicks,
      inline_link_click_ctr: parseFloat(data.inline_link_click_ctr || 0),
      cost_per_inline_link_click: parseFloat(data.cost_per_inline_link_click || 0),
      inline_post_engagement,
      cost_per_inline_post_engagement: parseFloat(data.cost_per_inline_post_engagement || 0),
      
      // Video Metrics
      video_play_actions,
      video_avg_time_watched_actions: parseFloat(data.video_avg_time_watched_actions || 0),
      video_p25_watched_actions: parseInt(data.video_p25_watched_actions || 0),
      video_p50_watched_actions: parseInt(data.video_p50_watched_actions || 0),
      video_p75_watched_actions: parseInt(data.video_p75_watched_actions || 0),
      video_p100_watched_actions: parseInt(data.video_p100_watched_actions || 0),
      video_thruplay_watched_actions: parseInt(data.video_thruplay_watched_actions || 0),
      cost_per_thruplay: parseFloat(data.cost_per_thruplay || 0),
      
      // Quality Rankings
      quality_ranking: data.quality_ranking || 'unknown',
      engagement_rate_ranking: data.engagement_rate_ranking || 'unknown',
      conversion_rate_ranking: data.conversion_rate_ranking || 'unknown',
      
      // Additional Action Metrics
      actions: data.actions || [],
      action_values: data.action_values || [],
    };
  }

  // Get empty metrics object
  private getEmptyMetrics(): MetaAdsMetrics {
    return {
      // Basic Performance Metrics
      impressions: 0,
      reach: 0,
      frequency: 0,
      clicks: 0,
      unique_clicks: 0,
      outbound_clicks: 0,
      unique_outbound_clicks: 0,
      
      // Cost Metrics
      spend: 0,
      cpc: 0,
      cpm: 0,
      cpp: 0,
      cost_per_unique_click: 0,
      cost_per_outbound_click: 0,
      cost_per_unique_outbound_click: 0,
      
      // Click-Through Rate Metrics
      ctr: 0,
      unique_ctr: 0,
      outbound_clicks_ctr: 0,
      
      // Conversion Metrics
      conversions: 0,
      conversionRate: 0,
      cost_per_conversion: 0,
      conversion_values: 0,
      purchase_roas: 0,
      cpa: 0,
      roas: 0,
      
      // Engagement Metrics
      inline_link_clicks: 0,
      inline_link_click_ctr: 0,
      cost_per_inline_link_click: 0,
      inline_post_engagement: 0,
      cost_per_inline_post_engagement: 0,
      
      // Video Metrics
      video_play_actions: 0,
      video_avg_time_watched_actions: 0,
      video_p25_watched_actions: 0,
      video_p50_watched_actions: 0,
      video_p75_watched_actions: 0,
      video_p100_watched_actions: 0,
      video_thruplay_watched_actions: 0,
      cost_per_thruplay: 0,
      
      // Quality Rankings
      quality_ranking: 'unknown',
      engagement_rate_ranking: 'unknown',
      conversion_rate_ranking: 'unknown',
      
      // Additional Action Metrics
      actions: [],
      action_values: [],
    };
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; accountName?: string }> {
    try {
      const response = await this.makeRequest(`/${this.adAccountId}`, {
        fields: 'name,account_status,currency',
      });

      if (response.account_status === 1) { // Active
        return {
          success: true,
          message: 'Successfully connected to Meta Ads',
          accountName: response.name,
        };
      } else {
        return {
          success: false,
          message: `Ad account is not active (status: ${response.account_status})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Meta Ads',
      };
    }
  }
}

// Singleton instance
let metaAdsServiceInstance: MetaAdsService | null = null;

export function getMetaAdsService(accessToken?: string, adAccountId?: string): MetaAdsService {
  if (!metaAdsServiceInstance || accessToken || adAccountId) {
    metaAdsServiceInstance = new MetaAdsService(accessToken, adAccountId);
  }
  return metaAdsServiceInstance;
}