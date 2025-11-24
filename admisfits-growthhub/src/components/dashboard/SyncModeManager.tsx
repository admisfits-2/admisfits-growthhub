import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  FileText,
  History,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DataMigrationService, { SyncMode, MigrationResult, BackupInfo } from '@/lib/services/dataMigrationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface SyncModeManagerProps {
  projectId: string;
  currentSyncMode: SyncMode;
  onModeChanged: (newMode: SyncMode) => void;
}

export default function SyncModeManager({ projectId, currentSyncMode, onModeChanged }: SyncModeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<SyncMode>(currentSyncMode);
  const [preserveData, setPreserveData] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [showBackups, setShowBackups] = useState(false);

  // Get project data statistics
  const { data: dataStats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-data-stats', projectId],
    queryFn: () => DataMigrationService.getProjectDataStats(projectId),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get project backups
  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['project-backups', projectId],
    queryFn: () => DataMigrationService.getProjectBackups(projectId),
    enabled: showBackups,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Mode switch mutation
  const switchModeMutation = useMutation({
    mutationFn: async (newMode: SyncMode) => {
      const validation = await DataMigrationService.validateModeSwitch(projectId, newMode);
      
      if (!validation.canSwitch) {
        throw new Error('Mode switch validation failed');
      }

      return DataMigrationService.switchSyncMode(projectId, newMode, {
        preserveExistingData: preserveData,
        createBackup: createBackup,
        forceFreshSync: false
      });
    },
    onSuccess: (result: MigrationResult) => {
      if (result.success) {
        toast({
          title: 'Sync Mode Changed',
          description: `Successfully switched to ${result.newMode}. ${result.recordsConverted} records processed.`,
        });
        onModeChanged(result.newMode as SyncMode);
        queryClient.invalidateQueries({ queryKey: ['project-data-stats', projectId] });
        setIsDialogOpen(false);
      } else {
        toast({
          title: 'Mode Switch Failed',
          description: result.errorMessage || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Mode Switch Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Restore from backup mutation
  const restoreMutation = useMutation({
    mutationFn: (backupTableName: string) => 
      DataMigrationService.restoreFromBackup(projectId, backupTableName),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Data Restored',
          description: `Successfully restored ${result.restoredRecords} records from backup.`,
        });
        queryClient.invalidateQueries({ queryKey: ['project-data-stats', projectId] });
      } else {
        toast({
          title: 'Restore Failed',
          description: result.errorMessage || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Restore Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleModeSwitch = async (newMode: SyncMode) => {
    if (newMode === currentSyncMode) return;
    
    setTargetMode(newMode);
    setIsDialogOpen(true);
  };

  const confirmModeSwitch = () => {
    switchModeMutation.mutate(targetMode);
  };

  const getDataModeDescription = (mode: SyncMode) => {
    switch (mode) {
      case 'daily_aggregate':
        return 'One record per date with summarized metrics. Traditional approach for reporting.';
      case 'individual_records':
        return 'Each row becomes a separate record. Perfect for tracking individual sales, leads, or transactions.';
      default:
        return '';
    }
  };

  const getModeIcon = (mode: SyncMode) => {
    return mode === 'daily_aggregate' ? BarChart3 : FileText;
  };

  if (statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading data statistics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sync Mode
          </CardTitle>
          <CardDescription>
            Choose how your Google Sheets data is stored and synchronized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Mode Display */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              {React.createElement(getModeIcon(currentSyncMode), { className: "h-5 w-5" })}
              <div>
                <div className="font-medium">
                  {currentSyncMode === 'daily_aggregate' ? 'Daily Aggregates' : 'Individual Records'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getDataModeDescription(currentSyncMode)}
                </div>
              </div>
            </div>
            <Badge variant="default">Current</Badge>
          </div>

          {/* Data Statistics */}
          {dataStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Daily Aggregates</div>
                <div className="text-2xl font-bold">{dataStats.dailyMetricsCount}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Individual Records</div>
                <div className="text-2xl font-bold">{dataStats.individualRecordsCount}</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Mode Switch Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Switch Data Mode</Label>
            
            {/* Daily Aggregate Option */}
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                currentSyncMode === 'daily_aggregate' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => handleModeSwitch('daily_aggregate')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Daily Aggregates</div>
                    <div className="text-sm text-muted-foreground">
                      Best for reporting and dashboard metrics
                    </div>
                  </div>
                </div>
                {currentSyncMode === 'daily_aggregate' && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
            </div>

            {/* Individual Records Option */}
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                currentSyncMode === 'individual_records' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => handleModeSwitch('individual_records')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Individual Records</div>
                    <div className="text-sm text-muted-foreground">
                      Perfect for sales tracking with unique close IDs
                    </div>
                  </div>
                </div>
                {currentSyncMode === 'individual_records' && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
            </div>
          </div>

          <Separator />

          {/* Backup Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Data Backups</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBackups(!showBackups);
                  if (!showBackups) refetchBackups();
                }}
              >
                <History className="h-4 w-4 mr-2" />
                {showBackups ? 'Hide' : 'Show'} Backups
              </Button>
            </div>

            {showBackups && (
              <div className="border rounded-lg p-4 space-y-3">
                {backupsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading backups...
                  </div>
                ) : backups && backups.length > 0 ? (
                  backups.map((backup: BackupInfo) => (
                    <div key={backup.tableName} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{backup.recordCount} records</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(backup.backupDate).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{backup.backupReason}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreMutation.mutate(backup.tableName)}
                        disabled={restoreMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No backups found for this project
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode Switch Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch Data Sync Mode</DialogTitle>
            <DialogDescription>
              You're about to switch from {currentSyncMode} to {targetMode} mode.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Impact Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Data Impact:</strong>
                {targetMode === 'individual_records' ? (
                  <span> Your daily aggregates will be converted to individual records. Each daily total will become a single record.</span>
                ) : (
                  <span> Your individual records will be aggregated by date. Multiple records on the same date will be combined.</span>
                )}
              </AlertDescription>
            </Alert>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="preserve-data">Preserve existing data</Label>
                <Switch
                  id="preserve-data"
                  checked={preserveData}
                  onCheckedChange={setPreserveData}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="create-backup">Create backup before switch</Label>
                <Switch
                  id="create-backup"
                  checked={createBackup}
                  onCheckedChange={setCreateBackup}
                />
              </div>
            </div>

            {!preserveData && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Existing data will be lost. Only new data synced after the mode switch will be stored.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={switchModeMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmModeSwitch}
                disabled={switchModeMutation.isPending}
                className="flex-1"
              >
                {switchModeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Switch Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}