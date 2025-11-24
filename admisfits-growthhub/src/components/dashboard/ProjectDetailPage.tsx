import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target,
  Settings,
  Plus,
  Trash2,
  Calendar,
  Database,
  Link,
  MousePointer,
  Eye,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Loader2
} from 'lucide-react';
import { RevenueAreaChart } from './RevenueAreaChart';
import { useToast } from '@/hooks/use-toast';
import ProjectFunnelChart from './ProjectFunnelChart';
import { WeeklyBarChart } from './WeeklyBarChart';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import DateRangeSelector from './DateRangeSelector';
import { useMainProjectMetrics, useProjectMetrics, formatMetricValue, getTrend } from '@/hooks/useProjectMetrics';
import { DateRange } from 'react-day-picker';
import { useMetaAdsData } from '@/hooks/useMetaAdsData';
import { MetaAdsCard } from './MetaAdsCard';
import { format } from 'date-fns';

// Enhanced chart data with more metrics
const chartData = [
  { month: 'Jan', revenue: 12000, spend: 8000, profit: 4000, conversions: 45 },
  { month: 'Feb', revenue: 15000, spend: 9500, profit: 5500, conversions: 52 },
  { month: 'Mar', revenue: 18000, spend: 11000, profit: 7000, conversions: 61 },
  { month: 'Apr', revenue: 22000, spend: 12500, profit: 9500, conversions: 68 },
  { month: 'May', revenue: 25000, spend: 14000, profit: 11000, conversions: 75 },
  { month: 'Jun', revenue: 28000, spend: 15500, profit: 12500, conversions: 82 },
];

// Configurable marketing funnel data
const getInitialFunnelData = (metrics: any) => [
  { 
    id: 'awareness',
    name: 'AWARENESS', 
    value: metrics?.totalImpressions || 100000, 
    percentage: 100, 
    color: '#87CEEB', // Light blue
    description: 'Brand awareness and reach',
    metricId: 'impressions'
  },
  { 
    id: 'consideration',
    name: 'CONSIDERATION', 
    value: metrics?.totalClicks || 25000, 
    percentage: metrics?.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 25, 
    color: '#FFD700', // Light yellow/goldenrod
    description: 'Interest and consideration',
    metricId: 'clicks'
  },
  { 
    id: 'conversion',
    name: 'CONVERSION', 
    value: metrics?.totalConversions || 5000, 
    percentage: metrics?.totalImpressions > 0 ? (metrics.totalConversions / metrics.totalImpressions) * 100 : 5, 
    color: '#FFB6C1', // Light pink/rose
    description: 'Purchase and conversion',
    metricId: 'conversions'
  },
  { 
    id: 'loyalty',
    name: 'LOYALTY', 
    value: Math.round(metrics?.totalConversions * 0.25) || 1250, 
    percentage: metrics?.totalImpressions > 0 ? ((metrics.totalConversions * 0.25) / metrics.totalImpressions) * 100 : 1.25, 
    color: '#DDA0DD', // Light purple/lavender
    description: 'Customer retention and loyalty',
    metricId: 'repeat_customers'
  },
];

