import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ChevronRight,
  Table,
  Calendar,
  BarChart3,
  Plus,
  Trash2
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

type SetupStep = 'connect' | 'select-spreadsheet' | 'select-sheet' | 'map-columns' | 'configure';

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

export default function GoogleSheetsOAuthSync({ projectId, projectName }: GoogleSheetsOAuthSyncProps) {
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
  const [currentStep, setCurrentStep] = useState<SetupStep>('connect');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<ProjectGoogleConnection | null>(null);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSpreadsheet | null>(null);
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<GoogleSpreadsheetDetails | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [metricMappings, setMetricMappings] = useState<MetricMapping[]>([]);
  
  const [formData, setFormData] = useState<Partial<GoogleSheetsSyncConfig>>({
    project_id: projectId,
    spreadsheet_id: '',
    sheet_name: '',
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
  } = useGoogleSheetsMetrics(projectId);

  useEffect(() => {
    if (connectionQuery.data) {
      setConnection(connectionQuery.data);
      if (syncConfig) {
        setCurrentStep('configure');
      } else {
        setCurrentStep('select-spreadsheet');
      }
    }
  }, [connectionQuery.data, syncConfig]);

  useEffect(() => {
    if (syncConfig) {
      setFormData(syncConfig);
      if (syncConfig.spreadsheet_id) {
        const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === syncConfig.spreadsheet_id);
        if (spreadsheet) {
          setSelectedSpreadsheet(spreadsheet);
        }
      }
    }
  }, [syncConfig, spreadsheetsQuery.data]);

  const handleConnect = () => {
    setIsConnecting(true);
    const authUrl = GoogleOAuthService.getAuthorizationUrl(projectId);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      try {
        await GoogleOAuthService.disconnectConnection(projectId);
        setConnection(null);
        setCurrentStep('connect');
        connectionQuery.refetch();
        toast({
          title: 'Disconnected',
          description: 'Google Sheets account has been disconnected.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to disconnect Google account.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSpreadsheetSelect = async (spreadsheet: GoogleSpreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setFormData({ ...formData, spreadsheet_id: spreadsheet.id });
    
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(spreadsheet.id, accessToken);
      setSpreadsheetDetails(details);
      setCurrentStep('select-sheet');
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
    
    // Get preview data
    try {
      if (!connection || !selectedSpreadsheet) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const range = `${sheetName}!A1:Z10`; // Preview first 10 rows, up to column Z
      const rows = await GoogleOAuthService.getSheetData(selectedSpreadsheet.id, range, accessToken);
      setPreviewData(rows);
      
      // Extract column headers (first row) and generate column letters
      if (rows.length > 0) {
        const headers = rows[0] || [];
        setColumnHeaders(headers);
        
        // Initialize with Date column mapping (required)
        setMetricMappings([
          {
            id: 'date',
            name: 'Date',
            columnLetter: '',
            isCustom: false
          }
        ]);
      }
      
      setCurrentStep('map-columns');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get sheet preview.',
        variant: 'destructive',
      });
    }
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
      setCurrentStep('configure');
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

  if (connectionQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={hasMetrics ? "data" : "setup"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasMetrics}>Data</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          {/* Progress Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Google Sheets Setup
              </CardTitle>
              <CardDescription>
                Connect your Google account and configure spreadsheet sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'connect' ? 'bg-blue-100 text-blue-600' : 
                    connection ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {connection ? <CheckCircle className="h-4 w-4" /> : '1'}
                  </div>
                  <span className="text-sm">Connect Google</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'select-spreadsheet' ? 'bg-blue-100 text-blue-600' : 
                    selectedSpreadsheet ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {selectedSpreadsheet ? <CheckCircle className="h-4 w-4" /> : '2'}
                  </div>
                  <span className="text-sm">Select Sheet</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'map-columns' || currentStep === 'configure' ? 'bg-blue-100 text-blue-600' : 
                    syncConfig ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {syncConfig ? <CheckCircle className="h-4 w-4" /> : '3'}
                  </div>
                  <span className="text-sm">Configure</span>
                </div>
              </div>

              {/* Step Content */}
              {currentStep === 'connect' && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connect your Google account to access your spreadsheets. This requires view-only permission.
                    </AlertDescription>
                  </Alert>
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
                </div>
              )}

              {currentStep === 'select-spreadsheet' && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Connected as {connection?.user_email}
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="font-medium mb-3">Select Your Meta Ads Spreadsheet</h4>
                    {spreadsheetsQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : spreadsheetsQuery.data && spreadsheetsQuery.data.length > 0 ? (
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {spreadsheetsQuery.data.map((spreadsheet) => (
                          <div
                            key={spreadsheet.id}
                            className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                              selectedSpreadsheet?.id === spreadsheet.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => handleSpreadsheetSelect(spreadsheet)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium">{spreadsheet.name}</h5>
                                <p className="text-xs text-muted-foreground">
                                  Modified: {format(new Date(spreadsheet.modifiedTime), 'PPp')}
                                </p>
                              </div>
                              <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No spreadsheets found. Make sure you have Google Sheets in your Drive.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('connect')}>
                      Back
                    </Button>
                    <Button onClick={handleDisconnect} variant="destructive">
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 'select-sheet' && spreadsheetDetails && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Selected spreadsheet: <strong>{spreadsheetDetails.properties.title}</strong>
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="font-medium mb-3">Select Sheet Tab</h4>
                    <div className="grid gap-2">
                      {spreadsheetDetails.sheets.map((sheet) => (
                        <div
                          key={sheet.sheetId}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                            selectedSheetName === sheet.title ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleSheetSelect(sheet.title)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium">{sheet.title}</h5>
                              <p className="text-xs text-muted-foreground">
                                {sheet.gridProperties.rowCount} rows × {sheet.gridProperties.columnCount} columns
                              </p>
                            </div>
                            <Table className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => setCurrentStep('select-spreadsheet')}>
                    Back
                  </Button>
                </div>
              )}

              {currentStep === 'map-columns' && (
                <div className="space-y-6">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Sheet: <strong>{selectedSheetName}</strong> from <strong>{selectedSpreadsheet?.name}</strong>
                    </AlertDescription>
                  </Alert>

                  {/* Preview Data */}
                  {previewData.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Data Preview</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                {Array.from({ length: Math.max(...previewData.map(row => row.length)) }, (_, i) => (
                                  <th key={i} className="px-3 py-2 text-left font-medium">
                                    {String.fromCharCode(65 + i)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.slice(0, 5).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t">
                                  {Array.from({ length: Math.max(...previewData.map(r => r.length)) }, (_, colIndex) => (
                                    <td key={colIndex} className="px-3 py-2 border-r">
                                      {row[colIndex] || ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Column Mapping */}
                  <div>
                    <h4 className="font-medium mb-4">Map Your Columns</h4>
                    
                    {/* Current mappings */}
                    <div className="space-y-4">
                      {metricMappings.map((mapping) => (
                        <div key={mapping.id} className="border rounded-lg p-4 bg-muted/50">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Metric Name */}
                              <div className="space-y-2">
                                <Label>
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
                                <Label>Column</Label>
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

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('select-sheet')}>
                      Back
                    </Button>
                    <Button onClick={handleSaveConfig}>
                      <Settings className="h-4 w-4 mr-2" />
                      Save & Continue
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 'configure' && syncConfig && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Configuration saved! Your Google Sheets sync is ready.
                      {syncConfig.last_sync_at && (
                        <span className="block text-sm mt-1">
                          Last synced: {format(new Date(syncConfig.last_sync_at), 'PPp')}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Spreadsheet</span>
                        <span className="text-sm font-medium">{selectedSpreadsheet?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sheet</span>
                        <span className="text-sm font-medium">{syncConfig.sheet_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sync Frequency</span>
                        <span className="text-sm font-medium">{syncConfig.sync_frequency_minutes} minutes</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={syncConfig.last_sync_status === 'success' ? 'default' : 'destructive'}>
                          {syncConfig.last_sync_status || 'Ready'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => syncMetrics()}
                      disabled={isSyncing}
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
                    <Button variant="outline" onClick={() => setCurrentStep('map-columns')}>
                      Edit Configuration
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect}>
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
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
                    Synced data from {selectedSpreadsheet?.name}
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
      </Tabs>
    </div>
  );
}