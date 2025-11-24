/* 
 * Integration code for GoogleSheetsOAuthSyncV4.tsx
 * 
 * 1. Add these imports at the top:
 */
import SyncModeManager from './SyncModeManager';
import DataMigrationService, { SyncMode } from '@/lib/services/dataMigrationService';

/* 
 * 2. Add this state variable with the other useState declarations:
 */
const [currentSyncMode, setCurrentSyncMode] = useState<SyncMode>('daily_aggregate');

/* 
 * 3. Add this effect to load the current sync mode from the config:
 */
useEffect(() => {
  if (syncConfig?.sync_mode) {
    setCurrentSyncMode(syncConfig.sync_mode as SyncMode);
  }
}, [syncConfig]);

/* 
 * 4. Add this handler function:
 */
const handleSyncModeChanged = (newMode: SyncMode) => {
  setCurrentSyncMode(newMode);
  setSyncMode(newMode);
  
  // Update the sync config state
  if (syncConfig) {
    const updatedConfig = { ...syncConfig, sync_mode: newMode };
    // You may want to save this immediately or wait for user to save manually
    toast({
      title: 'Sync Mode Updated',
      description: `Data sync mode changed to ${newMode}. Don't forget to save your configuration.`,
    });
  }
  
  // Invalidate queries to refresh data
  queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
  queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
};

/* 
 * 5. Add this JSX inside the Settings tab, after the integrations content but before the advanced tab:
 */
<TabsContent value="data-management" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Data Management</CardTitle>
      <CardDescription>
        Manage how your Google Sheets data is synchronized and stored
      </CardDescription>
    </CardHeader>
    <CardContent>
      <SyncModeManager
        projectId={projectId}
        currentSyncMode={currentSyncMode}
        onModeChanged={handleSyncModeChanged}
      />
    </CardContent>
  </Card>
</TabsContent>

/* 
 * 6. Update the TabsList to include the new tab (replace the existing TabsList in the settings section):
 */
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="metrics">Metrics</TabsTrigger>
  <TabsTrigger value="integrations">Integrations</TabsTrigger>
  <TabsTrigger value="data-management">Data Management</TabsTrigger>
  <TabsTrigger value="advanced">Advanced</TabsTrigger>
</TabsList>

/* 
 * 7. Update the save functions to handle the new sync mode fields.
 *    In the saveSpreadsheetConfig function, add these fields to the config object:
 */
const configToSave = {
  // ... existing fields
  sync_mode: syncMode,
  unique_id_column: uniqueIdMapping?.columnLetter || null,
  record_type: recordType,
  amount_column: amountMapping?.columnLetter || null,
  status_column: statusMapping?.columnLetter || null,
  auto_aggregate: false, // or true based on user preference
};

/* 
 * 8. Add validation for individual records mode in the save function:
 */
const validateIndividualRecordsConfig = () => {
  if (syncMode === 'individual_records') {
    if (!uniqueIdMapping?.columnLetter) {
      toast({
        title: 'Configuration Error',
        description: 'Unique ID column is required for individual records mode.',
        variant: 'destructive',
      });
      return false;
    }
    
    if (!recordType) {
      toast({
        title: 'Configuration Error', 
        description: 'Record type is required for individual records mode.',
        variant: 'destructive',
      });
      return false;
    }
  }
  return true;
};

/* 
 * 9. Add a data preview section that shows different content based on sync mode:
 */
{syncMode === 'individual_records' ? (
  <Alert className="mb-4">
    <FileText className="h-4 w-4" />
    <AlertDescription>
      <strong>Individual Records Mode:</strong> Each row will be stored as a separate record with its unique ID. 
      Perfect for tracking multiple sales, leads, or transactions per date.
    </AlertDescription>
  </Alert>
) : (
  <Alert className="mb-4">
    <BarChart3 className="h-4 w-4" />
    <AlertDescription>
      <strong>Daily Aggregate Mode:</strong> Data will be summarized by date. 
      Multiple entries for the same date will be combined into daily totals.
    </AlertDescription>
  </Alert>
)}

/* 
 * 10. Add a resync button that respects the current mode:
 */
const handleResyncWithCurrentMode = async () => {
  if (!syncConfig) return;
  
  setIsSyncing(true);
  
  try {
    const service = getGoogleSheetsMetricsService(connection);
    
    let result;
    if (currentSyncMode === 'individual_records') {
      result = await service.syncIndividualRecordsFromSheet(projectId, syncConfig);
      toast({
        title: 'Individual Records Synced',
        description: `Successfully synced ${result.records_synced} individual records.`,
      });
    } else {
      result = await service.syncProjectMetrics(projectId);
      toast({
        title: 'Daily Metrics Synced',
        description: `Successfully synced ${result.metrics_synced} daily metrics.`,
      });
    }
    
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
    
  } catch (error) {
    toast({
      title: 'Sync Failed',
      description: error instanceof Error ? error.message : 'Unknown error occurred',
      variant: 'destructive',
    });
  } finally {
    setIsSyncing(false);
  }
};

/* 
 * 11. Add imports for the required icons and components at the top:
 */
import { FileText, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

/* 
 * 12. Update the sync button to use the new handler:
 */
<Button 
  onClick={handleResyncWithCurrentMode}
  disabled={isSyncing}
  className="w-full"
>
  {isSyncing ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Syncing {currentSyncMode === 'individual_records' ? 'Individual Records' : 'Daily Metrics'}...
    </>
  ) : (
    <>
      <RefreshCw className="h-4 w-4 mr-2" />
      Sync {currentSyncMode === 'individual_records' ? 'Individual Records' : 'Daily Metrics'}
    </>
  )}
</Button>