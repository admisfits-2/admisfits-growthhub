export interface MetricConfig {
  id: string;
  project_id: string;
  metric_name: string;
  metric_key: string;
  database_field: string | null;
  aggregation_type: 'sum' | 'average' | 'max' | 'min' | 'last';
  calculation_type: 'total' | 'average' | 'percentage';
  format_type: 'currency' | 'number' | 'percentage';
  icon: string; // Lucide icon name
  display_order: number;
  is_visible: boolean;
  is_main_metric: boolean;
  data_source_type: 'database' | 'google_sheets' | 'api' | 'meta_ads';
  data_source_config: any; // JSON config for external sources
  created_at: string;
  updated_at: string;
}

export interface CreateMetricConfigInput {
  metric_name: string;
  metric_key: string;
  database_field?: string | null;
  aggregation_type?: 'sum' | 'average' | 'max' | 'min' | 'last';
  calculation_type?: 'total' | 'average' | 'percentage';
  format_type?: 'currency' | 'number' | 'percentage';
  icon?: string;
  display_order?: number;
  is_visible?: boolean;
  is_main_metric?: boolean;
  data_source_type?: 'database' | 'google_sheets' | 'api' | 'meta_ads';
  data_source_config?: any;
}

export interface MetricValue {
  id: string;
  name: string;
  key: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any; // Lucide icon component
}

// Available database fields from project_daily_metrics
export const AVAILABLE_DATABASE_FIELDS = [
  { value: 'outbound_clicks', label: 'Outbound Clicks', type: 'number' },
  { value: 'amount_spent', label: 'Amount Spent', type: 'currency' },
  { value: 'outbound_ctr', label: 'Outbound CTR', type: 'percentage' },
  { value: 'cpm', label: 'CPM', type: 'currency' },
  { value: 'cpc', label: 'CPC', type: 'currency' },
  { value: 'impressions', label: 'Impressions', type: 'number' },
  { value: 'reach', label: 'Reach', type: 'number' },
  { value: 'frequency', label: 'Frequency', type: 'number' },
  { value: 'conversions', label: 'Conversions', type: 'number' },
  { value: 'conversion_rate', label: 'Conversion Rate', type: 'percentage' },
  { value: 'cost_per_conversion', label: 'Cost Per Conversion', type: 'currency' },
  { value: 'revenue', label: 'Revenue', type: 'currency' },
  { value: 'roas', label: 'ROAS', type: 'number' },
  // Custom data fields can be accessed via custom_data->>'field_name'
] as const;

