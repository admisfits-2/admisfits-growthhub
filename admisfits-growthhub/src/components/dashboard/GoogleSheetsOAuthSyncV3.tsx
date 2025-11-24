import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Link,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  Unlink,
  Calendar,
  History,
  Sheet,
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleOAuthService, ProjectGoogleConnection } from '@/lib/services/googleOAuthService';
import { GoogleSheetsSyncService } from '@/lib/services/googleSheetsSyncService';
import { GoogleSheetsMetricsService } from '@/lib/services/googleSheetsMetricsService';
import { 
  GoogleSheetsSyncConfig, 
  SheetConfig, 
  SYNC_INTERVALS,
  SyncHistory 
} from '@/types/googleSheetsSync';
import { predefinedMetrics } from '@/lib/googleSheets';
import { formatDistanceToNow, format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GoogleSheetsOAuthSyncV3Props {
  projectId: string;
  projectName: string;
}

export default function GoogleSheetsOAuthSyncV3({ projectId, projectName }: GoogleSheetsOAuthSyncV3Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('connection');
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, Record<string, any>>>({});
  
  // Fetch Google connection
  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['google-connection', projectId],
    queryFn: () => GoogleOAuthService.getConnection(projectId),
  });

  // Fetch sync configuration
  const { data: syncConfig, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['google-sheets-sync-config', projectId],
    queryFn: () => GoogleSheetsSyncService.getSyncConfig(projectId),
  });

  // Fetch sync history
  const { data: syncHistory = [] } = useQuery({
    queryKey: ['google-sheets-sync-history', projectId],
    queryFn: () => GoogleSheetsSyncService.getSyncHistory(projectId),
    enabled: !!syncConfig,
  });

  // Fetch spreadsheets
  const { data: spreadsheets = [], isLoading: spreadsheetsLoading } = useQuery({
    queryKey: ['google-spreadsheets', connection?.id],
    queryFn: async () => {
      if (!connection) return [];
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      return GoogleOAuthService.getSpreadsheets(accessToken);
    },
    enabled: !!connection && connection.is_active,
  });

  // Connect Google Account
  const connectMutation = useMutation({
    mutationFn: async () => {
      const authUrl = await GoogleOAuthService.getAuthUrl(projectId);
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Poll for connection
      return new Promise<ProjectGoogleConnection>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const conn = await GoogleOAuthService.getConnection(projectId);
            if (conn && conn.is_active) {
              clearInterval(interval);
              resolve(conn);
            } else if (attempts > 60) {
              clearInterval(interval);
              reject(new Error('Connection timeout'));
            }
          } catch (error) {
            if (attempts > 60) {
              clearInterval(interval);
              reject(error);
            }
          }
        }, 2000);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['google-spreadsheets'] });
      toast({
        title: 'Success',
        description: 'Google account connected successfully',
      });
    },
  });

  // Disconnect Google Account
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection) throw new Error('No connection to disconnect');
      return GoogleOAuthService.disconnect(connection.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['google-spreadsheets'] });
      toast({
        title: 'Disconnected',
        description: 'Google account disconnected',
      });
    },
  });

  // Save sync configuration
  const saveSyncConfigMutation = useMutation({
    mutationFn: async (config: Partial<GoogleSheetsSyncConfig>) => {
      return GoogleSheetsSyncService.upsertSyncConfig(projectId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
      toast({
        title: 'Configuration Saved',
        description: 'Sync configuration updated successfully',
      });
      setIsConfiguring(false);
    },
  });

  // Perform manual sync
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      if (!syncConfig) throw new Error('No sync configuration found');
      return GoogleSheetsSyncService.performSync(syncConfig, 'manual');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-history', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      
      toast({
        title: result.success ? 'Sync Complete' : 'Sync Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
  });

  // Delete sync configuration
  const deleteSyncConfigMutation = useMutation({
    mutationFn: async () => {
      if (!syncConfig) throw new Error('No sync configuration to delete');
      return GoogleSheetsSyncService.deleteSyncConfig(syncConfig.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-config', projectId] });
      toast({
        title: 'Configuration Deleted',
        description: 'Sync configuration removed',
      });
    },
  });

  // Initialize state from saved config
  useEffect(() => {
    if (syncConfig && syncConfig.sheet_configs) {
      const selectedSet = new Set(
        syncConfig.sheet_configs
          .filter(s => s.isSelected)
          .map(s => s.sheetId)
      );
      setSelectedSheets(selectedSet);
      setColumnMappings(syncConfig.column_mappings || {});
    }
  }, [syncConfig]);

  // Connection Status Component
  const ConnectionStatus = () => {
    if (connectionLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (!connection || !connection.is_active) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No Google account connected</span>
          </div>
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            {connectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect Google Account
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{connection.user_email}</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => disconnectMutation.mutate()}>
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // Sync Configuration Component
  const SyncConfiguration = () => {
    if (!connection || !connection.is_active) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Connect your Google account to configure sync</p>
        </div>
      );
    }

    if (syncConfig && !isConfiguring) {
      return (
        <div className="space-y-6">
          {/* Current Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Configuration</h3>
              <Button variant="outline" size="sm" onClick={() => setIsConfiguring(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Spreadsheet</span>
                  <Badge variant="secondary">{syncConfig.sheet_configs.length} sheets</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{syncConfig.spreadsheet_name}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Auto-sync</span>
                  <Switch checked={syncConfig.auto_sync_enabled} disabled />
                </div>
                {syncConfig.auto_sync_enabled && (
                  <p className="text-sm text-muted-foreground">
                    {SYNC_INTERVALS.find(i => i.value === syncConfig.sync_interval_hours)?.label || 'Custom interval'}
                  </p>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Last Sync</span>
                  {syncConfig.sync_status === 'syncing' && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {syncConfig.last_sync_at 
                    ? formatDistanceToNow(new Date(syncConfig.last_sync_at), { addSuffix: true })
                    : 'Never synced'
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => manualSyncMutation.mutate()} 
                disabled={manualSyncMutation.isPending || syncConfig.sync_status === 'syncing'}
                className="flex-1"
              >
                {manualSyncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this sync configuration?')) {
                    deleteSyncConfigMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Configuration form
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Configure Sync</h3>
          
          {/* Spreadsheet Selection */}
          <div className="space-y-2">
            <Label>Select Spreadsheet</Label>
            <Select
              value={syncConfig?.spreadsheet_id}
              onValueChange={(value) => {
                const spreadsheet = spreadsheets.find(s => s.id === value);
                if (spreadsheet) {
                  // Create new config with spreadsheet info
                  saveSyncConfigMutation.mutate({
                    spreadsheet_id: spreadsheet.id,
                    spreadsheet_name: spreadsheet.name,
                    sheet_configs: [],
                    column_mappings: {},
                    auto_sync_enabled: false,
                    sync_interval_hours: 24,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a spreadsheet" />
              </SelectTrigger>
              <SelectContent>
                {spreadsheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {sheet.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sheet Selection and Mapping */}
          {syncConfig && syncConfig.spreadsheet_id && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Select Sheets to Sync</h4>
                <div className="space-y-2">
                  {/* This would be populated with actual sheet data */}
                  <p className="text-sm text-muted-foreground">
                    Configure individual sheets and column mappings
                  </p>
                </div>
              </div>

              {/* Auto-sync Settings */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Enable Auto-sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync data at regular intervals
                    </p>
                  </div>
                  <Switch 
                    id="auto-sync"
                    checked={syncConfig.auto_sync_enabled}
                    onCheckedChange={(checked) => {
                      saveSyncConfigMutation.mutate({
                        ...syncConfig,
                        auto_sync_enabled: checked,
                      });
                    }}
                  />
                </div>

                {syncConfig.auto_sync_enabled && (
                  <div className="space-y-2">
                    <Label>Sync Interval</Label>
                    <Select
                      value={syncConfig.sync_interval_hours.toString()}
                      onValueChange={(value) => {
                        saveSyncConfigMutation.mutate({
                          ...syncConfig,
                          sync_interval_hours: parseInt(value),
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYNC_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={interval.value.toString()}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {interval.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsConfiguring(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Save configuration
                    saveSyncConfigMutation.mutate({
                      ...syncConfig,
                      sheet_configs: Array.from(selectedSheets).map(sheetId => ({
                        sheetId,
                        sheetName: 'Sheet Name', // This would come from actual sheet data
                        isSelected: true,
                        columnHeaders: [],
                      })),
                      column_mappings: columnMappings,
                    });
                  }}
                  className="flex-1"
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Sync History Component
  const SyncHistoryView = () => {
    if (!syncConfig) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No sync configuration found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Sync History</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['google-sheets-sync-history', projectId] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sheets</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {syncHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No sync history available
                </TableCell>
              </TableRow>
            ) : (
              syncHistory.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>
                    {format(new Date(history.started_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={history.sync_type === 'manual' ? 'default' : 'secondary'}>
                      {history.sync_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        history.status === 'success' ? 'default' :
                        history.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {history.status === 'success' && <Check className="h-3 w-3 mr-1" />}
                      {history.status === 'error' && <X className="h-3 w-3 mr-1" />}
                      {history.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {history.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{history.sheets_synced}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="text-green-600">{history.rows_inserted} inserted</span>
                      {', '}
                      <span className="text-blue-600">{history.rows_updated} updated</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {history.error_message && (
                      <span className="text-xs text-red-600">{history.error_message}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Check if database setup is needed
  const needsSetup = configError?.message?.includes('does not exist') || 
                     configError?.message?.includes('relation');

  if (needsSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Sync - Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-orange-900">Database Setup Required</p>
                  <p className="text-sm text-orange-700">
                    The Google Sheets sync feature requires database tables to be created. Please run the following SQL scripts in your Supabase dashboard:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-orange-600">
                    <li>Go to Supabase Dashboard → SQL Editor</li>
                    <li>Run <code className="bg-orange-100 px-1 rounded">create_google_sheets_sync_config.sql</code></li>
                    <li>Run <code className="bg-orange-100 px-1 rounded">setup_auto_sync.sql</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Google Sheets Sync
        </CardTitle>
        <CardDescription>
          Sync your Meta Ads data from Google Sheets to your project metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <ConnectionStatus />
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <SyncConfiguration />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <SyncHistoryView />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}