const defaultMetrics = [
  { id: 'revenue', name: 'Revenue', value: '$28,000', change: '+12%', trend: 'up' as 'up' | 'down' | 'neutral', icon: DollarSign },
  { id: 'spend', name: 'Ad Spend', value: '$15,500', change: '+8%', trend: 'up' as 'up' | 'down' | 'neutral', icon: TrendingUp },
  { id: 'roi', name: 'ROI', value: '180%', change: '+15%', trend: 'up' as 'up' | 'down' | 'neutral', icon: Target },
  { id: 'leads', name: 'Leads', value: '82', change: '+9%', trend: 'up' as 'up' | 'down' | 'neutral', icon: Users },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById } = useProjects();
  const { toast } = useToast();
  const [customMetrics, setCustomMetrics] = useState(defaultMetrics);
  const [funnelData, setFunnelData] = useState(getInitialFunnelData(null));
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  }));

  const projectQuery = getProjectById(projectId || '');
  const project = projectQuery.data;
  const isLoading = projectQuery.isLoading;
  const error = projectQuery.error;

  // Create stable date range object to prevent infinite re-renders
  const stableDateRange = useMemo(() => ({
    from: dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: dateRange?.to || new Date()
  }), [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  // Re-enable metrics hooks now that infinite loop is fixed
  const { 
    mainMetrics,
    aggregatedMetrics, 
    isLoading: metricsLoading,
    refetch: refetchMetrics 
  } = useMainProjectMetrics(projectId || '', stableDateRange);

  const { chartData: liveChartData } = useProjectMetrics(projectId || '', stableDateRange);

  // Convert date range to Meta Ads format
  const metaAdsDateRange = useMemo(() => {
    if (!stableDateRange.from || !stableDateRange.to) return undefined;
    
    return {
      startDate: stableDateRange.from.toISOString().split('T')[0],
      endDate: stableDateRange.to.toISOString().split('T')[0]
    };
  }, [stableDateRange]);

  // Fetch Meta Ads data with date range
  const { 
    topAds, 
    isLoadingTopAds,
    isConnected: isMetaConnected 
  } = useMetaAdsData(projectId || '', metaAdsDateRange);


  // Get icon component from icon name
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
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
      Database,
    };
    return iconMap[iconName] || TrendingUp;
  };

  // Convert calculated metrics to display format
  const liveMetrics = mainMetrics?.map((metric) => {
    const IconComponent = getIconComponent(metric.config.icon);
    const change = aggregatedMetrics.changePercent[metric.key] || 0;
    
    return {
      id: metric.key,
      name: metric.config.metric_name,
      value: formatMetricValue(metric.value, metric.config.format_type),
      change: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      trend: getTrend(change),
      icon: IconComponent,
    };
  }) || [];

  // Use live metrics or defaults
  const allAvailableMetrics = liveMetrics;
  
  const displayMetrics = allAvailableMetrics.length > 0 ? allAvailableMetrics : defaultMetrics;

  // Update funnel data when metrics change (with stable dependencies)
  const stableMetricsData = useMemo(() => ({
    impressions: aggregatedMetrics?.impressions || 0,
    clicks: aggregatedMetrics?.clicks || aggregatedMetrics?.outbound_clicks || 0,
    conversions: aggregatedMetrics?.conversions || 0,
  }), [aggregatedMetrics?.impressions, aggregatedMetrics?.clicks, aggregatedMetrics?.outbound_clicks, aggregatedMetrics?.conversions]);

  useEffect(() => {
    if (!metricsLoading && stableMetricsData) {
      // Create funnel data from aggregated metrics
      const funnelMetrics = {
        totalImpressions: stableMetricsData.impressions,
        totalClicks: stableMetricsData.clicks,
        totalConversions: stableMetricsData.conversions,
      };
      const liveFunnelData = getInitialFunnelData(funnelMetrics);
      setFunnelData(liveFunnelData);
    }
  }, [stableMetricsData, metricsLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const addCustomMetric = () => {
    const newMetric = {
      id: `metric-${Date.now()}`,
      name: 'New Metric',
      value: '$0',
      change: '0%',
      trend: 'up' as const,
      icon: TrendingUp,
    };
    setCustomMetrics([...customMetrics, newMetric]);
    toast({
      title: "Metric Added",
      description: "New custom metric has been added successfully.",
    });
  };

  const removeCustomMetric = (metricId: string) => {
    setCustomMetrics(customMetrics.filter(metric => metric.id !== metricId));
    toast({
      title: "Metric Removed",
      description: "Custom metric has been removed successfully.",
    });
  };

  const handleFunnelUpdate = (updatedFunnelData: any[]) => {
    setFunnelData(updatedFunnelData);
    toast({
      title: "Funnel Updated",
      description: "Funnel configuration has been updated successfully.",
    });
  };

  return (
    <DashboardLayout activeTab="projects" onTabChange={() => {}}>
      <div className="p-6 space-y-6">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{project.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(project.status)}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/project/${projectId}/settings`)}
              className="shrink-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <DateRangeSelector 
              dateRange={dateRange ? { 
                from: dateRange.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
                to: dateRange.to || new Date() 
              } : { 
                from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
                to: new Date() 
              }}
              onDateRangeChange={(range) => {
                setDateRange({ from: range.from, to: range.to });
                refetchMetrics();
              }}
            />
          </div>
        </div>

            {/* Responsive Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {(metricsLoading ? customMetrics : displayMetrics).map((metric) => (
                <Card key={metric.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
                      {metric.name}
                    </CardTitle>
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold truncate">
                      {metricsLoading ? (
                        <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                      ) : (
                        metric.value
                      )}
                    </div>
                    <div className={`flex items-center text-xs ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {metricsLoading ? (
                        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                      ) : (
                        <>
                          {metric.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                          {metric.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                          {metric.change}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue Chart - Full Width */}
            <div className="w-full">
              <RevenueAreaChart 
                data={liveChartData.length > 0 ? liveChartData : chartData} 
                className="shadow-lg h-full"
                projectId={projectId}
              />
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Weekly Bar Chart */}
              <div className="lg:col-span-1">
                <WeeklyBarChart className="shadow-lg h-full" />
              </div>

              {/* Performance Trend Chart */}
              <div className="lg:col-span-1">
                <PerformanceTrendChart className="shadow-lg h-full" />
              </div>

              {/* Marketing Funnel */}
              <div className="lg:col-span-1">
                <ProjectFunnelChart 
                  data={funnelData} 
                  onFunnelUpdate={handleFunnelUpdate}
                  projectId={projectId}
                />
              </div>
            </div>

            {/* Responsive Project Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-blue-50/50">
                  <CardTitle className="text-base md:text-lg text-blue-700">Sales Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">New Sales Calls</span>
                    <span className="font-semibold text-base md:text-lg">247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Scheduled Calls</span>
                    <span className="font-semibold text-base md:text-lg">189</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Show Up Rate</span>
                    <span className="font-semibold text-base md:text-lg text-green-600">76.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Qualified Leads</span>
                    <span className="font-semibold text-base md:text-lg">94</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Close Rate</span>
                    <span className="font-semibold text-base md:text-lg text-blue-600">12.8%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-green-50/50">
                  <CardTitle className="text-base md:text-lg text-green-700">Financial Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Cash Collected (Pre-Refund)</span>
                    <span className="font-semibold text-base md:text-lg">$59,090</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Refunds</span>
                    <span className="font-semibold text-base md:text-lg text-red-600">$2,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Cash Collected (Post-Refund)</span>
                    <span className="font-semibold text-base md:text-lg text-green-600">$56,640</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Sales Value</span>
                    <span className="font-semibold text-base md:text-lg">$59,090</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-purple-50/50">
                  <CardTitle className="text-base md:text-lg text-purple-700">Marketing Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Ad Spend</span>
                    <span className="font-semibold text-base md:text-lg">$22,650</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Cost Per Lead</span>
                    <span className="font-semibold text-base md:text-lg">$91.70</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Cost Per Deal</span>
                    <span className="font-semibold text-base md:text-lg">$1,888</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">ROAS (Post-Refund)</span>
                    <span className="font-semibold text-base md:text-lg text-green-600">250%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Responsive Custom Metrics Management */}
            <div className="mt-6 md:mt-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-lg md:text-xl font-semibold">Custom Metrics</h2>
                <Button onClick={addCustomMetric} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customMetrics.map((metric) => (
                  <Card key={metric.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        {metric.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomMetric(metric.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg md:text-xl font-bold truncate">{metric.value}</div>
                      <div className={`flex items-center text-xs ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {metric.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {metric.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                        {metric.change}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Top Performing Ads Section */}
            {isMetaConnected && (
              <div className="mt-8">
                <Card className="mb-6">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <CardTitle className="text-lg md:text-xl text-blue-700">Top Performing Ads</CardTitle>
                        <CardDescription className="text-sm">
                          {stableDateRange.from && stableDateRange.to ? (
                            <>
                              {format(stableDateRange.from, 'MMM d')} - {format(stableDateRange.to, 'MMM d, yyyy')} • Top spenders
                            </>
                          ) : (
                            'Last 7 days • Top spenders'
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {isLoadingTopAds ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : topAds && topAds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {topAds.slice(0, 8).map((ad) => (
                      <MetaAdsCard key={ad.id} ad={ad} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        No active ads found for the selected period
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
      </div>
    </DashboardLayout>
  );
} 