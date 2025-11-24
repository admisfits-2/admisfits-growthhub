import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Play,
  Table,
  Calendar,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Zap
} from 'lucide-react';
import { GoogleOAuthService, GoogleSpreadsheet, GoogleSpreadsheetDetails, ProjectGoogleConnection } from '@/lib/services/googleOAuthService';
import { getGoogleSheetsMetricsService, GoogleSheetsSyncConfig } from '@/lib/services/googleSheetsMetricsService';
import { useGoogleSheetsMetrics } from '@/hooks/useGoogleSheetsMetrics';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface GoogleSheetsOAuthSyncProps {
  projectId: string;
  projectName: string;
}

interface MetricMapping {
  id: string;
  name: string;
  columnLetter: string;
  isCustom: boolean;
}

interface PredefinedMetric {
  id: string;
  name: string;
  description: string;
  fieldName: keyof GoogleSheetsSyncConfig;
}

export default function GoogleSheetsOAuthSyncV2({ projectId, projectName }: GoogleSheetsOAuthSyncProps) {
  const { toast } = useToast();

  // Predefined metrics that users can choose from
  const predefinedMetrics: PredefinedMetric[] = [
    { id: 'outbound_clicks', name: 'Outbound Clicks', description: 'Number of link clicks', fieldName: 'outbound_clicks_column' },
    { id: 'amount_spent', name: 'Amount Spent', description: 'Total ad spend', fieldName: 'amount_spent_column' },
    { id: 'outbound_ctr', name: 'CTR (Click-through rate)', description: 'Outbound click-through rate', fieldName: 'outbound_ctr_column' },
    { id: 'cpm', name: 'CPM (Cost per 1,000 impressions)', description: 'Cost per 1,000 impressions', fieldName: 'cpm_column' },
    { id: 'cpc', name: 'CPC (Cost per link click)', description: 'Cost per link click', fieldName: 'cpc_column' },
    { id: 'impressions', name: 'Impressions', description: 'Number of times ads were shown', fieldName: 'impressions_column' },
    { id: 'reach', name: 'Reach', description: 'Number of people reached', fieldName: 'reach_column' },
    { id: 'frequency', name: 'Frequency', description: 'Average times shown per person', fieldName: 'frequency_column' },
    { id: 'conversions', name: 'Conversions', description: 'Number of conversions', fieldName: 'conversions_column' },
    { id: 'conversion_rate', name: 'Conversion Rate', description: 'Percentage of conversions', fieldName: 'conversion_rate_column' },
    { id: 'cost_per_conversion', name: 'Cost per Conversion', description: 'Cost per conversion', fieldName: 'cost_per_conversion_column' },
    { id: 'revenue', name: 'Revenue', description: 'Generated revenue', fieldName: 'revenue_column' },
    { id: 'roas', name: 'ROAS (Return on Ad Spend)', description: 'Return on ad spend ratio', fieldName: 'roas_column' },
  ];

  // Auto-sync interval options (in hours)
  const syncIntervalOptions = [
    { value: 1, label: 'Every hour' },
    { value: 2, label: 'Every 2 hours' },
    { value: 4, label: 'Every 4 hours' },
    { value: 6, label: 'Every 6 hours' },
    { value: 12, label: 'Every 12 hours' },
    { value: 24, label: 'Daily' },
    { value: 168, label: 'Weekly' },
  ];

  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<ProjectGoogleConnection | null>(null);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSpreadsheet | null>(null);
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<GoogleSpreadsheetDetails | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(24); // hours
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [metricMappings, setMetricMappings] = useState<MetricMapping[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState<Partial<GoogleSheetsSyncConfig>>({
    project_id: projectId,
    spreadsheet_id: '',
    sheet_name: '',
    range_start: 'A2',
    date_column: '',
    is_active: true,
    sync_frequency_minutes: 60,
  });

  // Check existing connection
  const connectionQuery = useQuery({
    queryKey: ['google-connection', projectId],
    queryFn: () => GoogleOAuthService.getConnection(projectId),
    staleTime: 5 * 60 * 1000,
  });

  // Get user's spreadsheets
  const spreadsheetsQuery = useQuery({
    queryKey: ['google-spreadsheets', connection?.access_token],
    queryFn: async () => {
      if (!connection) return [];
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      return GoogleOAuthService.getSpreadsheets(accessToken);
    },
    enabled: !!connection,
    staleTime: 10 * 60 * 1000,
  });

  const {
    syncConfig,
    metrics,
    isLoadingMetrics,
    saveSyncConfig,
    syncMetrics,
    isSyncing,
    hasMetrics,
    refetchConfig,
    refetchMetrics,
  } = useGoogleSheetsMetrics(projectId);

  useEffect(() => {
    if (connectionQuery.data) {
      setConnection(connectionQuery.data);
    }
  }, [connectionQuery.data]);

  // Load existing configuration
  useEffect(() => {
    if (syncConfig && !isEditMode) {
      setFormData({
        ...syncConfig,
        custom_metrics: syncConfig.custom_metrics || {},
      });
      
      // Load auto-sync settings
      setAutoSyncEnabled(syncConfig.is_active && syncConfig.sync_frequency_minutes > 0);
      setSyncInterval(Math.max(1, Math.ceil((syncConfig.sync_frequency_minutes || 60) / 60))); // Convert minutes to hours

      // Reconstruct metric mappings from config
      const mappings: MetricMapping[] = [
        {
          id: 'date',
          name: 'Date',
          columnLetter: syncConfig.date_column,
          isCustom: false
        }
      ];

      // Add predefined metrics
      predefinedMetrics.forEach(metric => {
        const columnValue = (syncConfig as any)[metric.fieldName];
        if (columnValue) {
          mappings.push({
            id: metric.id,
            name: metric.name,
            columnLetter: columnValue,
            isCustom: false
          });
        }
      });

      // Add custom metrics
      if (syncConfig.custom_metrics) {
        Object.entries(syncConfig.custom_metrics).forEach(([name, columnLetter]) => {
          mappings.push({
            id: `custom_${Date.now()}_${Math.random()}`,
            name,
            columnLetter: columnLetter as string,
            isCustom: true
          });
        });
      }

      setMetricMappings(mappings);
      
      // Load spreadsheet and sheet data if configured
      if (syncConfig.spreadsheet_id) {
        loadSpreadsheetDetails(syncConfig.spreadsheet_id);
        if (syncConfig.sheet_name) {
          setSelectedSheetName(syncConfig.sheet_name);
          loadSheetPreview(syncConfig.spreadsheet_id, syncConfig.sheet_name);
        }
      }

      // Load additional selected sheets if available (stored in custom_data or another field)
      // For now, we'll just ensure the primary sheet is selected
      if (syncConfig.sheet_name) {
        setSelectedSheets(new Set([syncConfig.sheet_name]));
      }
    }
  }, [syncConfig, isEditMode]);

  // OAuth connect handler
  const handleConnect = () => {
    setIsConnecting(true);
    const authUrl = GoogleOAuthService.getAuthorizationUrl(projectId);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      await GoogleOAuthService.disconnectConnection(projectId);
      setConnection(null);
      connectionQuery.refetch();
      toast({
        title: 'Disconnected',
        description: 'Google account has been disconnected.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google account.',
        variant: 'destructive',
      });
    }
  };

  const loadSpreadsheetDetails = async (spreadsheetId: string) => {
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(spreadsheetId, accessToken);
      setSpreadsheetDetails(details);
      
      // Find the spreadsheet in the list
      const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === spreadsheetId);
      if (spreadsheet) {
        setSelectedSpreadsheet(spreadsheet);
      }
    } catch (error) {
      console.error('Failed to load spreadsheet details:', error);
    }
  };

  const loadSheetPreview = async (spreadsheetId: string, sheetName: string) => {
    setIsLoadingPreview(true);
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const range = `${sheetName}!A1:Z10`; // Preview first 10 rows, up to column Z
      const rows = await GoogleOAuthService.getSheetData(spreadsheetId, range, accessToken);
      setPreviewData(rows);
      
      // Extract column headers (first row) and generate column letters
      if (rows.length > 0) {
        const headers = rows[0] || [];
        setColumnHeaders(headers);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sheet preview.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSpreadsheetSelect = async (spreadsheetId: string) => {
    const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === spreadsheetId);
    if (!spreadsheet) return;

    setSelectedSpreadsheet(spreadsheet);
    setFormData({ ...formData, spreadsheet_id: spreadsheetId });
    
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(spreadsheet.id, accessToken);
      setSpreadsheetDetails(details);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get spreadsheet details.',
        variant: 'destructive',
      });
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheetName(sheetName);
    setFormData({ ...formData, sheet_name: sheetName });
    
    if (selectedSpreadsheet) {
      await loadSheetPreview(selectedSpreadsheet.id, sheetName);
    }
  };

  const handleMultipleSheetToggle = (sheetName: string, checked: boolean) => {
    setSelectedSheets(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(sheetName);
      } else {
        newSet.delete(sheetName);
      }
      return newSet;
    });
  };

  // Helper functions for column mapping
  const getColumnLetter = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  const getColumnOptions = () => {
    return columnHeaders.map((header, index) => ({
      letter: getColumnLetter(index),
      header: header || `Column ${getColumnLetter(index)}`
    }));
  };

  const addPredefinedMetric = (metricId: string) => {
    const metric = predefinedMetrics.find(m => m.id === metricId);
    if (!metric) return;

    const newMapping: MetricMapping = {
      id: metricId,
      name: metric.name,
      columnLetter: '',
      isCustom: false
    };

    setMetricMappings(prev => [...prev, newMapping]);
  };

  const addCustomMetric = () => {
    const customId = `custom_${Date.now()}`;
    const newMapping: MetricMapping = {
      id: customId,
      name: '',
      columnLetter: '',
      isCustom: true
    };

    setMetricMappings(prev => [...prev, newMapping]);
  };

  const updateMetricMapping = (id: string, updates: Partial<MetricMapping>) => {
    setMetricMappings(prev => 
      prev.map(mapping => 
        mapping.id === id ? { ...mapping, ...updates } : mapping
      )
    );
  };

  const removeMetricMapping = (id: string) => {
    // Don't allow removing the date column
    if (id === 'date') return;
    
    setMetricMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const getAvailablePredefinedMetrics = () => {
    const mappedIds = metricMappings.map(m => m.id);
    return predefinedMetrics.filter(metric => !mappedIds.includes(metric.id));
  };

  const handleSaveConfig = async () => {
    // Validate required fields
    const dateMapping = metricMappings.find(m => m.id === 'date');
    if (!formData.spreadsheet_id || !formData.sheet_name || !dateMapping?.columnLetter) {
      toast({
        title: 'Validation Error',
        description: 'Please select a spreadsheet, sheet, and date column.',
        variant: 'destructive',
      });
      return;
    }

    // Validate custom metrics have names
    const customMetricsWithoutNames = metricMappings.filter(m => m.isCustom && (!m.name || !m.name.trim()));
    if (customMetricsWithoutNames.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide names for all custom metrics.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert metric mappings to config format
      const config: GoogleSheetsSyncConfig = {
        ...formData,
        date_column: dateMapping.columnLetter,
        custom_metrics: {},
        sync_frequency_minutes: autoSyncEnabled ? syncInterval * 60 : 0, // Convert hours to minutes
        is_active: autoSyncEnabled,
      } as GoogleSheetsSyncConfig;

      // Map predefined metrics
      metricMappings.forEach(mapping => {
        if (mapping.columnLetter && !mapping.isCustom && mapping.id !== 'date') {
          const fieldName = `${mapping.id}_column` as keyof GoogleSheetsSyncConfig;
          (config as any)[fieldName] = mapping.columnLetter;
        }
      });

      // Map custom metrics
      const customMetrics: { [key: string]: string } = {};
      metricMappings.forEach(mapping => {
        if (mapping.isCustom && mapping.name && mapping.columnLetter) {
          customMetrics[mapping.name] = mapping.columnLetter;
        }
      });
      config.custom_metrics = customMetrics;

      await saveSyncConfig(config);
      setIsEditMode(false);
      toast({
        title: 'Success',
        description: 'Configuration saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration.',
        variant: 'destructive',
      });
    }
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

  const startEditMode = () => {
    setIsEditMode(true);
    // Initialize with date mapping if not already present
    if (!metricMappings.find(m => m.id === 'date')) {
      setMetricMappings([
        {
          id: 'date',
          name: 'Date',
          columnLetter: formData.date_column || '',
          isCustom: false
        }
      ]);
    }
  };

  const handleManualSync = async () => {
    if (!syncConfig || !connection) {
      toast({
        title: 'Error',
        description: 'Configuration or connection missing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const service = getGoogleSheetsMetricsService(connection);
      
      // Prepare column mappings from current metric mappings
      const columnMappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } } = {};
      
      metricMappings.forEach(mapping => {
        if (mapping.columnLetter) {
          columnMappings[mapping.columnLetter] = {
            metricKey: mapping.id,
            metricName: mapping.name,
            isCustom: mapping.isCustom
          };
        }
      });

      // Determine which sheets to sync
      const sheetsToSync = [selectedSheetName];
      if (selectedSheets.size > 0) {
        sheetsToSync.push(...Array.from(selectedSheets).filter(sheet => sheet !== selectedSheetName));
      }

      let result;
      if (sheetsToSync.length === 1) {
        // Single sheet sync
        result = await service.syncSheetToProject(
          projectId,
          syncConfig.spreadsheet_id,
          selectedSheetName,
          columnMappings
        );
        
        toast({
          title: result.success ? 'Sync Complete' : 'Sync Failed',
          description: result.success 
            ? `Synced ${result.rows_processed} rows. ${result.inserted} inserted, ${result.updated} updated.`
            : result.error || 'Sync failed',
          variant: result.success ? 'default' : 'destructive',
        });
      } else {
        // Multiple sheets sync
        result = await service.syncMultipleSheetsToProject(
          projectId,
          syncConfig.spreadsheet_id,
          sheetsToSync,
          columnMappings
        );
        
        toast({
          title: result.success ? 'Multi-Sheet Sync Complete' : 'Sync Failed',
          description: result.success 
            ? `Synced ${result.total_rows_processed} total rows across ${result.sheet_results.length} sheets. ${result.total_inserted} inserted, ${result.total_updated} updated.`
            : result.error || 'Sync failed',
          variant: result.success ? 'default' : 'destructive',
        });
      }

      // Refresh data
      if (result.success) {
        await Promise.all([
          connectionQuery.refetch(),
          refetchConfig(),
          refetchMetrics(),
        ]);
      }
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast({
        title: 'Sync Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    // Reload from saved config
    if (syncConfig) {
      setFormData({
        ...syncConfig,
        custom_metrics: syncConfig.custom_metrics || {},
      });
    }
  };

  if (connectionQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Google Sheets Configuration
              </CardTitle>
              <CardDescription>
                Connect your Google Sheets with Meta Ads data
              </CardDescription>
            </div>
            {syncConfig && !isEditMode && (
              <Button onClick={startEditMode} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Account Connection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Google Account</Label>
            {connection ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{connection.user_email}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
                {isEditMode && (
                  <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
                {isConnecting ? (
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
            )}
          </div>

          {connection && (isEditMode || !syncConfig) && (
            <>
              <Separator />
              
              {/* Spreadsheet Selection */}
              <div>
                <Label htmlFor="spreadsheet" className="text-base font-semibold mb-3 block">
                  Select Spreadsheet
                </Label>
                <Select
                  value={formData.spreadsheet_id}
                  onValueChange={handleSpreadsheetSelect}
                  disabled={!connection || spreadsheetsQuery.isLoading}
                >
                  <SelectTrigger id="spreadsheet">
                    <SelectValue placeholder={spreadsheetsQuery.isLoading ? "Loading spreadsheets..." : "Choose a spreadsheet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {spreadsheetsQuery.data?.map((spreadsheet) => (
                      <SelectItem key={spreadsheet.id} value={spreadsheet.id}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>{spreadsheet.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sheet Selection */}
              {spreadsheetDetails && (
                <div>
                  <Label htmlFor="sheet" className="text-base font-semibold mb-3 block">
                    Select Sheet(s)
                  </Label>
                  
                  {/* Primary sheet for preview */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Primary sheet (for data preview)</Label>
                      <Select
                        value={selectedSheetName}
                        onValueChange={handleSheetSelect}
                      >
                        <SelectTrigger id="sheet">
                          <SelectValue placeholder="Choose primary sheet" />
                        </SelectTrigger>
                        <SelectContent>
                          {spreadsheetDetails.sheets.map((sheet) => (
                            <SelectItem key={sheet.sheetId} value={sheet.title}>
                              <div className="flex items-center gap-2">
                                <Table className="h-4 w-4" />
                                <span>{sheet.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Multiple sheet selection */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">Additional sheets to sync</Label>
                      <div className="space-y-2">
                        {spreadsheetDetails.sheets.map((sheet) => (
                          <div key={sheet.sheetId} className="flex items-center space-x-2">
                            <Switch
                              id={`sheet-${sheet.sheetId}`}
                              checked={selectedSheets.has(sheet.title) || sheet.title === selectedSheetName}
                              onCheckedChange={(checked) => {
                                if (sheet.title !== selectedSheetName) {
                                  handleMultipleSheetToggle(sheet.title, checked);
                                }
                              }}
                              disabled={sheet.title === selectedSheetName}
                            />
                            <Label htmlFor={`sheet-${sheet.sheetId}`} className="text-sm">
                              {sheet.title}
                              {sheet.title === selectedSheetName && (
                                <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {selectedSheetName && previewData.length > 0 && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">Data Preview</Label>
                  {isLoadingPreview ? (
                    <div className="flex justify-center py-8 border rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {columnHeaders.map((header, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {getColumnLetter(i)}
                                    </span>
                                    <span className="font-normal">{header || '-'}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.slice(1, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-t">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 border-r">
                                    {cell || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Column Mapping */}
              {selectedSheetName && columnHeaders.length > 0 && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">Column Mapping</Label>
                  
                  {/* Current mappings */}
                  <div className="space-y-3">
                    {metricMappings.map((mapping) => (
                      <div key={mapping.id} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Metric Name */}
                            <div className="space-y-2">
                              <Label className="text-sm">
                                Metric Name {mapping.id === 'date' && '*'}
                              </Label>
                              {mapping.isCustom ? (
                                <Input
                                  placeholder="Enter metric name"
                                  value={mapping.name}
                                  onChange={(e) => updateMetricMapping(mapping.id, { name: e.target.value })}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{mapping.name}</span>
                                  {mapping.id === 'date' && (
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Column Selection */}
                            <div className="space-y-2">
                              <Label className="text-sm">Column</Label>
                              <Select
                                value={mapping.columnLetter}
                                onValueChange={(value) => {
                                  updateMetricMapping(mapping.id, { columnLetter: value });
                                  if (mapping.id === 'date') {
                                    setFormData({ ...formData, date_column: value });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getColumnOptions().map((option) => (
                                    <SelectItem key={option.letter} value={option.letter}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-medium">{option.letter}</span>
                                        <span className="text-muted-foreground">
                                          {option.header}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Remove button */}
                          {mapping.id !== 'date' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMetricMapping(mapping.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add metrics section */}
                  <div className="mt-6 space-y-4">
                    {/* Add predefined metrics */}
                    {getAvailablePredefinedMetrics().length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Add Predefined Metrics</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getAvailablePredefinedMetrics().map((metric) => (
                            <Button
                              key={metric.id}
                              variant="outline"
                              size="sm"
                              onClick={() => addPredefinedMetric(metric.id)}
                              className="text-sm"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {metric.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add custom metric */}
                    <div>
                      <Label className="text-sm font-medium">Add Custom Metric</Label>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addCustomMetric}
                          className="text-sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Custom Metric
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Sync Settings */}
              {selectedSheetName && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">Auto-Sync Settings</Label>
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto-sync-toggle" className="text-sm font-medium">
                          Enable Auto-Sync
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically sync data at regular intervals
                        </p>
                      </div>
                      <Switch
                        id="auto-sync-toggle"
                        checked={autoSyncEnabled}
                        onCheckedChange={setAutoSyncEnabled}
                      />
                    </div>
                    
                    {autoSyncEnabled && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sync Interval</Label>
                        <Select
                          value={syncInterval.toString()}
                          onValueChange={(value) => setSyncInterval(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sync frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {syncIntervalOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {autoSyncEnabled && `Data will be synced ${syncIntervalOptions.find(o => o.value === syncInterval)?.label.toLowerCase()}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {isEditMode && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveConfig} disabled={!selectedSheetName || metricMappings.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                  <Button variant="outline" onClick={cancelEditMode}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Configured State */}
          {syncConfig && !isEditMode && (
            <div className="space-y-4">
              <Separator />
              
              {/* Configuration Summary */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Spreadsheet</p>
                    <p className="text-sm text-muted-foreground">{selectedSpreadsheet?.name || syncConfig.spreadsheet_id}</p>
                  </div>
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Sheet</p>
                    <p className="text-sm text-muted-foreground">{syncConfig.sheet_name}</p>
                  </div>
                  <Table className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Mapped Metrics</p>
                  <div className="flex flex-wrap gap-2">
                    {metricMappings.map((mapping) => (
                      <Badge key={mapping.id} variant="secondary">
                        {mapping.name} → {mapping.columnLetter}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Auto-sync status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Auto-Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {syncConfig.is_active && syncConfig.sync_frequency_minutes > 0 
                        ? `${syncIntervalOptions.find(o => o.value === Math.ceil(syncConfig.sync_frequency_minutes / 60))?.label || 'Custom interval'}`
                        : 'Disabled'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {syncConfig.is_active && syncConfig.sync_frequency_minutes > 0 ? (
                      <>
                        <Zap className="h-4 w-4 text-green-600" />
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
                    )}
                  </div>
                </div>

                {/* Multiple sheets status */}
                {(selectedSheets.size > 0 || selectedSheetName) && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-2">Sheets to Sync</p>
                    <div className="space-y-1">
                      {selectedSheetName && (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">{selectedSheetName}</Badge>
                          <span className="text-xs text-muted-foreground">Primary</span>
                        </div>
                      )}
                      {Array.from(selectedSheets).filter(sheet => sheet !== selectedSheetName).map(sheet => (
                        <div key={sheet} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{sheet}</Badge>
                          <span className="text-xs text-muted-foreground">Additional</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Actions */}
              <div className="flex items-center justify-between">
                <div>
                  {syncConfig.last_sync_at && (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {format(new Date(syncConfig.last_sync_at), 'PPp')}
                    </p>
                  )}
                </div>
                <Button onClick={() => handleManualSync()} disabled={isSyncing}>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Data */}
      {hasMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Synced Metrics</CardTitle>
            <CardDescription>
              Data from your Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Spend
                </div>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotals().totalSpend)}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MousePointerClick className="h-4 w-4" />
                  Total Clicks
                </div>
                <p className="text-2xl font-bold">{formatNumber(calculateTotals().totalClicks)}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Avg. CPC
                </div>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotals().avgCPC)}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  Avg. CTR
                </div>
                <p className="text-2xl font-bold">{calculateTotals().avgCTR.toFixed(2)}%</p>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Clicks</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Spend</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">CTR</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">CPC</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">CPM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.slice(0, 10).map((metric, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(metric.date), 'PP')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatNumber(metric.outbound_clicks || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatCurrency(metric.amount_spent || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(metric.outbound_ctr || 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatCurrency(metric.cpc || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatCurrency(metric.cpm || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}