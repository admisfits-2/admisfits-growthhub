import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileSpreadsheet, 
  Link, 
  Unlink, 
  TestTube,
  RefreshCw,
  CheckCircle, 
  AlertCircle, 
  Loader2,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye,
  Settings,
  Play
} from 'lucide-react';
import { useGoogleSheetsMetrics } from '@/hooks/useGoogleSheetsMetrics';
import { GoogleSheetsSyncConfig } from '@/lib/services/googleSheetsMetricsService';
import { format } from 'date-fns';

interface GoogleSheetsMetricsSyncProps {
  projectId: string;
  projectName: string;
}

export default function GoogleSheetsMetricsSync({ projectId, projectName }: GoogleSheetsMetricsSyncProps) {
  const {
    syncConfig,
    metrics,
    isLoadingConfig,
    isLoadingMetrics,
    saveSyncConfig,
    testConnection,
    syncMetrics,
    isSavingConfig,
    isTestingConnection,
    isSyncing,
    testConnectionResult,
    isConfigured,
    hasMetrics,
  } = useGoogleSheetsMetrics(projectId);

  const [formData, setFormData] = useState<Partial<GoogleSheetsSyncConfig>>({
    project_id: projectId,
    spreadsheet_id: '',
    sheet_name: 'Sheet1',
    range_start: 'A2',
    date_column: 'A',
    outbound_clicks_column: 'B',
    amount_spent_column: 'C',
    outbound_ctr_column: 'D',
    cpm_column: 'E',
    cpc_column: 'F',
    is_active: true,
    sync_frequency_minutes: 60,
  });

  // Update form data when config is loaded
  useState(() => {
    if (syncConfig) {
      setFormData({
        ...syncConfig,
      });
    }
  });

  const handleSaveConfig = () => {
    if (!formData.spreadsheet_id || !formData.sheet_name || !formData.date_column) {
      return;
    }

    saveSyncConfig(formData as GoogleSheetsSyncConfig);
  };

  const handleTestConnection = () => {
    if (!formData.spreadsheet_id || !formData.sheet_name) {
      return;
    }

    testConnection({
      spreadsheetId: formData.spreadsheet_id,
      sheetName: formData.sheet_name,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const calculateTotals = () => {
    if (!metrics || metrics.length === 0) {
      return { totalSpend: 0, totalClicks: 0, avgCPC: 0, avgCTR: 0 };
    }

    const totalSpend = metrics.reduce((sum, m) => sum + (m.amount_spent || 0), 0);
    const totalClicks = metrics.reduce((sum, m) => sum + (m.outbound_clicks || 0), 0);
    const avgCPC = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.cpc || 0), 0) / metrics.length 
      : 0;
    const avgCTR = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.outbound_ctr || 0), 0) / metrics.length 
      : 0;

    return { totalSpend, totalClicks, avgCPC, avgCTR };
  };

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasMetrics}>Data</TabsTrigger>
          <TabsTrigger value="sync">Sync History</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Google Sheets Connection
              </CardTitle>
              <CardDescription>
                Connect your Google Sheets with Meta Ads data to automatically sync metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isConfigured && syncConfig ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Connected to spreadsheet <strong>{syncConfig.spreadsheet_id}</strong>
                    {syncConfig.last_sync_at && (
                      <span className="block text-sm text-muted-foreground mt-1">
                        Last synced: {format(new Date(syncConfig.last_sync_at), 'PPp')}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No Google Sheets connection configured. Set up the connection below to start syncing your Meta Ads data.
                  </AlertDescription>
                </Alert>
              )}

              {/* Configuration Form */}
              <div className="grid gap-6">
                {/* Basic Configuration */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Basic Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="spreadsheet-id">Spreadsheet ID *</Label>
                      <Input
                        id="spreadsheet-id"
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        value={formData.spreadsheet_id}
                        onChange={(e) => setFormData({ ...formData, spreadsheet_id: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Found in the Google Sheets URL between /d/ and /edit
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sheet-name">Sheet Name *</Label>
                      <Input
                        id="sheet-name"
                        placeholder="Sheet1"
                        value={formData.sheet_name}
                        onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Column Mappings */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Column Mappings</h4>
                  <p className="text-sm text-muted-foreground">
                    Map your spreadsheet columns to the corresponding metrics. Based on your data structure:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-column">Date Column *</Label>
                      <Input
                        id="date-column"
                        placeholder="A"
                        value={formData.date_column}
                        onChange={(e) => setFormData({ ...formData, date_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clicks-column">Outbound Clicks</Label>
                      <Input
                        id="clicks-column"
                        placeholder="B"
                        value={formData.outbound_clicks_column}
                        onChange={(e) => setFormData({ ...formData, outbound_clicks_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spend-column">Amount Spent</Label>
                      <Input
                        id="spend-column"
                        placeholder="C"
                        value={formData.amount_spent_column}
                        onChange={(e) => setFormData({ ...formData, amount_spent_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctr-column">Outbound CTR</Label>
                      <Input
                        id="ctr-column"
                        placeholder="D"
                        value={formData.outbound_ctr_column}
                        onChange={(e) => setFormData({ ...formData, outbound_ctr_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpm-column">CPM</Label>
                      <Input
                        id="cpm-column"
                        placeholder="E"
                        value={formData.cpm_column}
                        onChange={(e) => setFormData({ ...formData, cpm_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpc-column">CPC</Label>
                      <Input
                        id="cpc-column"
                        placeholder="F"
                        value={formData.cpc_column}
                        onChange={(e) => setFormData({ ...formData, cpc_column: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Advanced Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="range-start">Start Range</Label>
                      <Input
                        id="range-start"
                        placeholder="A2"
                        value={formData.range_start}
                        onChange={(e) => setFormData({ ...formData, range_start: e.target.value.toUpperCase() })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Starting cell (skip headers)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sync-frequency">Sync Frequency (minutes)</Label>
                      <Input
                        id="sync-frequency"
                        type="number"
                        min="15"
                        max="1440"
                        value={formData.sync_frequency_minutes}
                        onChange={(e) => setFormData({ ...formData, sync_frequency_minutes: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Test Connection Result */}
                {testConnectionResult && (
                  <Alert className={testConnectionResult.success ? 'border-green-200' : 'border-red-200'}>
                    {testConnectionResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      {testConnectionResult.message}
                      {testConnectionResult.sample_data && testConnectionResult.sample_data.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Sample data preview:</p>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {testConnectionResult.sample_data.slice(0, 2).map((row, i) => 
                              JSON.stringify(row) + '\n'
                            )}
                          </pre>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !formData.spreadsheet_id || !formData.sheet_name}
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig || !formData.spreadsheet_id || !formData.sheet_name}
                  >
                    {isSavingConfig ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                  {isConfigured && (
                    <Button
                      onClick={() => syncMetrics()}
                      disabled={isSyncing}
                      variant="secondary"
                    >
                      {isSyncing ? (
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
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. Google Sheets API Setup</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Enable Google Sheets API in Google Cloud Console</li>
                  <li>Create an API key with Sheets API access</li>
                  <li>Add your API key to environment variables</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Spreadsheet Access</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Make sure your spreadsheet is publicly accessible or shared</li>
                  <li>Copy the spreadsheet ID from the URL</li>
                  <li>Ensure your data starts from row 2 (row 1 for headers)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Data Format</h4>
                <p className="text-sm text-muted-foreground">
                  Your spreadsheet should have columns in this format (as shown in your image):
                </p>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <div>A: Day (2025-08-14)</div>
                  <div>B: Outbound click (47)</div>
                  <div>C: Amount spent ($282.92)</div>
                  <div>D: Outbound CTR (0.871338524%)</div>
                  <div>E: CPM ($52.45)</div>
                  <div>F: CPC ($6.02)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const totals = calculateTotals();
              return (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(totals.totalSpend)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(totals.totalClicks)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg CPC</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(totals.avgCPC)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(totals.avgCTR * 100).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Metrics Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Metrics</CardTitle>
                  <CardDescription>
                    Synced data from your Google Sheets
                  </CardDescription>
                </div>
                <Button
                  onClick={() => syncMetrics()}
                  disabled={isSyncing}
                  size="sm"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : metrics && metrics.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Date</th>
                        <th className="text-right py-2 px-2">Clicks</th>
                        <th className="text-right py-2 px-2">Spend</th>
                        <th className="text-right py-2 px-2">CTR</th>
                        <th className="text-right py-2 px-2">CPM</th>
                        <th className="text-right py-2 px-2">CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.slice(0, 20).map((metric) => (
                        <tr key={`${metric.date}-${metric.source}`} className="border-b">
                          <td className="py-2 px-2">{format(new Date(metric.date), 'MMM dd, yyyy')}</td>
                          <td className="text-right py-2 px-2">{formatNumber(metric.outbound_clicks || 0)}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(metric.amount_spent || 0)}</td>
                          <td className="text-right py-2 px-2">{((metric.outbound_ctr || 0) * 100).toFixed(3)}%</td>
                          <td className="text-right py-2 px-2">{formatCurrency(metric.cpm || 0)}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(metric.cpc || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No metrics data available. Run a sync to import data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync History Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                Current synchronization status and history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncConfig ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={syncConfig.last_sync_status === 'success' ? 'default' : 'destructive'}>
                          {syncConfig.last_sync_status || 'Never'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync</span>
                        <span className="text-sm">
                          {syncConfig.last_sync_at 
                            ? format(new Date(syncConfig.last_sync_at), 'PPp')
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Frequency</span>
                        <span className="text-sm">{syncConfig.sync_frequency_minutes} minutes</span>
                      </div>
                    </div>
                    <div>
                      {syncConfig.last_sync_error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Last sync error:</strong>
                            <br />
                            {syncConfig.last_sync_error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No sync configuration found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}