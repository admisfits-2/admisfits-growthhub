import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  CheckCircle, 
  AlertCircle, 
  Loader2,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Settings,
  Table,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Zap,
  FolderPlus,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  FileText
} from 'lucide-react';
import { GoogleOAuthService, GoogleSpreadsheet, GoogleSpreadsheetDetails, ProjectGoogleConnection } from '@/lib/services/googleOAuthService';
import { 
  getGoogleSheetsMetricsService, 
  GoogleSheetsSyncConfig, 
  MultiSpreadsheetSyncConfig,
  SpreadsheetConfig
} from '@/lib/services/googleSheetsMetricsService';
import { useGoogleSheetsMetrics } from '@/hooks/useGoogleSheetsMetrics';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GoogleSheetsOAuthSyncV4Props {
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
  fieldName: string;
}

export default function GoogleSheetsOAuthSyncV4({ projectId, projectName }: GoogleSheetsOAuthSyncV4Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Record type options for individual records mode
  const recordTypeOptions = [
    { value: 'sale', label: 'Sales', description: 'Individual sales transactions' },
    { value: 'lead', label: 'Leads', description: 'Lead generation records' },
    { value: 'call', label: 'Calls', description: 'Phone call records' },
    { value: 'appointment', label: 'Appointments', description: 'Scheduled appointments' },
    { value: 'conversion', label: 'Conversions', description: 'Conversion events' },
    { value: 'custom', label: 'Custom', description: 'Custom record type' },
  ];

  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<ProjectGoogleConnection | null>(null);
  const [multiConfig, setMultiConfig] = useState<MultiSpreadsheetSyncConfig | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(24); // hours
  
  // Add/Edit spreadsheet dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSpreadsheet, setEditingSpreadsheet] = useState<SpreadsheetConfig | null>(null);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSpreadsheet | null>(null);
  const [spreadsheetSearchQuery, setSpreadsheetSearchQuery] = useState('');
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<GoogleSpreadsheetDetails | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [metricMappings, setMetricMappings] = useState<MetricMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedSpreadsheets, setExpandedSpreadsheets] = useState<Set<string>>(new Set());
  
  // Per-spreadsheet sync mode state (for add/edit dialogs)
  const [currentSpreadsheetSyncMode, setCurrentSpreadsheetSyncMode] = useState<'daily_aggregate' | 'individual_records'>('daily_aggregate');
  const [currentRecordType, setCurrentRecordType] = useState('sale');
  const [currentUniqueIdMapping, setCurrentUniqueIdMapping] = useState<MetricMapping | null>(null);
  const [currentAmountMapping, setCurrentAmountMapping] = useState<MetricMapping | null>(null);
  const [currentStatusMapping, setCurrentStatusMapping] = useState<MetricMapping | null>(null);

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
    hasMetrics,
    refetchConfig,
    refetchMetrics,
  } = useGoogleSheetsMetrics(projectId);

  // Filter spreadsheets based on search query
  const filteredSpreadsheets = React.useMemo(() => {
    if (!spreadsheetsQuery.data) return [];
    if (!spreadsheetSearchQuery.trim()) return spreadsheetsQuery.data;
    
    const query = spreadsheetSearchQuery.toLowerCase();
    return spreadsheetsQuery.data.filter(spreadsheet => 
      spreadsheet.name.toLowerCase().includes(query) ||
      spreadsheet.owners?.some(owner => 
        owner.displayName?.toLowerCase().includes(query) ||
        owner.emailAddress?.toLowerCase().includes(query)
      )
    );
  }, [spreadsheetsQuery.data, spreadsheetSearchQuery]);

  useEffect(() => {
    if (connectionQuery.data) {
      setConnection(connectionQuery.data);
    }
  }, [connectionQuery.data]);

  // Load multi-spreadsheet configuration and handle legacy single configs
  useEffect(() => {
    const loadConfigs = async () => {
      if (!connection) return;
      
      try {
        const service = getGoogleSheetsMetricsService(connection);
        
        // First, try to load multi-spreadsheet config
        let config = await service.getMultiSpreadsheetConfig(projectId);
        
        // If no multi-config exists, check for legacy single config and migrate
        if (!config && syncConfig && syncConfig.spreadsheet_id && syncConfig.spreadsheet_id !== 'multi-spreadsheet') {
          
          // Convert legacy config to multi-config format
          const columnMappings: { [columnLetter: string]: { metricKey: string; metricName: string; isCustom: boolean; } } = {};
          
          // Map date column
          if (syncConfig.date_column) {
            columnMappings[syncConfig.date_column] = {
              metricKey: 'date',
              metricName: 'Date',
              isCustom: false
            };
          }
          
          // Map predefined metrics
          const predefinedFields = [
            'outbound_clicks_column', 'amount_spent_column', 'outbound_ctr_column',
            'cpm_column', 'cpc_column', 'impressions_column', 'reach_column',
            'frequency_column', 'conversions_column', 'conversion_rate_column',
            'cost_per_conversion_column', 'revenue_column', 'roas_column'
          ];
          
          predefinedFields.forEach(field => {
            const column = (syncConfig as any)[field];
            if (column) {
              const metricKey = field.replace('_column', '');
              const metricName = predefinedMetrics.find(m => m.id === metricKey)?.name || metricKey;
              columnMappings[column] = {
                metricKey,
                metricName,
                isCustom: false
              };
            }
          });
          
          // Map custom metrics
          if (syncConfig.custom_metrics) {
            Object.entries(syncConfig.custom_metrics).forEach(([name, column]) => {
              columnMappings[column as string] = {
                metricKey: `custom_${name}`,
                metricName: name,
                isCustom: true
              };
            });
          }
          
          // Get spreadsheet name
          const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === syncConfig.spreadsheet_id);
          const spreadsheetName = spreadsheet?.name || syncConfig.spreadsheet_id;
          
          // Create multi-config from legacy config
          config = {
            project_id: projectId,
            spreadsheets: [{
              id: `migrated_${Date.now()}`,
              spreadsheet_id: syncConfig.spreadsheet_id,
              spreadsheet_name: spreadsheetName,
              sheets: [syncConfig.sheet_name],
              column_mappings: columnMappings,
              is_active: syncConfig.is_active,
            }],
            auto_sync_enabled: syncConfig.is_active && syncConfig.sync_frequency_minutes > 0,
            sync_frequency_minutes: syncConfig.sync_frequency_minutes || 0,
            last_sync_at: syncConfig.last_sync_at,
            last_sync_status: syncConfig.last_sync_status,
            last_sync_error: syncConfig.last_sync_error,
          };
          
          // Save the migrated config
          await service.saveMultiSpreadsheetConfig(config);
        }
        
        if (config) {
          setMultiConfig(config);
          setAutoSyncEnabled(config.auto_sync_enabled);
          setSyncInterval(Math.max(1, Math.ceil(config.sync_frequency_minutes / 60)));
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    if (connection && syncConfig !== undefined) {
      loadConfigs();
    }
  }, [connection, projectId, syncConfig, spreadsheetsQuery.data]);


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
    } catch (error) {
      console.error('Failed to load spreadsheet details:', error);
    }
  };

  const loadSheetPreview = async (spreadsheetId: string, sheetName: string) => {
    setIsLoadingPreview(true);
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      
      // Get more rows to analyze the sheet structure and detect frozen headers
      const range = `${sheetName}!A1:Z20`; // Get first 20 rows to detect headers
      const data = await GoogleOAuthService.getSheetData(spreadsheetId, range, accessToken);
      
      if (!data || data.length === 0) {
        setPreviewData([]);
        setColumnHeaders([]);
        return;
      }

      // Find the actual header row by detecting frozen/category rows
      let headerRowIndex = 0;
      let dataStartIndex = 1;

      // Look for the first row that has multiple non-empty cells and looks like data headers
      for (let i = 0; i < Math.min(data.length, 6); i++) {
        const row = data[i];
        const nonEmptyCells = row.filter(cell => cell && cell.toString().trim() !== '').length;
        
        // Skip rows with very few cells (likely category headers)
        if (nonEmptyCells < 3) continue;
        
        // Check if this row looks like data headers
        const cellsAsString = row.map(cell => (cell || '').toString().toLowerCase());
        const hasDataLikeHeaders = cellsAsString.some(cell => 
          cell.includes('date') || cell.includes('time') || cell.includes('name') ||
          cell.includes('status') || cell.includes('amount') || cell.includes('value') ||
          cell.includes('id') || cell.includes('call') || cell.includes('client') ||
          cell.includes('lead') || cell.includes('sales') || cell.includes('scheduled')
        );
        
        // If next row exists, check if it has actual data (dates, numbers, etc.)
        if (i + 1 < data.length) {
          const nextRow = data[i + 1];
          const hasDateLikeData = nextRow.some(cell => {
            const cellStr = cell?.toString() || '';
            return cellStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                   cellStr.match(/\d{4}-\d{1,2}-\d{1,2}/) ||
                   cellStr.includes('/');
          });
          
          const hasNumericData = nextRow.some(cell => {
            const cellStr = cell?.toString() || '';
            return !isNaN(parseFloat(cellStr)) && cellStr.trim() !== '';
          });

          // If this row has header-like content and next row has data, we found our headers
          if ((hasDataLikeHeaders || nonEmptyCells >= 5) && (hasDateLikeData || hasNumericData)) {
            headerRowIndex = i;
            dataStartIndex = i + 1;
            break;
          }
        } else if (hasDataLikeHeaders || (i === 0 && nonEmptyCells >= 5)) {
          // If this is the last row we're checking and it looks like headers
          headerRowIndex = i;
          dataStartIndex = i + 1;
          break;
        }
      }

      // Extract headers from the detected header row
      const headers = data[headerRowIndex]?.map((header, index) => {
        const headerStr = header?.toString().trim() || '';
        return headerStr || String.fromCharCode(65 + index); // Use A, B, C... if header is empty
      }) || [];

      setColumnHeaders(headers);
      
      // Set preview data starting from the header row (include header + data rows)
      const previewData = data.slice(headerRowIndex);
      setPreviewData(previewData.slice(0, 10)); // Limit to 10 rows for preview
      
      console.log(`Detected header row at index ${headerRowIndex} for sheet ${sheetName}:`, headers);
      
    } catch (error) {
      console.error('Failed to load sheet preview:', error);
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
    
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(spreadsheet.id, accessToken);
      setSpreadsheetDetails(details);
      
      // Auto-select first sheet and load preview
      if (details.sheets.length > 0) {
        const firstSheet = details.sheets[0].title;
        setSelectedSheets(new Set([firstSheet]));
        await loadSheetPreview(spreadsheet.id, firstSheet);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get spreadsheet details.',
        variant: 'destructive',
      });
    }
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

  const handleAddSpreadsheet = async () => {
    if (!selectedSpreadsheet || !connection || selectedSheets.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a spreadsheet and at least one sheet.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that date column is mapped
    const dateMapping = metricMappings.find(m => m.id === 'date');
    if (!dateMapping?.columnLetter) {
      toast({
        title: 'Validation Error',
        description: 'Please map the date column.',
        variant: 'destructive',
      });
      return;
    }

    // Validate individual records mode configuration
    if (!validateCurrentSpreadsheetConfig()) {
      return;
    }

    try {
      // Convert metric mappings to column mappings format
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

      const newSpreadsheetConfig: SpreadsheetConfig = {
        id: `spreadsheet_${Date.now()}`,
        spreadsheet_id: selectedSpreadsheet.id,
        spreadsheet_name: selectedSpreadsheet.name,
        sheets: Array.from(selectedSheets),
        column_mappings: columnMappings,
        is_active: true,
        // Per-spreadsheet sync mode configuration
        sync_mode: currentSpreadsheetSyncMode,
        unique_id_column: currentUniqueIdMapping?.columnLetter || undefined,
        record_type: currentRecordType,
        amount_column: currentAmountMapping?.columnLetter || undefined,
        status_column: currentStatusMapping?.columnLetter || undefined,
        auto_aggregate: false,
      };

      // Update or create multi-config
      const updatedConfig: MultiSpreadsheetSyncConfig = {
        ...(multiConfig || {
          project_id: projectId,
          spreadsheets: [],
          auto_sync_enabled: false,
          sync_frequency_minutes: 24 * 60,
        }),
        spreadsheets: [
          ...(multiConfig?.spreadsheets || []),
          newSpreadsheetConfig
        ],
      };

      const service = getGoogleSheetsMetricsService(connection);
      await service.saveMultiSpreadsheetConfig(updatedConfig);
      setMultiConfig(updatedConfig);

      // Reset form
      setSelectedSpreadsheet(null);
      setSpreadsheetDetails(null);
      setSelectedSheets(new Set());
      setMetricMappings([]);
      setPreviewData([]);
      setColumnHeaders([]);
      setCurrentSpreadsheetSyncMode('daily_aggregate');
      setCurrentRecordType('sale');
      setCurrentUniqueIdMapping(null);
      setCurrentAmountMapping(null);
      setCurrentStatusMapping(null);
      setIsAddDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Spreadsheet configuration added successfully.',
      });
    } catch (error) {
      console.error('Error adding spreadsheet configuration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add spreadsheet configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSpreadsheet = async (spreadsheetId: string) => {
    if (!multiConfig || !connection) return;

    try {
      const updatedConfig: MultiSpreadsheetSyncConfig = {
        ...multiConfig,
        spreadsheets: multiConfig.spreadsheets.filter(s => s.spreadsheet_id !== spreadsheetId),
      };

      const service = getGoogleSheetsMetricsService(connection);
      await service.saveMultiSpreadsheetConfig(updatedConfig);
      setMultiConfig(updatedConfig);

      toast({
        title: 'Success',
        description: 'Spreadsheet configuration removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove spreadsheet configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSpreadsheet = async (spreadsheetConfig: SpreadsheetConfig) => {
    setEditingSpreadsheet(spreadsheetConfig);
    
    // Load spreadsheet details
    try {
      if (!connection) return;
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(spreadsheetConfig.spreadsheet_id, accessToken);
      setSpreadsheetDetails(details);
      
      // Set up the form with existing data
      const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === spreadsheetConfig.spreadsheet_id);
      setSelectedSpreadsheet(spreadsheet || {
        id: spreadsheetConfig.spreadsheet_id,
        name: spreadsheetConfig.spreadsheet_name
      } as GoogleSpreadsheet);
      
      setSelectedSheets(new Set(spreadsheetConfig.sheets));
      
      // Convert column mappings back to metric mappings
      const mappings: MetricMapping[] = [];
      Object.entries(spreadsheetConfig.column_mappings).forEach(([columnLetter, mapping]) => {
        mappings.push({
          id: mapping.metricKey,
          name: mapping.metricName,
          columnLetter,
          isCustom: mapping.isCustom
        });
      });
      setMetricMappings(mappings);
      
      // Load existing sync mode configuration
      setCurrentSpreadsheetSyncMode(spreadsheetConfig.sync_mode || 'daily_aggregate');
      setCurrentRecordType(spreadsheetConfig.record_type || 'sale');
      
      // Load existing column mappings for sync mode
      if (spreadsheetConfig.unique_id_column) {
        setCurrentUniqueIdMapping({
          id: 'unique_id',
          name: 'Unique ID',
          columnLetter: spreadsheetConfig.unique_id_column,
          isCustom: false
        });
      } else {
        setCurrentUniqueIdMapping(null);
      }
      
      if (spreadsheetConfig.amount_column) {
        setCurrentAmountMapping({
          id: 'amount',
          name: 'Amount',
          columnLetter: spreadsheetConfig.amount_column,
          isCustom: false
        });
      } else {
        setCurrentAmountMapping(null);
      }
      
      if (spreadsheetConfig.status_column) {
        setCurrentStatusMapping({
          id: 'status',
          name: 'Status',
          columnLetter: spreadsheetConfig.status_column,
          isCustom: false
        });
      } else {
        setCurrentStatusMapping(null);
      }
      
      // Load preview for first sheet
      if (spreadsheetConfig.sheets.length > 0) {
        await loadSheetPreview(spreadsheetConfig.spreadsheet_id, spreadsheetConfig.sheets[0]);
      }
      
      setIsEditDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load spreadsheet for editing.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSpreadsheet = async () => {
    if (!selectedSpreadsheet || !connection || !editingSpreadsheet || selectedSheets.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a spreadsheet and at least one sheet.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that date column is mapped
    const dateMapping = metricMappings.find(m => m.id === 'date');
    if (!dateMapping?.columnLetter) {
      toast({
        title: 'Validation Error',
        description: 'Please map the date column.',
        variant: 'destructive',
      });
      return;
    }

    // Validate individual records mode configuration
    if (!validateCurrentSpreadsheetConfig()) {
      return;
    }

    try {
      // Check if this is a legacy config update
      if (editingSpreadsheet.id === 'legacy_config') {
        // Update the legacy configuration directly
        const updatedConfig: GoogleSheetsSyncConfig = {
          ...syncConfig!,
          spreadsheet_id: selectedSpreadsheet.id,
          sheet_name: Array.from(selectedSheets)[0], // For legacy, use first sheet
          date_column: dateMapping.columnLetter,
          is_active: autoSyncEnabled,
          sync_frequency_minutes: autoSyncEnabled ? syncInterval * 60 : 0,
          // Add sync mode configuration
          sync_mode: currentSpreadsheetSyncMode,
          unique_id_column: currentUniqueIdMapping?.columnLetter || undefined,
          record_type: currentRecordType,
          amount_column: currentAmountMapping?.columnLetter || undefined,
          status_column: currentStatusMapping?.columnLetter || undefined,
          auto_aggregate: false,
        };

        // Clear existing metric columns
        const fieldsToReset = [
          'outbound_clicks_column', 'amount_spent_column', 'outbound_ctr_column',
          'cpm_column', 'cpc_column', 'impressions_column', 'reach_column',
          'frequency_column', 'conversions_column', 'conversion_rate_column',
          'cost_per_conversion_column', 'revenue_column', 'roas_column'
        ];
        fieldsToReset.forEach(field => {
          (updatedConfig as any)[field] = undefined;
        });

        // Map predefined metrics back to legacy format
        metricMappings.forEach(mapping => {
          if (!mapping.isCustom && mapping.id !== 'date' && mapping.columnLetter) {
            const fieldName = `${mapping.id}_column`;
            (updatedConfig as any)[fieldName] = mapping.columnLetter;
          }
        });

        // Map custom metrics
        const customMetrics: { [key: string]: string } = {};
        metricMappings.forEach(mapping => {
          if (mapping.isCustom && mapping.name && mapping.columnLetter) {
            customMetrics[mapping.name] = mapping.columnLetter;
          }
        });
        updatedConfig.custom_metrics = customMetrics;

        // Save using the legacy hook
        await saveSyncConfig(updatedConfig);
        
        toast({
          title: 'Success',
          description: 'Configuration updated successfully.',
        });
      } else {
        // This is a multi-config update
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

        const updatedSpreadsheetConfig: SpreadsheetConfig = {
          ...editingSpreadsheet,
          spreadsheet_name: selectedSpreadsheet.name,
          sheets: Array.from(selectedSheets),
          column_mappings: columnMappings,
          // Per-spreadsheet sync mode configuration
          sync_mode: currentSpreadsheetSyncMode,
          unique_id_column: currentUniqueIdMapping?.columnLetter || undefined,
          record_type: currentRecordType,
          amount_column: currentAmountMapping?.columnLetter || undefined,
          status_column: currentStatusMapping?.columnLetter || undefined,
          auto_aggregate: false,
        };

        // Update multi-config
        const updatedConfig: MultiSpreadsheetSyncConfig = {
          ...multiConfig!,
          spreadsheets: multiConfig!.spreadsheets.map(s => 
            s.id === editingSpreadsheet.id ? updatedSpreadsheetConfig : s
          ),
        };

        const service = getGoogleSheetsMetricsService(connection);
        await service.saveMultiSpreadsheetConfig(updatedConfig);
        setMultiConfig(updatedConfig);

        toast({
          title: 'Success',
          description: 'Spreadsheet configuration updated successfully.',
        });
      }

      // Reset form
      setEditingSpreadsheet(null);
      setSelectedSpreadsheet(null);
      setSpreadsheetDetails(null);
      setSelectedSheets(new Set());
      setMetricMappings([]);
      setPreviewData([]);
      setSpreadsheetSearchQuery('');
      setColumnHeaders([]);
      setCurrentSpreadsheetSyncMode('daily_aggregate');
      setCurrentRecordType('sale');
      setCurrentUniqueIdMapping(null);
      setCurrentAmountMapping(null);
      setCurrentStatusMapping(null);
      setIsEditDialogOpen(false);

      // Refresh data
      await Promise.all([
        connectionQuery.refetch(),
        refetchConfig(),
        refetchMetrics(),
      ]);

    } catch (error) {
      console.error('Error updating configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAutoSyncSettings = async () => {
    if (!multiConfig || !connection) return;

    try {
      const updatedConfig: MultiSpreadsheetSyncConfig = {
        ...multiConfig,
        auto_sync_enabled: autoSyncEnabled,
        sync_frequency_minutes: autoSyncEnabled ? syncInterval * 60 : 0,
      };

      const service = getGoogleSheetsMetricsService(connection);
      await service.saveMultiSpreadsheetConfig(updatedConfig);
      setMultiConfig(updatedConfig);

      toast({
        title: 'Success',
        description: 'Auto-sync settings saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save auto-sync settings.',
        variant: 'destructive',
      });
    }
  };

  const handleManualSync = async () => {
    if (!multiConfig || !connection) {
      toast({
        title: 'Error',
        description: 'Configuration or connection missing.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const service = getGoogleSheetsMetricsService(connection);
      const result = await service.syncMultipleSpreadsheets(projectId, multiConfig);
      
      toast({
        title: result.success ? 'Multi-Spreadsheet Sync Complete' : 'Sync Failed',
        description: result.success 
          ? `Synced ${result.total_rows_processed} total rows across ${result.spreadsheet_results.length} spreadsheets. ${result.total_inserted} inserted, ${result.total_updated} updated.`
          : result.error || 'Sync failed',
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast({
        title: 'Sync Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const initializeMetricMappings = () => {
    setMetricMappings([
      {
        id: 'date',
        name: 'Date',
        columnLetter: '',
        isCustom: false
      }
    ]);
  };

  const toggleSpreadsheetExpanded = (spreadsheetId: string) => {
    setExpandedSpreadsheets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spreadsheetId)) {
        newSet.delete(spreadsheetId);
      } else {
        newSet.add(spreadsheetId);
      }
      return newSet;
    });
  };

  const handleEditLegacyConfig = async () => {
    if (!syncConfig || !connection) {
      toast({
        title: 'Error',
        description: 'Configuration or connection missing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Load spreadsheet details for the legacy config
      const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
      const details = await GoogleOAuthService.getSpreadsheetDetails(syncConfig.spreadsheet_id, accessToken);
      setSpreadsheetDetails(details);
      
      // Set up the form with existing legacy data
      const spreadsheet = spreadsheetsQuery.data?.find(s => s.id === syncConfig.spreadsheet_id);
      setSelectedSpreadsheet(spreadsheet || {
        id: syncConfig.spreadsheet_id,
        name: spreadsheetsQuery.data?.find(s => s.id === syncConfig.spreadsheet_id)?.name || 'Unknown Spreadsheet'
      } as GoogleSpreadsheet);
      
      setSelectedSheets(new Set([syncConfig.sheet_name]));
      
      // Convert legacy config to metric mappings format
      const mappings: MetricMapping[] = [];
      
      // Add date mapping
      if (syncConfig.date_column) {
        mappings.push({
          id: 'date',
          name: 'Date',
          columnLetter: syncConfig.date_column,
          isCustom: false
        });
      }
      
      // Add predefined metric mappings
      const predefinedFields = [
        { field: 'outbound_clicks_column', id: 'outbound_clicks', name: 'Outbound Clicks' },
        { field: 'amount_spent_column', id: 'amount_spent', name: 'Amount Spent' },
        { field: 'outbound_ctr_column', id: 'outbound_ctr', name: 'CTR (Click-through rate)' },
        { field: 'cpm_column', id: 'cpm', name: 'CPM (Cost per 1,000 impressions)' },
        { field: 'cpc_column', id: 'cpc', name: 'CPC (Cost per link click)' },
        { field: 'impressions_column', id: 'impressions', name: 'Impressions' },
        { field: 'reach_column', id: 'reach', name: 'Reach' },
        { field: 'frequency_column', id: 'frequency', name: 'Frequency' },
        { field: 'conversions_column', id: 'conversions', name: 'Conversions' },
        { field: 'conversion_rate_column', id: 'conversion_rate', name: 'Conversion Rate' },
        { field: 'cost_per_conversion_column', id: 'cost_per_conversion', name: 'Cost per Conversion' },
        { field: 'revenue_column', id: 'revenue', name: 'Revenue' },
        { field: 'roas_column', id: 'roas', name: 'ROAS (Return on Ad Spend)' },
      ];
      
      predefinedFields.forEach(({ field, id, name }) => {
        const column = (syncConfig as any)[field];
        if (column) {
          mappings.push({
            id,
            name,
            columnLetter: column,
            isCustom: false
          });
        }
      });
      
      // Add custom metric mappings
      if (syncConfig.custom_metrics) {
        Object.entries(syncConfig.custom_metrics).forEach(([name, column]) => {
          mappings.push({
            id: `custom_${Date.now()}_${Math.random()}`,
            name,
            columnLetter: column as string,
            isCustom: true
          });
        });
      }
      
      setMetricMappings(mappings);
      
      // Load preview for the configured sheet
      await loadSheetPreview(syncConfig.spreadsheet_id, syncConfig.sheet_name);
      
      // Set up auto-sync settings
      setAutoSyncEnabled(syncConfig.is_active && syncConfig.sync_frequency_minutes > 0);
      setSyncInterval(Math.max(1, Math.ceil((syncConfig.sync_frequency_minutes || 60) / 60)));
      
      // Create a fake spreadsheet config for the edit dialog
      setEditingSpreadsheet({
        id: 'legacy_config',
        spreadsheet_id: syncConfig.spreadsheet_id,
        spreadsheet_name: spreadsheet?.name || 'Unknown Spreadsheet',
        sheets: [syncConfig.sheet_name],
        column_mappings: {},
        is_active: syncConfig.is_active,
      });
      
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Failed to load legacy config for editing:', error);
      toast({
        title: 'Error',
        description: 'Failed to load configuration for editing.',
        variant: 'destructive',
      });
    }
  };

  // Handle sheet toggle and update preview
  const handleMultipleSheetToggle = async (sheetTitle: string, checked: boolean) => {
    const newSelectedSheets = new Set(selectedSheets);
    
    if (checked) {
      newSelectedSheets.add(sheetTitle);
    } else {
      newSelectedSheets.delete(sheetTitle);
    }
    
    setSelectedSheets(newSelectedSheets);
    
    // Load preview for the last selected sheet (most recently selected)
    if (checked && selectedSpreadsheet) {
      await loadSheetPreview(selectedSpreadsheet.id, sheetTitle);
      
      // Also update column headers for this sheet
      try {
        if (!connection) return;
        const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
        const headerRange = `${sheetTitle}!1:1`; // Get first row for headers
        const headerData = await GoogleOAuthService.getSheetData(selectedSpreadsheet.id, headerRange, accessToken);
        
        if (headerData && headerData[0]) {
          const headers = headerData[0].map((header, index) => 
            header || String.fromCharCode(65 + index) // Use A, B, C... if header is empty
          );
          setColumnHeaders(headers);
        }
      } catch (error) {
        console.error('Failed to load column headers:', error);
      }
    } else if (newSelectedSheets.size > 0 && selectedSpreadsheet) {
      // If unchecked, load preview for the last remaining selected sheet
      const remainingSheets = Array.from(newSelectedSheets);
      const lastSheet = remainingSheets[remainingSheets.length - 1];
      await loadSheetPreview(selectedSpreadsheet.id, lastSheet);
      
      // Update column headers for the last remaining sheet
      try {
        if (!connection) return;
        const accessToken = await GoogleOAuthService.getValidAccessToken(connection);
        const headerRange = `${lastSheet}!1:1`;
        const headerData = await GoogleOAuthService.getSheetData(selectedSpreadsheet.id, headerRange, accessToken);
        
        if (headerData && headerData[0]) {
          const headers = headerData[0].map((header, index) => 
            header || String.fromCharCode(65 + index)
          );
          setColumnHeaders(headers);
        }
      } catch (error) {
        console.error('Failed to load column headers:', error);
      }
    } else {
      // No sheets selected, clear preview
      setPreviewData([]);
      setColumnHeaders([]);
    }
  };

  // Validation for individual records mode (per spreadsheet)
  const validateCurrentSpreadsheetConfig = () => {
    if (currentSpreadsheetSyncMode === 'individual_records') {
      if (!currentUniqueIdMapping?.columnLetter) {
        toast({
          title: 'Configuration Error',
          description: 'Unique ID column is required for individual records mode.',
          variant: 'destructive',
        });
        return false;
      }
      
      if (!currentRecordType) {
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
                Google Sheets Integration
              </CardTitle>
              <CardDescription>
                Connect and manage data from Google Sheets with advanced sync modes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="integrations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="integrations" className="space-y-6">
          {/* Google Account Connection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Google Account</Label>
            {connection ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{connection.user_email}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
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

          {connection && (
            <>
              <Separator />
              
              {/* Configured Spreadsheets */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">
                    Configured Spreadsheets ({multiConfig?.spreadsheets.length || 0})
                  </Label>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsAddDialogOpen(true);
                          initializeMetricMappings();
                        }}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Add Spreadsheet
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Spreadsheet</DialogTitle>
                        <DialogDescription>
                          Select a spreadsheet, choose sheets, and configure column mappings.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Spreadsheet Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Select Spreadsheet</Label>
                            {spreadsheetsQuery.data && (
                              <span className="text-xs text-muted-foreground">
                                {filteredSpreadsheets.length} of {spreadsheetsQuery.data.length} spreadsheets
                              </span>
                            )}
                          </div>
                          
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search spreadsheets by name or owner..."
                              value={spreadsheetSearchQuery}
                              onChange={(e) => setSpreadsheetSearchQuery(e.target.value)}
                              className="pl-10 pr-10"
                            />
                            {spreadsheetSearchQuery && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setSpreadsheetSearchQuery('')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <Select
                            value={selectedSpreadsheet?.id || ''}
                            onValueChange={handleSpreadsheetSelect}
                            disabled={spreadsheetsQuery.isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={spreadsheetsQuery.isLoading ? "Loading spreadsheets..." : "Choose a spreadsheet"} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredSpreadsheets.length === 0 && spreadsheetSearchQuery ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No spreadsheets found matching "{spreadsheetSearchQuery}"
                                </div>
                              ) : (
                                filteredSpreadsheets.map((spreadsheet) => (
                                <SelectItem key={spreadsheet.id} value={spreadsheet.id}>
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{spreadsheet.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {spreadsheet.shared && (
                                        <Badge variant="secondary" className="text-xs">
                                          Shared
                                        </Badge>
                                      )}
                                      {spreadsheet.capabilities?.canEdit === false && (
                                        <Badge variant="outline" className="text-xs">
                                          View Only
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sheet Selection */}
                        {spreadsheetDetails && (
                          <div>
                            <Label>Select Sheets</Label>
                            <div className="border rounded-lg p-4 bg-muted/30">
                              <div className="space-y-2">
                                {spreadsheetDetails.sheets.map((sheet) => (
                                  <div key={sheet.sheetId} className="flex items-center space-x-2">
                                    <Switch
                                      id={`sheet-${sheet.sheetId}`}
                                      checked={selectedSheets.has(sheet.title)}
                                      onCheckedChange={(checked) => handleMultipleSheetToggle(sheet.title, checked)}
                                    />
                                    <Label htmlFor={`sheet-${sheet.sheetId}`} className="text-sm">
                                      {sheet.title}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Data Preview for first selected sheet */}
                        {selectedSheets.size > 0 && previewData.length > 0 && (
                          <div>
                            <Label>
                              Data Preview 
                              {selectedSheets.size > 0 && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({Array.from(selectedSheets)[selectedSheets.size - 1]})
                                </span>
                              )}
                            </Label>
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
                                        {columnHeaders.slice(0, 10).map((header, i) => (
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
                                      {previewData.slice(1, 4).map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t">
                                          {row.slice(0, 10).map((cell, cellIndex) => (
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
                        {selectedSheets.size > 0 && columnHeaders.length > 0 && (
                          <div>
                            <Label>Column Mapping</Label>
                            
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
                                          onValueChange={(value) => updateMetricMapping(mapping.id, { columnLetter: value })}
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

                        {/* Individual Records Mode Configuration */}
                        {selectedSheets.size > 0 && (
                          <div>
                            <Label>Data Sync Mode</Label>
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                              <div className="space-y-2">
                                <Label className="text-sm">Sync Mode</Label>
                                <Select
                                  value={currentSpreadsheetSyncMode}
                                  onValueChange={(value) => setCurrentSpreadsheetSyncMode(value as 'daily_aggregate' | 'individual_records')}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select sync mode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daily_aggregate">
                                      <div className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        <span>Daily Aggregates</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="individual_records">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Individual Records</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {currentSpreadsheetSyncMode === 'individual_records' && (
                                <div className="space-y-4 border-t pt-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Record Type */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Record Type *</Label>
                                      <Select
                                        value={currentRecordType}
                                        onValueChange={setCurrentRecordType}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select record type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {recordTypeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              <div>
                                                <div className="font-medium">{option.label}</div>
                                                <div className="text-xs text-muted-foreground">{option.description}</div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Unique ID Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Unique ID Column *</Label>
                                      <Select
                                        value={currentUniqueIdMapping?.columnLetter || ''}
                                        onValueChange={(value) => {
                                          const option = getColumnOptions().find(opt => opt.letter === value);
                                          if (option) {
                                            setCurrentUniqueIdMapping({
                                              id: 'unique_id',
                                              name: 'Unique ID',
                                              columnLetter: value,
                                              isCustom: false
                                            });
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select unique ID column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Amount Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Amount Column</Label>
                                      <Select
                                        value={currentAmountMapping?.columnLetter || 'none'}
                                        onValueChange={(value) => {
                                          if (value === 'none') {
                                            setCurrentAmountMapping(null);
                                          } else {
                                            const option = getColumnOptions().find(opt => opt.letter === value);
                                            if (option) {
                                              setCurrentAmountMapping({
                                                id: 'amount',
                                                name: 'Amount',
                                                columnLetter: value,
                                                isCustom: false
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select amount column (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Status Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Status Column</Label>
                                      <Select
                                        value={currentStatusMapping?.columnLetter || 'none'}
                                        onValueChange={(value) => {
                                          if (value === 'none') {
                                            setCurrentStatusMapping(null);
                                          } else {
                                            const option = getColumnOptions().find(opt => opt.letter === value);
                                            if (option) {
                                              setCurrentStatusMapping({
                                                id: 'status',
                                                name: 'Status',
                                                columnLetter: value,
                                                isCustom: false
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status column (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleAddSpreadsheet} disabled={!selectedSpreadsheet || selectedSheets.size === 0}>
                            <Save className="h-4 w-4 mr-2" />
                            Add Spreadsheet
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Spreadsheet Dialog */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Spreadsheet Configuration</DialogTitle>
                        <DialogDescription>
                          Modify sheets, column mappings, and other settings for this spreadsheet.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Display current spreadsheet info */}
                        {editingSpreadsheet && (
                          <div className="p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              <span className="font-medium">{editingSpreadsheet.spreadsheet_name}</span>
                            </div>
                          </div>
                        )}

                        {/* Sheet Selection */}
                        {spreadsheetDetails && (
                          <div>
                            <Label>Select Sheets</Label>
                            <div className="border rounded-lg p-4 bg-muted/30">
                              <div className="space-y-2">
                                {spreadsheetDetails.sheets.map((sheet) => (
                                  <div key={sheet.sheetId} className="flex items-center space-x-2">
                                    <Switch
                                      id={`edit-sheet-${sheet.sheetId}`}
                                      checked={selectedSheets.has(sheet.title)}
                                      onCheckedChange={(checked) => handleMultipleSheetToggle(sheet.title, checked)}
                                    />
                                    <Label htmlFor={`edit-sheet-${sheet.sheetId}`} className="text-sm">
                                      {sheet.title}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Data Preview for first selected sheet */}
                        {selectedSheets.size > 0 && previewData.length > 0 && (
                          <div>
                            <Label>
                              Data Preview 
                              {selectedSheets.size > 0 && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({Array.from(selectedSheets)[selectedSheets.size - 1]})
                                </span>
                              )}
                            </Label>
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
                                        {columnHeaders.slice(0, 10).map((header, i) => (
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
                                      {previewData.slice(1, 4).map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-t">
                                          {row.slice(0, 10).map((cell, cellIndex) => (
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
                        {selectedSheets.size > 0 && columnHeaders.length > 0 && (
                          <div>
                            <Label>Column Mapping</Label>
                            
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
                                          onValueChange={(value) => updateMetricMapping(mapping.id, { columnLetter: value })}
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

                        {/* Individual Records Mode Configuration */}
                        {selectedSheets.size > 0 && (
                          <div>
                            <Label>Data Sync Mode</Label>
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                              <div className="space-y-2">
                                <Label className="text-sm">Sync Mode</Label>
                                <Select
                                  value={currentSpreadsheetSyncMode}
                                  onValueChange={(value) => setCurrentSpreadsheetSyncMode(value as 'daily_aggregate' | 'individual_records')}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select sync mode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daily_aggregate">
                                      <div className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        <span>Daily Aggregates</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="individual_records">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Individual Records</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {currentSpreadsheetSyncMode === 'individual_records' && (
                                <div className="space-y-4 border-t pt-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Record Type */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Record Type *</Label>
                                      <Select
                                        value={currentRecordType}
                                        onValueChange={setCurrentRecordType}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select record type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {recordTypeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              <div>
                                                <div className="font-medium">{option.label}</div>
                                                <div className="text-xs text-muted-foreground">{option.description}</div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Unique ID Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Unique ID Column *</Label>
                                      <Select
                                        value={currentUniqueIdMapping?.columnLetter || ''}
                                        onValueChange={(value) => {
                                          const option = getColumnOptions().find(opt => opt.letter === value);
                                          if (option) {
                                            setCurrentUniqueIdMapping({
                                              id: 'unique_id',
                                              name: 'Unique ID',
                                              columnLetter: value,
                                              isCustom: false
                                            });
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select unique ID column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Amount Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Amount Column</Label>
                                      <Select
                                        value={currentAmountMapping?.columnLetter || 'none'}
                                        onValueChange={(value) => {
                                          if (value === 'none') {
                                            setCurrentAmountMapping(null);
                                          } else {
                                            const option = getColumnOptions().find(opt => opt.letter === value);
                                            if (option) {
                                              setCurrentAmountMapping({
                                                id: 'amount',
                                                name: 'Amount',
                                                columnLetter: value,
                                                isCustom: false
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select amount column (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Status Column */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">Status Column</Label>
                                      <Select
                                        value={currentStatusMapping?.columnLetter || 'none'}
                                        onValueChange={(value) => {
                                          if (value === 'none') {
                                            setCurrentStatusMapping(null);
                                          } else {
                                            const option = getColumnOptions().find(opt => opt.letter === value);
                                            if (option) {
                                              setCurrentStatusMapping({
                                                id: 'status',
                                                name: 'Status',
                                                columnLetter: value,
                                                isCustom: false
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status column (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {getColumnOptions().map((option) => (
                                            <SelectItem key={option.letter} value={option.letter}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium">{option.letter}</span>
                                                <span className="text-muted-foreground">{option.header}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleUpdateSpreadsheet} disabled={!selectedSpreadsheet || selectedSheets.size === 0}>
                            <Save className="h-4 w-4 mr-2" />
                            Update Configuration
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* List of configured spreadsheets */}
                <div className="space-y-3">
                  {/* Show existing config if exists but not migrated yet */}
                  {syncConfig && syncConfig.spreadsheet_id && syncConfig.spreadsheet_id !== 'multi-spreadsheet' && (!multiConfig || multiConfig.spreadsheets.length === 0) && (
                    <div className="border rounded-lg overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleSpreadsheetExpanded(syncConfig.spreadsheet_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              {expandedSpreadsheets.has(syncConfig.spreadsheet_id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <FileSpreadsheet className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {spreadsheetsQuery.data?.find(s => s.id === syncConfig.spreadsheet_id)?.name || syncConfig.spreadsheet_id}
                                </span>
                                {syncConfig.is_active ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                1 sheet • Auto-sync: {syncConfig.is_active ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLegacyConfig()}
                              className="text-xs"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedSpreadsheets.has(syncConfig.spreadsheet_id) && (
                        <div className="border-t bg-muted/20 p-4">
                          <div className="space-y-3">
                            {/* Sheet */}
                            <div>
                              <Label className="text-sm font-medium">Configured Sheet</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  <Table className="h-3 w-3 mr-1" />
                                  {syncConfig.sheet_name}
                                </Badge>
                              </div>
                            </div>

                            {/* Sync Mode Preview */}
                            <div>
                              <Label className="text-sm font-medium">Sync Mode</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {syncConfig.sync_mode === 'individual_records' ? (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Individual Records ({syncConfig.record_type || 'sale'})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <BarChart3 className="h-3 w-3" />
                                    Daily Aggregate
                                  </Badge>
                                )}
                                {syncConfig.sync_mode === 'individual_records' && syncConfig.unique_id_column && (
                                  <Badge variant="secondary" className="text-xs">
                                    ID Column: {syncConfig.unique_id_column}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Column Mappings Preview */}
                            <div>
                              <Label className="text-sm font-medium">Column Mappings</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {syncConfig.date_column && (
                                  <Badge variant="secondary" className="text-xs">
                                    Date → {syncConfig.date_column}
                                  </Badge>
                                )}
                                {Object.entries(syncConfig).filter(([key, value]) => 
                                  key.endsWith('_column') && key !== 'date_column' && value
                                ).slice(0, 6).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key.replace('_column', '').replace('_', ' ')} → {value as string}
                                  </Badge>
                                ))}
                                {Object.keys(syncConfig.custom_metrics || {}).slice(0, 2).map((name) => (
                                  <Badge key={name} variant="secondary" className="text-xs">
                                    {name} → {(syncConfig.custom_metrics as any)?.[name]}
                                  </Badge>
                                ))}
                                {(Object.keys(syncConfig).filter(key => key.endsWith('_column') && (syncConfig as any)[key]).length + 
                                  Object.keys(syncConfig.custom_metrics || {}).length) > 8 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{(Object.keys(syncConfig).filter(key => key.endsWith('_column') && (syncConfig as any)[key]).length + 
                                      Object.keys(syncConfig.custom_metrics || {}).length) - 8} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {multiConfig?.spreadsheets.length === 0 || !multiConfig ? (
                    !syncConfig || !syncConfig.spreadsheet_id || syncConfig.spreadsheet_id === 'multi-spreadsheet' ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No spreadsheets configured yet</p>
                        <p className="text-sm">Add your first spreadsheet to get started</p>
                      </div>
                    ) : null
                  ) : (
                    multiConfig.spreadsheets.map((spreadsheet) => {
                      const isExpanded = expandedSpreadsheets.has(spreadsheet.spreadsheet_id);
                      return (
                        <div key={spreadsheet.id} className="border rounded-lg overflow-hidden">
                          {/* Collapsed Header */}
                          <div 
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleSpreadsheetExpanded(spreadsheet.spreadsheet_id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <FileSpreadsheet className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{spreadsheet.spreadsheet_name}</span>
                                    {spreadsheet.is_active ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Active</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                                    )}
                                    {spreadsheet.sync_mode === 'individual_records' ? (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Individual Records
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        Daily Aggregate
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {spreadsheet.sheets.length} sheet{spreadsheet.sheets.length !== 1 ? 's' : ''} • {Object.keys(spreadsheet.column_mappings).length} columns mapped
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSpreadsheet(spreadsheet)}
                                  className="text-xs"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveSpreadsheet(spreadsheet.spreadsheet_id)}
                                  className="text-destructive hover:text-destructive text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-4">
                              <div className="space-y-3">
                                {/* Sheets */}
                                <div>
                                  <Label className="text-sm font-medium">Configured Sheets</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {spreadsheet.sheets.map(sheet => (
                                      <Badge key={sheet} variant="outline" className="text-xs">
                                        <Table className="h-3 w-3 mr-1" />
                                        {sheet}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* Sync Mode */}
                                <div>
                                  <Label className="text-sm font-medium">Sync Mode</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {spreadsheet.sync_mode === 'individual_records' ? (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Individual Records ({spreadsheet.record_type || 'sale'})
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        Daily Aggregate
                                      </Badge>
                                    )}
                                    {spreadsheet.sync_mode === 'individual_records' && spreadsheet.unique_id_column && (
                                      <Badge variant="secondary" className="text-xs">
                                        ID Column: {spreadsheet.unique_id_column}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Column Mappings */}
                                <div>
                                  <Label className="text-sm font-medium">Column Mappings</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {Object.entries(spreadsheet.column_mappings).slice(0, 8).map(([column, mapping]) => (
                                      <Badge key={column} variant="secondary" className="text-xs">
                                        {mapping.metricName} → {column}
                                      </Badge>
                                    ))}
                                    {Object.keys(spreadsheet.column_mappings).length > 8 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{Object.keys(spreadsheet.column_mappings).length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Auto-Sync Settings */}
              {((multiConfig && multiConfig.spreadsheets.length > 0) || (syncConfig && syncConfig.spreadsheet_id && syncConfig.spreadsheet_id !== 'multi-spreadsheet')) && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Auto-Sync Settings</Label>
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto-sync-toggle" className="text-sm font-medium">
                            Enable Auto-Sync
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {multiConfig && multiConfig.spreadsheets.length > 0 
                              ? 'Automatically sync data from all configured spreadsheets'
                              : 'Automatically sync data from your connected spreadsheet'
                            }
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
                        </div>
                      )}

                      <Button onClick={handleSaveAutoSyncSettings} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Sync Actions */}
              {multiConfig && multiConfig.spreadsheets.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      {multiConfig.last_sync_at && (
                        <p className="text-sm text-muted-foreground">
                          Last synced: {format(new Date(multiConfig.last_sync_at), 'PPp')}
                        </p>
                      )}
                    </div>
                    <Button onClick={handleManualSync} disabled={isSyncing}>
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync All Spreadsheets
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Advanced settings can be added here in the future */}
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Advanced settings coming soon</p>
                <p className="text-sm">Additional configuration options will be available here</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}