// Available Meta Ads fields - Comprehensive list from Meta Ads Insights API
export const AVAILABLE_META_ADS_FIELDS = [
  // Basic Performance Metrics
  { value: 'impressions', label: 'Impressions', type: 'number' },
  { value: 'reach', label: 'Reach', type: 'number' },
  { value: 'frequency', label: 'Frequency', type: 'number' },
  { value: 'clicks', label: 'All Clicks', type: 'number' },
  { value: 'unique_clicks', label: 'Unique Clicks', type: 'number' },
  { value: 'outbound_clicks', label: 'Outbound Clicks', type: 'number' },
  { value: 'unique_outbound_clicks', label: 'Unique Outbound Clicks', type: 'number' },
  
  // Cost Metrics
  { value: 'spend', label: 'Amount Spent', type: 'currency' },
  { value: 'cpc', label: 'CPC (Cost per Click)', type: 'currency' },
  { value: 'cpm', label: 'CPM (Cost per 1000 Impressions)', type: 'currency' },
  { value: 'cpp', label: 'CPP (Cost per 1000 People Reached)', type: 'currency' },
  { value: 'cost_per_unique_click', label: 'Cost per Unique Click', type: 'currency' },
  { value: 'cost_per_outbound_click', label: 'Cost per Outbound Click', type: 'currency' },
  { value: 'cost_per_unique_outbound_click', label: 'Cost per Unique Outbound Click', type: 'currency' },
  
  // Click-Through Rate Metrics
  { value: 'ctr', label: 'CTR (All)', type: 'percentage' },
  { value: 'unique_ctr', label: 'Unique CTR', type: 'percentage' },
  { value: 'outbound_clicks_ctr', label: 'Outbound Clicks CTR', type: 'percentage' },
  
  // Conversion Metrics
  { value: 'conversions', label: 'Total Conversions', type: 'number' },
  { value: 'conversion_rate_ranking', label: 'Conversion Rate Ranking', type: 'text' },
  { value: 'cost_per_conversion', label: 'Cost per Conversion', type: 'currency' },
  { value: 'cost_per_action_type', label: 'Cost per Action Type', type: 'currency' },
  { value: 'conversion_values', label: 'Conversion Values', type: 'currency' },
  { value: 'purchase_roas', label: 'Purchase ROAS', type: 'number' },
  
  // Video Metrics
  { value: 'video_play_actions', label: 'Video Plays', type: 'number' },
  { value: 'video_views', label: 'Video Views', type: 'number' },
  { value: 'video_avg_time_watched_actions', label: 'Average Video Watch Time', type: 'number' },
  { value: 'video_p25_watched_actions', label: 'Video 25% Watched', type: 'number' },
  { value: 'video_p50_watched_actions', label: 'Video 50% Watched', type: 'number' },
  { value: 'video_p75_watched_actions', label: 'Video 75% Watched', type: 'number' },
  { value: 'video_p100_watched_actions', label: 'Video 100% Watched', type: 'number' },
  { value: 'video_thruplay_watched_actions', label: 'ThruPlay Actions', type: 'number' },
  { value: 'cost_per_thruplay', label: 'Cost per ThruPlay', type: 'currency' },
  
  // Engagement Metrics
  { value: 'engagement_rate_ranking', label: 'Engagement Rate Ranking', type: 'text' },
  { value: 'inline_link_clicks', label: 'Link Clicks', type: 'number' },
  { value: 'inline_link_click_ctr', label: 'Link Click-Through Rate', type: 'percentage' },
  { value: 'cost_per_inline_link_click', label: 'Cost per Link Click', type: 'currency' },
  { value: 'inline_post_engagement', label: 'Post Engagements', type: 'number' },
  { value: 'cost_per_inline_post_engagement', label: 'Cost per Post Engagement', type: 'currency' },
  
  // Social Metrics
  { value: 'social_spend', label: 'Social Spend', type: 'currency' },
  { value: 'unique_inline_link_clicks', label: 'Unique Link Clicks', type: 'number' },
  { value: 'unique_inline_link_click_ctr', label: 'Unique Link CTR', type: 'percentage' },
  
  // Quality and Relevance Metrics
  { value: 'quality_ranking', label: 'Quality Ranking', type: 'text' },
  { value: 'quality_score_organic', label: 'Organic Quality Score', type: 'number' },
  { value: 'quality_score_ectr', label: 'Expected CTR Quality Score', type: 'number' },
  { value: 'quality_score_ecvr', label: 'Expected CVR Quality Score', type: 'number' },
  
  // Attribution Settings
  { value: 'attribution_setting', label: 'Attribution Setting', type: 'text' },
  { value: 'dda_results', label: 'Data-Driven Attribution Results', type: 'text' },
  
  // Ad Delivery Metrics
  { value: 'estimated_ad_recallers', label: 'Estimated Ad Recall Lift', type: 'number' },
  { value: 'cost_per_estimated_ad_recallers', label: 'Cost per Estimated Ad Recall Lift', type: 'currency' },
  { value: 'instant_experience_clicks_to_open', label: 'Instant Experience Clicks to Open', type: 'number' },
  { value: 'instant_experience_clicks_to_start', label: 'Instant Experience Clicks to Start', type: 'number' },
  
  // Campaign Metrics
  { value: 'objective', label: 'Campaign Objective', type: 'text' },
  { value: 'optimization_goal', label: 'Optimization Goal', type: 'text' },
  { value: 'buying_type', label: 'Buying Type', type: 'text' },
  
  // Additional Performance Metrics
  { value: 'action_values', label: 'Action Values', type: 'currency' },
  { value: 'actions', label: 'Actions', type: 'number' },
  { value: 'cost_per_unique_action_type', label: 'Cost per Unique Action', type: 'currency' },
  { value: 'unique_actions', label: 'Unique Actions', type: 'number' },
  { value: 'website_ctr', label: 'Website CTR', type: 'percentage' },
  { value: 'website_purchase_roas', label: 'Website Purchase ROAS', type: 'number' },
  
  // Mobile App Metrics
  { value: 'mobile_app_purchase_roas', label: 'Mobile App Purchase ROAS', type: 'number' },
  { value: 'app_store_clicks', label: 'App Store Clicks', type: 'number' },
  { value: 'deeplink_clicks', label: 'Deep Link Clicks', type: 'number' },
  
  // Catalog Metrics
  { value: 'catalog_segment_actions', label: 'Catalog Segment Actions', type: 'number' },
  { value: 'catalog_segment_value', label: 'Catalog Segment Value', type: 'currency' },
  { value: 'omni_purchase_roas', label: 'Omni-Channel Purchase ROAS', type: 'number' },
  
  // Location Metrics
  { value: 'location', label: 'Location', type: 'text' },
  { value: 'canvas_avg_view_percent', label: 'Canvas Average View Percent', type: 'percentage' },
  { value: 'canvas_avg_view_time', label: 'Canvas Average View Time', type: 'number' },
] as const;

// Available Lucide icons for metrics
export const AVAILABLE_ICONS = [
  { value: 'DollarSign', label: 'Dollar Sign' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'TrendingDown', label: 'Trending Down' },
  { value: 'Target', label: 'Target' },
  { value: 'Users', label: 'Users' },
  { value: 'MousePointer', label: 'Mouse Pointer' },
  { value: 'Eye', label: 'Eye' },
  { value: 'Zap', label: 'Zap' },
  { value: 'Activity', label: 'Activity' },
  { value: 'BarChart3', label: 'Bar Chart' },
  { value: 'PieChart', label: 'Pie Chart' },
  { value: 'LineChart', label: 'Line Chart' },
] as const;