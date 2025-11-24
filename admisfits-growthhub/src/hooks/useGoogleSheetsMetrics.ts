import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  getGoogleSheetsMetricsService,
  GoogleSheetsSyncConfig,
  DailyMetrics
} from '@/lib/services/googleSheetsMetricsService';
import { GoogleOAuthService } from '@/lib/services/googleOAuthService';

export function useGoogleSheetsMetrics(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get Google connection for this project
  const { data: connection } = useQuery({
    queryKey: ['google-connection', projectId],
    queryFn: () => GoogleOAuthService.getConnection(projectId),
    staleTime: 5 * 60 * 1000,
  });
  
  // Get service instance with connection if available
  const service = getGoogleSheetsMetricsService(connection || undefined);

  // Get sync configuration
  const syncConfigQuery = useQuery({
    queryKey: ['google-sheets-sync-config', projectId],
    queryFn: () => service.getSyncConfig(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get project metrics
  const metricsQuery = useQuery({
    queryKey: ['project-metrics', projectId],
    queryFn: () => service.getProjectMetrics(projectId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!syncConfigQuery.data,
  });

  // Save sync configuration
  const saveSyncConfigMutation = useMutation({
    mutationFn: (config: GoogleSheetsSyncConfig) => service.saveSyncConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
      toast({
        title: 'Configuration Saved',
        description: 'Google Sheets sync configuration has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: ({ spreadsheetId, sheetName }: { spreadsheetId: string; sheetName: string }) =>
      service.testConnection(spreadsheetId, sheetName),
    onSuccess: (result) => {
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync metrics
  const syncMetricsMutation = useMutation({
    mutationFn: () => service.syncProjectMetrics(projectId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
        queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
        
        toast({
          title: 'Sync Successful',
          description: `Synced ${result.metrics_synced} metrics. ${result.inserted} inserted, ${result.updated} updated.`,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    syncConfig: syncConfigQuery.data,
    metrics: metricsQuery.data,
    
    // Loading states
    isLoadingConfig: syncConfigQuery.isLoading,
    isLoadingMetrics: metricsQuery.isLoading,
    
    // Actions
    saveSyncConfig: saveSyncConfigMutation.mutate,
    testConnection: testConnectionMutation.mutate,
    syncMetrics: syncMetricsMutation.mutate,
    
    // Mutation states
    isSavingConfig: saveSyncConfigMutation.isPending,
    isTestingConnection: testConnectionMutation.isPending,
    isSyncing: syncMetricsMutation.isPending,
    
    // Test connection result
    testConnectionResult: testConnectionMutation.data,
    
    // Computed values
    isConfigured: !!syncConfigQuery.data,
    hasMetrics: !!metricsQuery.data && metricsQuery.data.length > 0,
    
    // Refresh functions
    refetchConfig: syncConfigQuery.refetch,
    refetchMetrics: metricsQuery.refetch,
  };
}