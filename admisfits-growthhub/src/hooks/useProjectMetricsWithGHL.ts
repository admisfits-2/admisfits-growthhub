// Extended Project Metrics Hook with GHL Integration Support
// Combines existing metrics functionality with GHL data

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { MetricConfigService } from '@/lib/services/metricConfigService';
import { GHLDataService } from '@/lib/services/ghlDataService';
import { GHLIntegrationService } from '@/lib/services/ghlIntegrationService';
import { MetricConfig } from '@/types/metricConfig';
import { 
  ProjectDailyMetricsWithGHL, 
  GHLDashboardMetrics,
  GHLIntegrationStatus
} from '@/types/ghlIntegration';

interface DateRange {
  from: Date;
  to: Date;
}

interface ExtendedMetricData extends ProjectDailyMetricsWithGHL {
  // Additional computed fields
  appointment_completion_rate?: number;
  deal_win_rate?: number;
  revenue_per_appointment?: number;
  average_deal_value?: number;
}

interface ExtendedAggregatedMetrics {
  [key: string]: number;
  changePercent: {
    [key: string]: number;
  };
  ghl?: {
    totalAppointments: number;
    completedAppointments: number;
    totalDeals: number;
    wonDeals: number;
    totalRevenue: number;
    appointmentCompletionRate: number;
    dealWinRate: number;
    revenuePerAppointment: number;
  };
}

interface ExtendedCalculatedMetric {
  key: string;
  value: number;
  change: number;
  config: MetricConfig;
  source?: 'database' | 'ghl' | 'computed';
  ghlField?: string;
}

/**
 * Enhanced hook that combines traditional project metrics with GHL data
 */
