import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Database, 
  Link, 
  FileSpreadsheet,
  ExternalLink,
  TestTube,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Facebook,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  MousePointer,
  Eye,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Edit,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MetricConfigService } from '@/lib/services/metricConfigService';
import { MetaAdsSyncService } from '@/lib/services/metaAdsSyncService';
import { MetricConfig, CreateMetricConfigInput, AVAILABLE_DATABASE_FIELDS, AVAILABLE_META_ADS_FIELDS, AVAILABLE_ICONS } from '@/types/metricConfig';

interface MetricSettingsProps {
  projectId: string;
  customMetrics: any[]; // Keep for backward compatibility, but not used in new system
  onMetricsUpdate: (metrics: any[]) => void; // Keep for backward compatibility
}

// Icon mapping for Lucide icons
const iconMap: { [key: string]: any } = {
  DollarSign,
  TrendingUp,
  Target,
  Users,
  MousePointer,
  Eye,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Database,
};


export default function MetricSettings({ projectId }: MetricSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [isEditingMetric, setIsEditingMetric] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricConfig | null>(null);
  const [draggedMetric, setDraggedMetric] = useState<MetricConfig | null>(null);
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
  
  const [newMetric, setNewMetric] = useState<CreateMetricConfigInput>({
    metric_name: '',
    metric_key: '',
    database_field: '',
    aggregation_type: 'sum',
    calculation_type: 'total',
    format_type: 'number',
    icon: 'TrendingUp',
    display_order: 0,
    is_visible: true,
    is_main_metric: false,
    data_source_type: 'database',
    data_source_config: {},
  });

  // Fetch metric configurations
  const { data: metricConfigs = [], isLoading } = useQuery({
    queryKey: ['metric-configs', projectId],
    queryFn: () => MetricConfigService.getProjectMetricConfigs(projectId),
    enabled: !!projectId,
  });

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: (config: CreateMetricConfigInput) => 
      MetricConfigService.createMetricConfig(projectId, config),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['metric-configs', projectId] });
      toast({ title: 'Success', description: 'Metric created successfully' });
      
      // If this is a Meta Ads metric, trigger automatic data sync
      if (variables.data_source_type === 'meta_ads') {
        toast({ 
          title: 'Syncing Data', 
          description: 'Syncing Meta Ads data for the new metric...' 
        });
        
        try {
          // Sync last 30 days of data
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          
          await MetaAdsSyncService.syncMetaAdsData({
            projectId,
            startDate,
            endDate,
          });
          
          // Invalidate project metrics to refresh the data
          queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['meta-ads-sync'] });
          
          toast({ 
            title: 'Sync Complete', 
            description: 'Meta Ads data has been synced successfully!' 
          });
        } catch (syncError) {
          console.error('Auto-sync failed:', syncError);
          toast({ 
            title: 'Sync Warning', 
            description: 'Metric created but data sync failed. Data will sync automatically when viewing metrics.',
            variant: 'destructive'
          });
        }
      }
      
      setIsAddingMetric(false);
      resetNewMetric();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create metric', 
        variant: 'destructive' 
      });
    },
  });

  // Update metric mutation
  const updateMetricMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateMetricConfigInput> }) =>
      MetricConfigService.updateMetricConfig(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-configs', projectId] });
      toast({ title: 'Success', description: 'Metric updated successfully' });
      setIsEditingMetric(false);
      setSelectedMetric(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update metric', 
        variant: 'destructive' 
      });
    },
  });

  // Delete metric mutation
  const deleteMetricMutation = useMutation({
    mutationFn: (id: string) => MetricConfigService.deleteMetricConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-configs', projectId] });
      toast({ title: 'Success', description: 'Metric deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete metric', 
        variant: 'destructive' 
      });
    },
  });

  // Update display order mutation
  const updateOrderMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; display_order: number }>) =>
      MetricConfigService.updateDisplayOrder(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-configs', projectId] });
      toast({
        title: 'Order Updated',
        description: 'Metric display order has been updated successfully.',
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

  // Drag and drop handlers
  const handleDragStart = (metric: MetricConfig) => {
    setDraggedMetric(metric);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropZoneIndex(index);
  };

  const handleDragLeave = () => {
    setDropZoneIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedMetric) return;

    const mainMetrics = metricConfigs
      .filter(config => config.is_main_metric)
      .sort((a, b) => a.display_order - b.display_order);

    const draggedIndex = mainMetrics.findIndex(m => m.id === draggedMetric.id);
    
    if (draggedIndex === targetIndex) {
      setDraggedMetric(null);
      setDropZoneIndex(null);
      return;
    }

    // Reorder the metrics
    const reorderedMetrics = [...mainMetrics];
    const [removed] = reorderedMetrics.splice(draggedIndex, 1);
    reorderedMetrics.splice(targetIndex, 0, removed);

    // Create updates with new display orders
    const updates = reorderedMetrics.map((metric, index) => ({
      id: metric.id!,
      display_order: index,
    }));

    updateOrderMutation.mutate(updates);
    setDraggedMetric(null);
    setDropZoneIndex(null);
  };

  const resetNewMetric = () => {
    setNewMetric({
      metric_name: '',
      metric_key: '',
      database_field: '',
      aggregation_type: 'sum',
      calculation_type: 'total',
      format_type: 'number',
      icon: 'TrendingUp',
      display_order: metricConfigs.length + 1,
      is_visible: true,
      is_main_metric: false,
      data_source_type: 'database',
      data_source_config: {},
    });
  };

  const handleAddMetric = () => {
    if (!newMetric.metric_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a metric name.",
        variant: "destructive",
      });
      return;
    }

    if (!newMetric.metric_key.trim()) {
      toast({
        title: "Error",
        description: "Please enter a metric key.",
        variant: "destructive",
      });
      return;
    }

    if (!newMetric.database_field && newMetric.data_source_type !== 'google_sheets' && newMetric.data_source_type !== 'api') {
      toast({
        title: "Error",
        description: "Please select a field for your metric.",
        variant: "destructive",
      });
      return;
    }

    createMetricMutation.mutate(newMetric);
  };

  const handleUpdateMetric = () => {
    if (!selectedMetric) return;
    
    const updates: Partial<CreateMetricConfigInput> = {
      metric_name: selectedMetric.metric_name,
      database_field: selectedMetric.database_field,
      aggregation_type: selectedMetric.aggregation_type,
      calculation_type: selectedMetric.calculation_type,
      format_type: selectedMetric.format_type,
      icon: selectedMetric.icon,
      is_visible: selectedMetric.is_visible,
      is_main_metric: selectedMetric.is_main_metric,
    };

    updateMetricMutation.mutate({ id: selectedMetric.id, updates });
  };

  const handleDeleteMetric = (metricId: string) => {
    if (confirm('Are you sure you want to delete this metric?')) {
      deleteMetricMutation.mutate(metricId);
    }
  };

  const openEditDialog = (metric: MetricConfig) => {
    setSelectedMetric({ ...metric });
    setIsEditingMetric(true);
  };

  // Generate metric key from name
  const generateMetricKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Handle manual reordering (temporary solution until drag-drop is implemented)
  const handleMoveUp = (configId: string) => {
    const config = metricConfigs.find(c => c.id === configId);
    if (!config || config.display_order <= 1) return;

    const updates = [
      { id: configId, display_order: config.display_order - 1 },
    ];

    // Find the item above and swap
    const itemAbove = metricConfigs.find(c => c.display_order === config.display_order - 1);
    if (itemAbove) {
      updates.push({ id: itemAbove.id, display_order: itemAbove.display_order + 1 });
    }

    updateOrderMutation.mutate(updates);
  };

  const handleMoveDown = (configId: string) => {
    const config = metricConfigs.find(c => c.id === configId);
    if (!config || config.display_order >= metricConfigs.length) return;

    const updates = [
      { id: configId, display_order: config.display_order + 1 },
    ];

    // Find the item below and swap
    const itemBelow = metricConfigs.find(c => c.display_order === config.display_order + 1);
    if (itemBelow) {
      updates.push({ id: itemBelow.id, display_order: itemBelow.display_order - 1 });
    }

    updateOrderMutation.mutate(updates);
  };

  // Auto-generate metric key when name changes
  useEffect(() => {
    if (newMetric.metric_name && !newMetric.metric_key) {
      setNewMetric(prev => ({
        ...prev,
        metric_key: generateMetricKey(prev.metric_name)
      }));
    }
  }, [newMetric.metric_name]);

  // Get icon component
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || TrendingUp;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show setup message if no metrics are found (likely table doesn't exist)
  if (!isLoading && metricConfigs.length === 0) {
    return (
      <div className="p-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Database Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-orange-600">
                The metric configuration system needs to be set up in your database. Please run the following SQL scripts in your Supabase dashboard:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-orange-600">
                <li>Go to your Supabase dashboard → SQL Editor</li>
                <li>Run the SQL from <code>create_project_metric_configs.sql</code></li>
                <li>Run the SQL from <code>setup_default_metrics.sql</code></li>
                <li>Refresh this page</li>
              </ol>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Main Metrics Configuration */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-0">
            <div className="flex items-center justify-between p-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-blue-700">
                  <Target className="h-5 w-5" />
                  Main Dashboard Metrics
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Configure which metrics appear on your main dashboard (up to 4)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {metricConfigs
                .filter(config => config.is_main_metric)
                .sort((a, b) => a.display_order - b.display_order)
                .map((config, index) => {
                  const IconComponent = getIconComponent(config.icon);
                  const isDragging = draggedMetric?.id === config.id;
                  const isDropZone = dropZoneIndex === index;
                  
                  return (
                    <Card 
                      key={config.id} 
                      className={`border border-blue-200 transition-all duration-200 p-3 ${
                        isDragging ? 'opacity-50 scale-95' : ''
                      } ${
                        isDropZone ? 'border-blue-400 bg-blue-50' : ''
                      }`}
                      draggable
                      onDragStart={() => handleDragStart(config)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
                          <IconComponent className="h-4 w-4 text-blue-600" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(config)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm truncate">{config.metric_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{config.database_field}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="h-5 px-1.5 text-xs">
                            {config.format_type}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })
              }
              
              {/* Add Main Metric Button */}
              {metricConfigs.filter(config => config.is_main_metric).length < 4 && (
                <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer p-3 flex items-center justify-center min-h-[120px]" 
                     onClick={() => {
                       setNewMetric(prev => ({ ...prev, is_main_metric: true }));
                       setIsAddingMetric(true);
                     }}>
                  <div className="text-center text-muted-foreground">
                    <Plus className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Add Main Metric</p>
                  </div>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Metrics Management */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 p-0">
            <div className="flex items-center justify-between p-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-green-700">
                <Database className="h-5 w-5" />
                All Metrics Configuration
              </CardTitle>
              <Dialog open={isAddingMetric} onOpenChange={setIsAddingMetric}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Metric</DialogTitle>
                    <DialogDescription>
                      Create a new metric and connect it to a data source (database, Google Sheets, or API).
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Metric Name</Label>
                        <Input
                          placeholder="e.g., Revenue, Leads, Conversions"
                          value={newMetric.metric_name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setNewMetric(prev => ({ 
                              ...prev, 
                              metric_name: name,
                              metric_key: generateMetricKey(name)
                            }));
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Metric Key</Label>
                        <Input
                          placeholder="revenue, leads, conversions"
                          value={newMetric.metric_key}
                          onChange={(e) => setNewMetric(prev => ({ ...prev, metric_key: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    {/* Data Source Type Selection */}
                    <div className="space-y-2">
                      <Label>Data Source Type</Label>
                      <Select
                        value={newMetric.data_source_type}
                        onValueChange={(value) => {
                          setNewMetric(prev => ({ 
                            ...prev, 
                            data_source_type: value as any,
                            database_field: '', // Reset field selection
                            data_source_config: {} // Reset config
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="database">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              Database Fields
                            </div>
                          </SelectItem>
                          <SelectItem value="google_sheets">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Google Sheets
                            </div>
                          </SelectItem>
                          <SelectItem value="api">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              External API
                            </div>
                          </SelectItem>
                          <SelectItem value="meta_ads">
                            <div className="flex items-center gap-2">
                              <Facebook className="h-4 w-4" />
                              Meta Ads
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Database Field Selection - only show for database type */}
                    {newMetric.data_source_type === 'database' && (
                      <div className="space-y-2">
                        <Label>Database Field</Label>
                      <Select
                        value={newMetric.database_field}
                        onValueChange={(value) => {
                          setNewMetric(prev => ({ ...prev, database_field: value }));
                          // Auto-set format type based on field
                          const field = AVAILABLE_DATABASE_FIELDS.find(f => f.value === value);
                          if (field) {
                            setNewMetric(prev => ({ ...prev, format_type: field.type as any }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select database field" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_DATABASE_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              <div>
                                <div>{field.label}</div>
                                <div className="text-xs text-muted-foreground">Type: {field.type}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    )}
                    
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Aggregation Type</Label>
                        <Select
                          value={newMetric.aggregation_type}
                          onValueChange={(value: any) => setNewMetric(prev => ({ ...prev, aggregation_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                            <SelectItem value="last">Latest Value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Format Type</Label>
                        <Select
                          value={newMetric.format_type}
                          onValueChange={(value: any) => setNewMetric(prev => ({ ...prev, format_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="currency">Currency ($)</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={newMetric.icon}
                          onValueChange={(value) => setNewMetric(prev => ({ ...prev, icon: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ICONS.map((icon) => {
                              const IconComponent = getIconComponent(icon.value);
                              return (
                                <SelectItem key={icon.value} value={icon.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    {icon.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_main_metric"
                          checked={newMetric.is_main_metric}
                          onCheckedChange={(checked) => setNewMetric(prev => ({ ...prev, is_main_metric: checked }))}
                        />
                        <Label htmlFor="is_main_metric">Show on main dashboard</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_visible"
                          checked={newMetric.is_visible}
                          onCheckedChange={(checked) => setNewMetric(prev => ({ ...prev, is_visible: checked }))}
                        />
                        <Label htmlFor="is_visible">Visible</Label>
                      </div>
                    </div>

                    {/* Meta Ads Field Selection */}
                    {newMetric.data_source_type === 'meta_ads' && (
                      <div className="space-y-2">
                        <Label>Meta Ads Metric</Label>
                        <Select
                          value={newMetric.data_source_config?.meta_field_name || ''}
                          onValueChange={(value) => {
                            // For Meta Ads, map field to custom_data path
                            const databaseField = `custom_data.${value}`;
                            setNewMetric(prev => ({ 
                              ...prev, 
                              database_field: databaseField,
                              data_source_config: {
                                ...prev.data_source_config,
                                meta_field_name: value // Store original field name for reference
                              }
                            }));
                            // Auto-set format type based on field
                            const field = AVAILABLE_META_ADS_FIELDS.find(f => f.value === value);
                            if (field) {
                              setNewMetric(prev => ({ ...prev, format_type: field.type as any }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Meta Ads metric" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_META_ADS_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                <div>
                                  <div>{field.label}</div>
                                  <div className="text-xs text-muted-foreground">Type: {field.type}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  {/* Google Sheets Configuration */}
                  {newMetric.data_source_type === 'google_sheets' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Google Sheets Configuration
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Spreadsheet ID</Label>
                          <Input
                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            value={newMetric.data_source_config?.spreadsheetId || ''}
                            onChange={(e) => setNewMetric({
                              ...newMetric,
                              data_source_config: {
                                ...newMetric.data_source_config,
                                spreadsheetId: e.target.value
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sheet Name</Label>
                          <Input
                            placeholder="Sheet1"
                            value={newMetric.data_source_config?.sheetName || ''}
                            onChange={(e) => setNewMetric({
                              ...newMetric,
                              data_source_config: {
                                ...newMetric.data_source_config,
                                sheetName: e.target.value
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Cell Range</Label>
                          <Input
                            placeholder="B2:B100"
                            value={newMetric.data_source_config?.cellRange || ''}
                            onChange={(e) => setNewMetric({
                              ...newMetric,
                              data_source_config: {
                                ...newMetric.data_source_config,
                                cellRange: e.target.value
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Meta Ads Configuration */}
                  {newMetric.data_source_type === 'meta_ads' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-600" />
                        Meta Ads Configuration
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          This metric will automatically pull data from your connected Meta Ads account.
                        </p>
                        <div className="text-sm text-gray-500">
                          <p>• Data is synced in real-time when viewing reports</p>
                          <p>• Historical data availability depends on your Meta Ads account retention</p>
                          <p>• Make sure you have an active Meta Ads connection in the project settings</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Configuration */}
                  {newMetric.data_source_type === 'api' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-semibold flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        API Configuration
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>API Endpoint</Label>
                          <Input
                            placeholder="https://api.example.com/metrics"
                            value={newMetric.data_source_config?.apiEndpoint}
                            onChange={(e) => setNewMetric({
                              ...newMetric,
                              data_source_config: {
                                ...newMetric.data_source_config,
                                apiEndpoint: e.target.value
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            placeholder="Enter API key"
                            value={newMetric.data_source_config?.apiKey}
                            onChange={(e) => setNewMetric({
                              ...newMetric,
                              data_source_config: {
                                ...newMetric.data_source_config,
                                apiKey: e.target.value
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsAddingMetric(false);
                      resetNewMetric();
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddMetric}
                      disabled={createMetricMutation.isPending}
                    >
                      {createMetricMutation.isPending ? 'Adding...' : 'Add Metric'}
                    </Button>
                  </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-xs font-medium uppercase text-muted-foreground">Order</th>
                  <th className="text-left p-3 text-xs font-medium uppercase text-muted-foreground">Metric</th>
                  <th className="text-left p-3 text-xs font-medium uppercase text-muted-foreground">Field Mapping</th>
                  <th className="text-left p-3 text-xs font-medium uppercase text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium uppercase text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-medium uppercase text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metricConfigs
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((config, index) => {
                    const IconComponent = getIconComponent(config.icon);
                    return (
                      <tr key={config.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleMoveUp(config.id)}
                              disabled={index === 0 || updateOrderMutation.isPending}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleMoveDown(config.id)}
                              disabled={index === metricConfigs.length - 1 || updateOrderMutation.isPending}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-blue-600 shrink-0" />
                            <div>
                              <div className="font-medium text-sm">{config.metric_name}</div>
                              <div className="text-xs text-muted-foreground">{config.metric_key}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{config.database_field}</code>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 text-xs">
                            <span>Format: {config.format_type}</span>
                            <span className="text-muted-foreground">{config.aggregation_type} / {config.calculation_type}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {config.is_main_metric && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Main</Badge>
                            )}
                            {!config.is_visible && (
                              <Badge variant="secondary" className="text-xs">Hidden</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(config)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMetric(config.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
            {metricConfigs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No metrics configured yet. Click "Add Metric" to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Metric Dialog */}
      <Dialog open={isEditingMetric} onOpenChange={setIsEditingMetric}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Metric</DialogTitle>
            <DialogDescription>
              Update metric configuration and mapping.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMetric && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metric Name</Label>
                  <Input
                    value={selectedMetric.metric_name}
                    onChange={(e) => setSelectedMetric(prev => prev ? { ...prev, metric_name: e.target.value } : null)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Database Field</Label>
                  <Select
                    value={selectedMetric.database_field}
                    onValueChange={(value) => setSelectedMetric(prev => prev ? { ...prev, database_field: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_DATABASE_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          <div>
                            <div>{field.label}</div>
                            <div className="text-xs text-muted-foreground">Type: {field.type}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aggregation Type</Label>
                  <Select
                    value={selectedMetric.aggregation_type}
                    onValueChange={(value: any) => setSelectedMetric(prev => prev ? { ...prev, aggregation_type: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="last">Latest Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Format Type</Label>
                  <Select
                    value={selectedMetric.format_type}
                    onValueChange={(value: any) => setSelectedMetric(prev => prev ? { ...prev, format_type: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="currency">Currency ($)</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={selectedMetric.icon}
                    onValueChange={(value) => setSelectedMetric(prev => prev ? { ...prev, icon: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((icon) => {
                        const IconComponent = getIconComponent(icon.value);
                        return (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {icon.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_main_metric"
                    checked={selectedMetric.is_main_metric}
                    onCheckedChange={(checked) => setSelectedMetric(prev => prev ? { ...prev, is_main_metric: checked } : null)}
                  />
                  <Label htmlFor="edit_is_main_metric">Show on main dashboard</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_visible"
                    checked={selectedMetric.is_visible}
                    onCheckedChange={(checked) => setSelectedMetric(prev => prev ? { ...prev, is_visible: checked } : null)}
                  />
                  <Label htmlFor="edit_is_visible">Visible</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditingMetric(false);
                  setSelectedMetric(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateMetric}
                  disabled={updateMetricMutation.isPending}
                >
                  {updateMetricMutation.isPending ? 'Updating...' : 'Update Metric'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 