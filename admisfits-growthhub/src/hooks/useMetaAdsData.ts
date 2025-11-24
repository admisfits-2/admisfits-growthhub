import { useQuery } from '@tanstack/react-query';
import { MetaOAuthService } from '@/lib/services/metaOAuthService';
import { getMetaAdsService, MetaAdsMetrics, MetaAdsCampaign, MetaAd, DateRange } from '@/lib/services/metaAdsService';
import { useToast } from '@/hooks/use-toast';

export function useMetaAdsData(projectId: string, dateRange?: DateRange) {
  const { toast } = useToast();

  // Check if Meta is connected for this project
  const connectionQuery = useQuery({
    queryKey: ['meta-connection', projectId],
    queryFn: () => MetaOAuthService.getConnection(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch account overview metrics
  const overviewQuery = useQuery({
    queryKey: ['meta-overview', projectId, dateRange],
    queryFn: async () => {
      const connection = connectionQuery.data;
      if (!connection) throw new Error('No Meta connection found');

      // Refresh token if needed
      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      return metaService.getAccountOverview(dateRange);
    },
    enabled: !!connectionQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error: Error) => {
      console.error('Failed to fetch Meta overview:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch Meta Ads data. Please check your connection.',
        variant: 'destructive',
      });
    },
  });

  // Fetch campaigns
  const campaignsQuery = useQuery({
    queryKey: ['meta-campaigns', projectId, dateRange],
    queryFn: async () => {
      const connection = connectionQuery.data;
      if (!connection) throw new Error('No Meta connection found');

      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      return metaService.getCampaigns(dateRange);
    },
    enabled: !!connectionQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch daily spend data for charts
  const dailySpendQuery = useQuery({
    queryKey: ['meta-daily-spend', projectId, dateRange],
    queryFn: async () => {
      const connection = connectionQuery.data;
      if (!connection) throw new Error('No Meta connection found');
      if (!dateRange) throw new Error('Date range is required');

      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      return metaService.getDailySpend(dateRange);
    },
    enabled: !!connectionQuery.data && !!dateRange,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch top performing ads
  const topAdsQuery = useQuery({
    queryKey: ['meta-top-ads', projectId, dateRange],
    queryFn: async () => {
      const connection = connectionQuery.data;
      if (!connection) throw new Error('No Meta connection found');

      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      
      // Default to last 7 days if no date range provided
      const effectiveDateRange = dateRange || {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      };
      
      return metaService.getTopPerformingAds(effectiveDateRange, 8);
    },
    enabled: !!connectionQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error: Error) => {
      console.error('Failed to fetch top ads:', error);
    },
  });

  // Test connection
  const testConnection = async () => {
    try {
      const connection = connectionQuery.data;
      if (!connection) {
        toast({
          title: 'Not Connected',
          description: 'Please connect your Meta Ads account first.',
          variant: 'destructive',
        });
        return { success: false, message: 'Not connected' };
      }

      const accessToken = await MetaOAuthService.refreshTokenIfNeeded(connection);
      const metaService = getMetaAdsService(accessToken, connection.ad_account_id);
      const result = await metaService.testConnection();

      toast({
        title: result.success ? 'Connected' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return { success: false, message };
    }
  };

  // Disconnect Meta
  const disconnect = async () => {
    try {
      await MetaOAuthService.disconnectConnection(projectId);
      
      // Invalidate all queries
      await connectionQuery.refetch();
      
      toast({
        title: 'Disconnected',
        description: 'Meta Ads account has been disconnected.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Meta Ads account.',
        variant: 'destructive',
      });
    }
  };

  return {
    // Connection status
    isConnected: !!connectionQuery.data?.is_active,
    connection: connectionQuery.data,
    
    // Data queries
    overview: overviewQuery.data,
    campaigns: campaignsQuery.data,
    dailySpend: dailySpendQuery.data,
    topAds: topAdsQuery.data,
    
    // Loading states
    isLoadingConnection: connectionQuery.isLoading,
    isLoadingOverview: overviewQuery.isLoading,
    isLoadingCampaigns: campaignsQuery.isLoading,
    isLoadingDailySpend: dailySpendQuery.isLoading,
    isLoadingTopAds: topAdsQuery.isLoading,
    
    // Error states
    connectionError: connectionQuery.error,
    overviewError: overviewQuery.error,
    campaignsError: campaignsQuery.error,
    topAdsError: topAdsQuery.error,
    
    // Actions
    testConnection,
    disconnect,
    refetch: () => {
      connectionQuery.refetch();
      overviewQuery.refetch();
      campaignsQuery.refetch();
      dailySpendQuery.refetch();
      topAdsQuery.refetch();
    },
    refetchConnection: connectionQuery.refetch,
  };
}