export function useProjectMetricsWithGHL(projectId: string, dateRange: DateRange) {
  // Get GHL integration status
  const { data: ghlStatus } = useQuery({
    queryKey: ['ghl-integration-status', projectId],
    queryFn: () => GHLIntegrationService.getIntegrationStatus(projectId),
    enabled: !!projectId
  });

  // Fetch metric configurations
  const { data: metricConfigs = [] } = useQuery({
    queryKey: ['metric-configs', projectId],
    queryFn: async () => {
      let configs = await MetricConfigService.getProjectMetricConfigs(projectId);
      if (configs.length === 0) {
        configs = await MetricConfigService.createDefaultMetricConfigs(projectId);
      }
      return configs;
    },
    enabled: !!projectId,
  });

  // Fetch combined metrics data (traditional + GHL)
  const { data: currentData, isLoading: isLoadingCurrent, error: currentError } = useQuery({
    queryKey: ['extended-metrics-current', projectId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch all metrics including GHL data
      const { data, error } = await supabase
        .from('project_metrics_unified')
        .select('*')
        .eq('project_id', projectId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ExtendedMetricData[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch previous period data for comparison
  const { data: previousData } = useQuery({
    queryKey: ['extended-metrics-previous', projectId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const dateDiff = dateRange.to.getTime() - dateRange.from.getTime();
      const previousTo = new Date(dateRange.from.getTime() - 1);
      const previousFrom = new Date(previousTo.getTime() - dateDiff);
      
      const fromDate = format(previousFrom, 'yyyy-MM-dd');
      const toDate = format(previousTo, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_metrics_unified')
        .select('*')
        .eq('project_id', projectId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ExtendedMetricData[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Get real-time GHL metrics if integration is active
  const { data: realTimeGHLMetrics } = useQuery({
    queryKey: ['ghl-realtime-metrics', projectId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => GHLDataService.getRealTimeMetrics(projectId, dateRange.from, dateRange.to),
    enabled: !!projectId && ghlStatus?.isActive,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Calculate extended metrics including GHL data
  const calculateExtendedMetrics = (
    currentData: ExtendedMetricData[] | undefined,
    previousData: ExtendedMetricData[] | undefined,
    configs: MetricConfig[],
    ghlMetrics?: GHLDashboardMetrics | null
  ): { metrics: ExtendedCalculatedMetric[]; aggregated: ExtendedAggregatedMetrics } => {
    
    if (!currentData || currentData.length === 0) {
      const emptyMetrics = configs.map(config => ({
        key: config.metric_key,
        value: 0,
        change: 0,
        config,
        source: 'database' as const
      }));
      
      return { 
        metrics: emptyMetrics, 
        aggregated: { changePercent: {} } as ExtendedAggregatedMetrics 
      };
    }

    const calculateValue = (data: ExtendedMetricData[], config: MetricConfig): number => {
      // Handle GHL-specific fields
      if (config.data_source_type === 'ghl' && config.data_source_config) {
        const ghlConfig = config.data_source_config as any;
        return calculateGHLValue(data, ghlConfig);
      }

      // Handle regular database fields
      const fieldData = data.map(d => {
        if (config.database_field?.startsWith('custom_data.')) {
          const customField = config.database_field.replace('custom_data.', '');
          return d.raw_data?.[customField] || 0;
        }
        return (d as any)[config.database_field || config.metric_key] || 0;
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

    const calculateGHLValue = (data: ExtendedMetricData[], ghlConfig: any): number => {
      const fieldMapping: { [key: string]: string } = {
        'appointments_total': 'ghl_appointments_total',
        'appointments_completed': 'ghl_appointments_completed',
        'appointments_no_show': 'ghl_appointments_no_show',
        'appointments_cancelled': 'ghl_appointments_cancelled',
        'deals_total': 'ghl_deals_total',
        'deals_won': 'ghl_deals_won',
        'deals_lost': 'ghl_deals_lost',
        'deals_value': 'ghl_deals_value',
        'deals_won_value': 'ghl_deals_won_value',
      };

      const dbField = fieldMapping[ghlConfig.field] || ghlConfig.field;
      const fieldData = data.map(d => (d as any)[dbField] || 0)
        .filter(value => typeof value === 'number' && !isNaN(value));

      if (fieldData.length === 0) return 0;

      switch (ghlConfig.aggregation || 'sum') {
        case 'sum':
          return fieldData.reduce((sum, val) => sum + val, 0);
        case 'average':
          return fieldData.reduce((sum, val) => sum + val, 0) / fieldData.length;
        case 'count':
          return fieldData.length;
        default:
          return fieldData.reduce((sum, val) => sum + val, 0);
      }
    };

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const metrics: ExtendedCalculatedMetric[] = [];
    const aggregated: ExtendedAggregatedMetrics = { changePercent: {} };

    // Calculate configured metrics
    configs.forEach(config => {
      const currentValue = calculateValue(currentData, config);
      const previousValue = previousData ? calculateValue(previousData, config) : 0;
      const change = calculateChange(currentValue, previousValue);

      metrics.push({
        key: config.metric_key,
        value: currentValue,
        change,
        config,
        source: config.data_source_type === 'ghl' ? 'ghl' : 'database',
        ghlField: config.data_source_type === 'ghl' ? 
          (config.data_source_config as any)?.field : undefined
      });

      aggregated[config.metric_key] = currentValue;
      aggregated.changePercent[config.metric_key] = change;
    });

    // Add GHL summary metrics if available
    if (ghlMetrics || currentData.some(d => d.source === 'ghl')) {
      const ghlSummary = calculateGHLSummary(currentData);
      aggregated.ghl = ghlSummary;
    }

    return { metrics, aggregated };
  };

  const calculateGHLSummary = (data: ExtendedMetricData[]) => {
    const ghlData = data.filter(d => d.source === 'ghl');
    
    const totalAppointments = ghlData.reduce((sum, d) => sum + (d.ghl_appointments_total || 0), 0);
    const completedAppointments = ghlData.reduce((sum, d) => sum + (d.ghl_appointments_completed || 0), 0);
    const totalDeals = ghlData.reduce((sum, d) => sum + (d.ghl_deals_total || 0), 0);
    const wonDeals = ghlData.reduce((sum, d) => sum + (d.ghl_deals_won || 0), 0);
    const totalRevenue = ghlData.reduce((sum, d) => sum + (d.ghl_deals_won_value || 0), 0);

    return {
      totalAppointments,
      completedAppointments,
      totalDeals,
      wonDeals,
      totalRevenue,
      appointmentCompletionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      dealWinRate: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
      revenuePerAppointment: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
    };
  };

  // Calculate final metrics
  const calculatedMetrics = calculateExtendedMetrics(
    currentData,
    previousData,
    metricConfigs,
    realTimeGHLMetrics
  );

  return {
    // Data
    currentData,
    previousData,
    metricConfigs,
    realTimeGHLMetrics,
    ghlStatus,

    // Calculated metrics
    metrics: calculatedMetrics.metrics,
    aggregatedMetrics: calculatedMetrics.aggregated,

    // Loading states
    isLoading: isLoadingCurrent,
    
    // Error states
    error: currentError,

    // Utility functions
    refetch: () => {
      // Refetch all queries
    },

    // GHL specific data
    isGHLActive: ghlStatus?.isActive || false,
    hasGHLData: !!currentData?.some(d => d.source === 'ghl'),
    ghlSummary: calculatedMetrics.aggregated.ghl
  };
}

/**
 * Hook for main/summary metrics displayed on project cards
 */
export function useMainProjectMetricsWithGHL(projectId: string) {
  const dateRange = {
    from: subDays(new Date(), 30),
    to: new Date()
  };

  const { data: mainConfigs } = useQuery({
    queryKey: ['main-metric-configs', projectId],
    queryFn: () => MetricConfigService.getMainMetricConfigs(projectId),
    enabled: !!projectId,
  });

  const extendedMetrics = useProjectMetricsWithGHL(projectId, dateRange);

  const mainMetrics = extendedMetrics.metrics.filter(metric => 
    mainConfigs?.some(config => config.metric_key === metric.key)
  );

  return {
    ...extendedMetrics,
    mainMetrics,
    mainConfigs
  };
}

// Utility functions for metric formatting and trends
export function formatMetricValue(value: number, formatType: string): string {
  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
      return new Intl.NumberFormat('en-US').format(Math.round(value));
    default:
      return value.toString();
  }
}

export function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'neutral';
}