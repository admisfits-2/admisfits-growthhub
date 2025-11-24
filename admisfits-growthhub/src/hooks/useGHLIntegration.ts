// React hooks for GHL integration functionality

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  GHLIntegration,
  CreateGHLIntegrationInput,
  UpdateGHLIntegrationInput,
  GHLIntegrationStatus,
  GHLLocation
} from '@/types/ghlIntegration';
import { GHLIntegrationService } from '@/lib/services/ghlIntegrationService';
import { GHLCalendarDataService } from '@/lib/services/ghlCalendarDataService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for managing GHL integration configuration
 */
export const useGHLIntegration = (projectId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get integration config
  const {
    data: integrationConfig,
    isLoading: isLoadingConfig,
    error: configError
  } = useQuery({
    queryKey: ['ghl-integration-config', projectId],
    queryFn: () => GHLIntegrationService.getIntegration(projectId),
    enabled: !!projectId
  });

  // Get integration status
  const {
    data: integrationStatus,
    isLoading: isLoadingStatus
  } = useQuery({
    queryKey: ['ghl-integration-status', projectId],
    queryFn: () => GHLIntegrationService.getIntegrationStatus(projectId),
    enabled: !!projectId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Create integration config mutation
  const createIntegrationMutation = useMutation({
    mutationFn: (config: CreateGHLIntegrationInput) => 
      GHLIntegrationService.createIntegration(projectId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-status', projectId] });
    }
  });

  // Update integration config mutation
  const updateIntegrationMutation = useMutation({
    mutationFn: (updates: UpdateGHLIntegrationInput) => 
      GHLIntegrationService.updateIntegration(projectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-status', projectId] });
    }
  });

  // Delete integration config mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: () => GHLIntegrationService.deleteIntegration(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-status', projectId] });
    }
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async (dateRange?: { startDate: Date; endDate: Date }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Trigger manual sync via GHLCalendarDataService
      await GHLCalendarDataService.triggerManualSync(projectId, user.id, dateRange);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-integration-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-daily-metrics', projectId] });
    },
    onError: (error) => {
      console.error('Manual sync failed:', error);
    }
  });

  return {
    // Data
    integrationConfig,
    integrationStatus,
    
    // Loading states
    isLoadingConfig,
    isLoadingStatus,
    isCreating: createIntegrationMutation.isPending,
    isUpdating: updateIntegrationMutation.isPending,
    isDeleting: deleteIntegrationMutation.isPending,
    isSyncing: manualSyncMutation.isPending,
    
    // Error states
    configError,
    createError: createIntegrationMutation.error,
    updateError: updateIntegrationMutation.error,
    deleteError: deleteIntegrationMutation.error,
    syncError: manualSyncMutation.error,
    
    // Actions
    createIntegration: createIntegrationMutation.mutateAsync,
    updateIntegration: updateIntegrationMutation.mutateAsync,
    deleteIntegration: deleteIntegrationMutation.mutateAsync,
    triggerSync: manualSyncMutation.mutateAsync,
    
    // Computed properties
    isConfigured: !!integrationConfig,
    isActive: integrationConfig?.is_active || false,
    hasError: integrationStatus?.syncStatus === 'error'
  };
};

/**
 * Hook for testing GHL connection and fetching locations
 */
export const useGHLConnection = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    locations?: GHLLocation[];
    error?: string;
  } | null>(null);

  const testConnection = async (apiKey: string, locationId?: string) => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const result = await GHLIntegrationService.testConnection(apiKey, locationId);
      setConnectionResult(result);
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
      setConnectionResult(errorResult);
      return errorResult;
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getAvailableLocations = async (apiKey: string) => {
    try {
      return await GHLIntegrationService.getAvailableLocations(apiKey);
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  };

  return {
    isTestingConnection,
    connectionResult,
    testConnection,
    getAvailableLocations,
    clearResult: () => setConnectionResult(null)
  };
};

/**
 * Hook for fetching GHL dashboard metrics (placeholder - implement later)
 */
export const useGHLMetrics = (
  projectId: string,
  startDate: Date,
  endDate: Date,
  realTime = false
) => {
  // TODO: Implement when new data structure is ready
  return {
    realTimeMetrics: null,
    storedMetrics: null,
    projectSummary: null,
    isLoadingRealTime: false,
    isLoadingStored: false,
    isLoadingSummary: false,
    isLoading: false,
    realTimeError: null,
    storedError: null,
    error: null,
    hasData: false,
    isEmpty: true
  };
};

