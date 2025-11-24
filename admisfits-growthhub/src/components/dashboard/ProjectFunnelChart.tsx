import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Settings, Plus, X, Expand } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMainProjectMetrics } from '@/hooks/useProjectMetrics';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { ChartModal } from '@/components/ui/chart-modal';

interface FunnelStage {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  description?: string;
  metricId?: string;
}

interface FunnelMetric {
  id: string;
  name: string;
  value: number;
  type: 'number' | 'currency' | 'percentage';
}

interface ProjectFunnelChartProps {
  data: FunnelStage[];
  title?: string;
  metrics?: FunnelMetric[];
  onFunnelUpdate?: (stages: FunnelStage[]) => void;
  projectId?: string;
}

const defaultColors = [
  '#87CEEB', // Light blue
  '#FFD700', // Light yellow/goldenrod
  '#FFB6C1', // Light pink/rose
  '#DDA0DD', // Light purple/lavender
  '#98FB98', // Light green
  '#F0E68C', // Light khaki
];

export default function ProjectFunnelChart({ 
  data, 
  title = "FUNNEL",
  metrics = [],
  onFunnelUpdate,
  projectId 
}: ProjectFunnelChartProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>(data);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get main metrics if projectId is provided
  const dateRange = {
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  };

  // Re-enable metrics hooks now that infinite loop is fixed
  const { mainMetrics = [] } = useMainProjectMetrics(projectId || '', dateRange);

  // Create available metrics from main metrics or use defaults
  const availableMetrics = React.useMemo(() => {
    const defaultMetrics = [
      { id: 'impressions', name: 'Impressions', value: 100000, type: 'number' as const },
      { id: 'clicks', name: 'Clicks', value: 25000, type: 'number' as const },
      { id: 'leads', name: 'Leads', value: 5000, type: 'number' as const },
      { id: 'conversions', name: 'Conversions', value: 1250, type: 'number' as const },
      { id: 'revenue', name: 'Revenue', value: 28000, type: 'currency' as const },
      { id: 'spend', name: 'Ad Spend', value: 15500, type: 'currency' as const },
      { id: 'roi', name: 'ROI', value: 180, type: 'percentage' as const },
    ];

    if (projectId && mainMetrics.length > 0) {
      return mainMetrics.map(metric => ({
        id: metric.key,
        name: metric.config.display_name,
        value: metric.value,
        type: metric.config.format_type === 'currency' ? 'currency' : 
              metric.config.format_type === 'percentage' ? 'percentage' : 'number' as const,
      }));
    }

    return defaultMetrics;
  }, [mainMetrics, projectId]);

  const updateStage = (stageId: string, updates: Partial<FunnelStage>) => {
    const updatedStages = funnelStages.map(stage => 
      stage.id === stageId ? { ...stage, ...updates } : stage
    );
    setFunnelStages(updatedStages);
    onFunnelUpdate?.(updatedStages);
  };

  const addStage = () => {
    const newStage: FunnelStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${funnelStages.length + 1}`,
      value: 0,
      percentage: 0,
      color: defaultColors[funnelStages.length % defaultColors.length],
      description: '',
    };
    const updatedStages = [...funnelStages, newStage];
    setFunnelStages(updatedStages);
    onFunnelUpdate?.(updatedStages);
  };

  const removeStage = (stageId: string) => {
    const updatedStages = funnelStages.filter(stage => stage.id !== stageId);
    setFunnelStages(updatedStages);
    onFunnelUpdate?.(updatedStages);
  };

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <>
      <Card className="shadow-lg h-full" onDoubleClick={() => setIsExpanded(true)}>
      <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            {title}
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(true)}
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure Funnel Stages</DialogTitle>
                <DialogDescription>
                  Map your metrics to each funnel stage and customize the appearance.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {funnelStages.map((stage, index) => (
                  <div key={stage.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Stage {index + 1}</h3>
                      {funnelStages.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStage(stage.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stage Name</Label>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                          placeholder="e.g., Awareness"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2">
                          {defaultColors.map((color) => (
                            <button
                              key={color}
                              className={`w-8 h-8 rounded-full border-2 ${
                                stage.color === color ? 'border-gray-800' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => updateStage(stage.id, { color })}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Metric</Label>
                        <Select
                          value={stage.metricId || ''}
                          onValueChange={(value) => {
                            const metric = availableMetrics.find(m => m.id === value);
                            updateStage(stage.id, { 
                              metricId: value,
                              value: metric?.value || 0,
                              percentage: metric ? (metric.value / Math.max(...availableMetrics.map(m => m.value))) * 100 : 0
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a metric" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMetrics.map((metric) => (
                              <SelectItem key={metric.id} value={metric.id}>
                                {metric.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={stage.description || ''}
                          onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                          placeholder="e.g., Brand awareness and reach"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button onClick={addStage} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 md:p-4 h-[260px] overflow-hidden">
        <div className="flex flex-col items-center h-full">
          {/* Responsive Funnel Container */}
          <div className="relative w-full max-w-xs mx-auto flex-1 flex flex-col justify-center">
            {/* Funnel Stages */}
            {funnelStages.map((stage, index) => {
              const isLast = index === funnelStages.length - 1;
              const widthPercentage = 100 - (index * (100 / funnelStages.length) * 0.25);
              const clampedWidth = Math.max(50, widthPercentage); // Never below 50%
              const baseHeight = 180 / funnelStages.length; // Distribute height evenly
              const height = Math.max(32, baseHeight - 4); // Minimum 32px height
              
              return (
                <div key={stage.id} className="relative py-1">
                  {/* Main Funnel Segment */}
                  <div 
                    className="relative mx-auto transition-all duration-300 ease-out overflow-hidden"
                    style={{ 
                      width: `${clampedWidth}%`,
                      height: `${height}px`,
                      backgroundColor: stage.color,
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Gradient overlay for depth */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}dd 50%, ${stage.color} 100%)`
                      }}
                    />
                    
                    {/* Inner content to prevent overflow */}
                    <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-2">
                      <span className="text-white font-bold text-xs tracking-wide text-center leading-tight">
                        {stage.name}
                      </span>
                      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-white/90">
                        <span className="font-semibold">{formatValue(stage.value, 'number')}</span>
                        <span className="opacity-80">•</span>
                        <span>{stage.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separator Line (except for last stage) */}
                  {!isLast && (
                    <div className="flex justify-center mt-1">
                      <div className="w-0.5 h-2 bg-gray-600/70" />
                    </div>
                  )}
                  
                  {/* Funnel Tip for last stage */}
                  {isLast && (
                    <div className="flex justify-center mt-1">
                      <div className="w-0 h-0 border-l-3 border-r-3 border-t-4 border-transparent" style={{ borderTopColor: '#111827' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Summary Stats - Compact */}
          <div className="mt-3 w-full">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="space-y-1">
                <div className="text-sm font-bold text-green-600">
                  {funnelStages.length > 0 ? 
                    ((funnelStages[funnelStages.length - 1]?.percentage / funnelStages[0]?.percentage) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-xs text-gray-600 font-medium">Overall Conversion</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-blue-600">
                  {funnelStages.length > 0 ? funnelStages[0]?.value.toLocaleString() : 0}
                </div>
                <div className="text-xs text-gray-600 font-medium">Total Volume</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Expanded Chart Modal */}
    <ChartModal
      isOpen={isExpanded}
      onClose={() => setIsExpanded(false)}
      title={`${title} - Detailed View`}
      description="Interactive funnel analysis with detailed stage metrics"
    >
      <div className="space-y-6">
        {/* Funnel Visualization */}
        <div className="bg-muted/10 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Funnel Visualization</h3>
          <div className="relative w-full max-w-md mx-auto">
            {funnelStages.map((stage, index) => {
              const isLast = index === funnelStages.length - 1;
              const widthPercentage = 100 - (index * (100 / funnelStages.length) * 0.25);
              const clampedWidth = Math.max(50, widthPercentage);
              const baseHeight = 225 / funnelStages.length;
              const height = Math.max(40, baseHeight - 6);
              
              return (
                <div key={stage.id} className="relative py-2">
                  <div 
                    className="relative mx-auto transition-all duration-300 ease-out overflow-hidden"
                    style={{ 
                      width: `${clampedWidth}%`,
                      height: `${height}px`,
                      backgroundColor: stage.color,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}dd 50%, ${stage.color} 100%)`
                      }}
                    />
                    
                    <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4">
                      <span className="text-white font-bold text-base tracking-wide text-center">
                        {stage.name}
                      </span>
                      <div className="mt-1 flex items-center gap-2 text-sm text-white/90">
                        <span className="font-semibold">{formatValue(stage.value, 'number')}</span>
                        <span className="opacity-80">•</span>
                        <span>{stage.percentage.toFixed(1)}%</span>
                      </div>
                      {stage.description && (
                        <p className="text-xs text-white/70 mt-1 text-center">{stage.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {!isLast && (
                    <div className="flex justify-center mt-2">
                      <div className="w-0.5 h-4 bg-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Analysis */}
        <div>
          <h3 className="font-semibold mb-4">Conversion Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {funnelStages.length > 0 ? 
                  ((funnelStages[funnelStages.length - 1]?.percentage / funnelStages[0]?.percentage) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {funnelStages.length > 0 ? funnelStages[0]?.value.toLocaleString() : 0}
              </p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Final Conversions</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {funnelStages.length > 0 ? funnelStages[funnelStages.length - 1]?.value.toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Stage-by-Stage Breakdown */}
        <div>
          <h3 className="font-semibold mb-4">Stage-by-Stage Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Stage</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-right py-3 px-4">% of Total</th>
                  <th className="text-right py-3 px-4">Drop-off Rate</th>
                  <th className="text-left py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {funnelStages.map((stage, index) => {
                  const dropOffRate = index > 0 
                    ? ((funnelStages[index - 1].value - stage.value) / funnelStages[index - 1].value * 100).toFixed(1)
                    : '-';
                  
                  return (
                    <tr key={stage.id} className="border-b">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatValue(stage.value, 'number')}
                      </td>
                      <td className="text-right py-3 px-4">
                        {stage.percentage.toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-4">
                        {dropOffRate !== '-' && (
                          <span className={`font-medium ${parseFloat(dropOffRate) > 50 ? 'text-red-600' : parseFloat(dropOffRate) > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {dropOffRate}%
                          </span>
                        )}
                        {dropOffRate === '-' && <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {stage.description || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metric Details */}
        {projectId && mainMetrics.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4">Available Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableMetrics.map((metric) => (
                <div key={metric.id} className="bg-muted/10 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-xl font-semibold mt-1">
                    {formatValue(metric.value, metric.type)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ChartModal>
    </>
  );
} 