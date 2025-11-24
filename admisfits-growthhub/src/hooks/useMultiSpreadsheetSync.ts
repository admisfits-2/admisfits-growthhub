import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  getGoogleSheetsMetricsService,
  MultiSpreadsheetSyncConfig
} from '@/lib/services/googleSheetsMetricsService';
import { GoogleOAuthService } from '@/lib/services/googleOAuthService';

export function useMultiSpreadsheetSync(projectId: string) {
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

  // Get multi-spreadsheet configuration
  const multiConfigQuery = useQuery({
    queryKey: ['multi-spreadsheet-config', projectId],
    queryFn: () => service.getMultiSpreadsheetConfig(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save multi-spreadsheet configuration
  const saveMultiConfigMutation = useMutation({
    mutationFn: (config: MultiSpreadsheetSyncConfig) => service.saveMultiSpreadsheetConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-spreadsheet-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
      toast({
        title: 'Configuration Saved',
        description: 'Multi-spreadsheet sync configuration has been saved successfully.',
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

  // Sync multiple spreadsheets
  const syncMultipleSpreadsheetsMutation = useMutation({
    mutationFn: (config: MultiSpreadsheetSyncConfig) => service.syncMultipleSpreadsheets(projectId, config),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
        queryClient.invalidateQueries({ queryKey: ['multi-spreadsheet-config', projectId] });
        
        const totalSpreadsheets = result.spreadsheet_results.length;
        const successfulSpreadsheets = result.spreadsheet_results.filter(r => !r.error).length;
        
        toast({
          title: 'Sync Successful',
          description: `Synced ${successfulSpreadsheets}/${totalSpreadsheets} spreadsheets. ${result.total_inserted} inserted, ${result.total_updated} updated.`,
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

  // Update auto-sync settings
  const updateAutoSyncMutation = useMutation({
    mutationFn: async ({ enabled, frequencyMinutes }: { enabled: boolean; frequencyMinutes: number }) => {
      const currentConfig = multiConfigQuery.data;
      if (!currentConfig) {
        throw new Error('No configuration found to update');
      }
      
      const updatedConfig = {
        ...currentConfig,
        auto_sync_enabled: enabled,
        sync_frequency_minutes: frequencyMinutes,
      };
      
      return service.saveMultiSpreadsheetConfig(updatedConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-spreadsheet-config', projectId] });
      toast({
        title: 'Auto-sync Settings Updated',
        description: 'Auto-sync settings have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    multiConfig: multiConfigQuery.data,
    
    // Loading states
    isLoadingConfig: multiConfigQuery.isLoading,
    
    // Actions
    saveMultiConfig: saveMultiConfigMutation.mutate,
    syncMultipleSpreadsheets: syncMultipleSpreadsheetsMutation.mutate,
    updateAutoSync: updateAutoSyncMutation.mutate,
    
    // Mutation states
    isSavingConfig: saveMultiConfigMutation.isPending,
    isSyncing: syncMultipleSpreadsheetsMutation.isPending,
    isUpdatingAutoSync: updateAutoSyncMutation.isPending,
    
    // Computed values
    isConfigured: !!multiConfigQuery.data,
    hasSpreadsheets: !!multiConfigQuery.data?.spreadsheets?.length,
    
    // Refresh functions
    refetchConfig: multiConfigQuery.refetch,
  };
}