import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MetricConfigService } from '@/lib/services/metricConfigService';
import { MetricConfig } from '@/types/metricConfig';
import { MetaAdsSyncService } from '@/lib/services/metaAdsSyncService';

interface DateRange {
  from: Date;
  to: Date;
}

interface MetricData {
  date: string;
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
  custom_data?: any;
}

interface AggregatedMetrics {
  [key: string]: number;
  changePercent: {
    [key: string]: number;
  };
}

interface CalculatedMetric {
  key: string;
  value: number;
  change: number;
  config: MetricConfig;
}

export function useProjectMetrics(projectId: string, dateRange: DateRange) {
  // Fetch metric configurations with debug logging and auto-create defaults
  const { data: metricConfigs = [] } = useQuery({
    queryKey: ['metric-configs', projectId],
    queryFn: async () => {
      console.log('🔍 Fetching metric configs for project:', projectId);
      let configs = await MetricConfigService.getProjectMetricConfigs(projectId);
      console.log('📊 Retrieved metric configs:', configs);
      
      // If no configs exist, create default ones
      if (configs.length === 0) {
        console.log('🆕 No metric configs found, creating defaults...');
        try {
          configs = await MetricConfigService.createDefaultMetricConfigs(projectId);
          console.log('✅ Created default metric configs:', configs);
        } catch (error) {
          console.error('❌ Failed to create default metric configs:', error);
        }
      }
      
      return configs;
    },
    enabled: !!projectId,
  });

  // Check if we need to sync Meta Ads data
  const { data: hasMetaAdsMetrics } = useQuery({
    queryKey: ['has-meta-ads-metrics', projectId, metricConfigs],
    queryFn: async () => {
      // Check if any metric config uses meta_ads as data source
      return metricConfigs.some(config => config.data_source_type === 'meta_ads');
    },
    enabled: !!projectId && metricConfigs.length > 0,
  });

  // Sync Meta Ads data if needed
  const metaAdsSyncQuery = useQuery({
    queryKey: ['meta-ads-sync', projectId, dateRange.from?.getTime(), dateRange.to?.getTime()],
    queryFn: async () => {
      if (!hasMetaAdsMetrics) return null;
      
      try {
        const result = await MetaAdsSyncService.syncMetaAdsData({
          projectId,
          startDate: dateRange.from,
          endDate: dateRange.to,
        });
        console.log('Meta Ads sync result:', result);
        return result;
      } catch (error) {
        console.error('Meta Ads sync failed:', error);
        // Don't throw error to prevent blocking metrics display
        return null;
      }
    },
    enabled: !!projectId && !!hasMetaAdsMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch metrics data for the selected date range
  const metricsQuery = useQuery({
    queryKey: ['project-metrics', projectId, dateRange.from?.getTime(), dateRange.to?.getTime(), metaAdsSyncQuery.data],
    queryFn: async () => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_daily_metrics')
        .select('*')
        .eq('project_id', projectId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as MetricData[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch metrics for previous period for comparison
  const previousPeriodQuery = useQuery({
    queryKey: ['project-metrics-previous', projectId, dateRange.from?.getTime(), dateRange.to?.getTime()],
    queryFn: async () => {
      const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const previousFrom = new Date(dateRange.from.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousTo = new Date(dateRange.from.getTime() - 24 * 60 * 60 * 1000);

      const fromDate = format(previousFrom, 'yyyy-MM-dd');
      const toDate = format(previousTo, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_daily_metrics')
        .select('*')
        .eq('project_id', projectId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as MetricData[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });


  // Calculate configurable metrics based on metric configurations
  const calculateConfigurableMetrics = (
    currentData: MetricData[] | undefined,
    previousData: MetricData[] | undefined,
    configs: MetricConfig[]
  ): { metrics: CalculatedMetric[]; aggregated: AggregatedMetrics } => {
    console.log('🔢 Calculating metrics:', { 
      currentDataLength: currentData?.length || 0, 
      configsLength: configs.length,
      configs: configs.map(c => ({ key: c.metric_key, name: c.metric_name, isMain: c.is_main_metric }))
    });
    
    if (!currentData || currentData.length === 0 || !configs.length) {
      console.log('⚠️ No data or configs available, returning empty metrics');
      const emptyMetrics = configs.map(config => ({
        key: config.metric_key,
        value: 0,
        change: 0,
        config,
      }));
      
      const emptyAggregated: AggregatedMetrics = {
        changePercent: {},
      };
      
      configs.forEach(config => {
        emptyAggregated[config.metric_key] = 0;
        emptyAggregated.changePercent[config.metric_key] = 0;
      });
      
      return { metrics: emptyMetrics, aggregated: emptyAggregated };
    }

    const calculateValue = (data: MetricData[], config: MetricConfig): number => {
      const fieldData = data.map(d => {
        // Handle custom data fields
        if (config.database_field.startsWith('custom_data.')) {
          const customField = config.database_field.replace('custom_data.', '');
          return d.custom_data?.[customField] || 0;
        }
        // Handle regular fields
        return (d as any)[config.database_field] || 0;
      }).filter(value => typeof value === 'number' && !isNaN(value));

      if (fieldData.length === 0) return 0;

      switch (config.aggregation_type) {
        case 'sum':
          return fieldData.reduce((sum, val) => sum + val, 0);
        case 'average':
          return fieldData.reduce((sum, val) => sum + val, 0) / fieldData.length;
        case 'max':
          return Math.max(...fieldData);
        case 'min':
          return Math.min(...fieldData);
        case 'last':
          return fieldData[fieldData.length - 1] || 0;
        default:
          return fieldData.reduce((sum, val) => sum + val, 0);
      }
    };

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const metrics: CalculatedMetric[] = [];
    const aggregated: AggregatedMetrics = { changePercent: {} };

    configs.forEach(config => {
      const currentValue = calculateValue(currentData, config);
      const previousValue = previousData ? calculateValue(previousData, config) : 0;
      const change = calculateChange(currentValue, previousValue);

      metrics.push({
        key: config.metric_key,
        value: currentValue,
        change,
        config,
      });

      aggregated[config.metric_key] = currentValue;
      aggregated.changePercent[config.metric_key] = change;
    });

    return { metrics, aggregated };
  };

  const { metrics: calculatedMetrics, aggregated: aggregatedMetrics } = calculateConfigurableMetrics(
    metricsQuery.data,
    previousPeriodQuery.data,
    metricConfigs
  );

  // Calculate daily chart data
  const chartData = metricsQuery.data?.map(metric => ({
    date: metric.date,
    revenue: metric.revenue || 0,
    spend: metric.amount_spent || 0,
    profit: (metric.revenue || 0) - (metric.amount_spent || 0),
    conversions: metric.conversions || 0,
    clicks: metric.outbound_clicks || 0,
    impressions: metric.impressions || 0,
    ctr: metric.outbound_ctr || 0,
    cpc: metric.cpc || 0,
    cpm: metric.cpm || 0,
  })) || [];

  return {
    metrics: metricsQuery.data,
    calculatedMetrics,
    aggregatedMetrics,
    chartData,
    metricConfigs,
    isLoading: metricsQuery.isLoading || previousPeriodQuery.isLoading,
    error: metricsQuery.error || previousPeriodQuery.error,
    refetch: () => {
      metricsQuery.refetch();
      previousPeriodQuery.refetch();
    },
  };
}

// Hook to get main metrics only
export function useMainProjectMetrics(projectId: string, dateRange: DateRange) {
  const {
    calculatedMetrics,
    aggregatedMetrics,
    isLoading,
    error,
    refetch,
  } = useProjectMetrics(projectId, dateRange);

  // Filter only main metrics
  const mainMetrics = calculatedMetrics?.filter(metric => metric.config.is_main_metric) || [];

  return {
    mainMetrics,
    aggregatedMetrics,
    isLoading,
    error,
    refetch,
  };
}

// Helper function to format metric values
export function formatMetricValue(value: number, type: 'currency' | 'number' | 'percentage'): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(Math.round(value));
  }
}

// Helper function to get trend direction
export function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 1) return 'up';
  if (change < -1) return 'down';
  return 'neutral';
}