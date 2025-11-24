import { useEffect, useState } from 'react';
import { autoSyncService } from '@/lib/services/autoSyncService';

export function useAutoSync() {
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);

  useEffect(() => {
    // Start the auto-sync service when the app loads
    const initializeAutoSync = async () => {
      try {
        await autoSyncService.start();
        setIsServiceRunning(true);
        
        // Update sync jobs list
        setSyncJobs(autoSyncService.getAllSyncJobs());
      } catch (error) {
        console.error('Failed to start auto-sync service:', error);
      }
    };

    initializeAutoSync();

    // Cleanup when component unmounts
    return () => {
      autoSyncService.stop();
      setIsServiceRunning(false);
    };
  }, []);

  // Refresh sync jobs list
  const refreshSyncJobs = () => {
    setSyncJobs(autoSyncService.getAllSyncJobs());
  };

  // Get sync job status for a specific project
  const getSyncJobStatus = (projectId: string, type: 'single' | 'multi') => {
    return autoSyncService.getSyncJobStatus(projectId, type);
  };

  // Add or update sync job
  const updateSyncJob = async (projectId: string, type: 'single' | 'multi', intervalMinutes: number) => {
    await autoSyncService.updateSyncJob(projectId, type, intervalMinutes);
    refreshSyncJobs();
  };

  // Remove sync job
  const removeSyncJob = (projectId: string, type: 'single' | 'multi') => {
    autoSyncService.removeSyncJob(projectId, type);
    refreshSyncJobs();
  };

  return {
    isServiceRunning,
    syncJobs,
    getSyncJobStatus,
    updateSyncJob,
    removeSyncJob,
    refreshSyncJobs,
  };
}