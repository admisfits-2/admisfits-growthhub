import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Eye,
  MousePointer,
  ShoppingCart,
  CheckCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

// Enhanced chart data with more metrics
const chartData = [
  { month: 'Jan', revenue: 12000, spend: 8000, profit: 4000, conversions: 45 },
  { month: 'Feb', revenue: 15000, spend: 9500, profit: 5500, conversions: 52 },
  { month: 'Mar', revenue: 18000, spend: 11000, profit: 7000, conversions: 61 },
  { month: 'Apr', revenue: 22000, spend: 12500, profit: 9500, conversions: 68 },
  { month: 'May', revenue: 25000, spend: 14000, profit: 11000, conversions: 75 },
  { month: 'Jun', revenue: 28000, spend: 15500, profit: 12500, conversions: 82 },
];

// Funnel data
const funnelData = [
  { name: 'Impressions', value: 100000, percentage: 100, color: '#3b82f6' },
  { name: 'Clicks', value: 25000, percentage: 25, color: '#10b981' },
  { name: 'Leads', value: 5000, percentage: 5, color: '#f59e0b' },
  { name: 'Conversions', value: 1250, percentage: 1.25, color: '#ef4444' },
];

const defaultMetrics = [
  { id: 'revenue', name: 'Revenue', value: '$28,000', change: '+12%', trend: 'up', icon: DollarSign },
  { id: 'spend', name: 'Ad Spend', value: '$15,500', change: '+8%', trend: 'up', icon: TrendingUp },
  { id: 'roi', name: 'ROI', value: '180%', change: '+15%', trend: 'up', icon: Target },
  { id: 'leads', name: 'Leads', value: '82', change: '+9%', trend: 'up', icon: Users },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById } = useProjects();
  const { toast } = useToast();
  const [customMetrics, setCustomMetrics] = useState(defaultMetrics);

  const projectQuery = getProjectById(projectId || '');
  const project = projectQuery.data;
  const isLoading = projectQuery.isLoading;
  const error = projectQuery.error;

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
      trend: 'neutral' as const,
      icon: TrendingUp,
    };
    setCustomMetrics([...customMetrics, newMetric]);
    toast({
      title: 'Metric Added',
      description: 'New metric has been added to your project.',
    });
  };

  const removeCustomMetric = (metricId: string) => {
    setCustomMetrics(customMetrics.filter(metric => metric.id !== metricId));
    toast({
      title: 'Metric Removed',
      description: 'Metric has been removed from your project.',
    });
  };

  return (
    <DashboardLayout activeTab="projects" onTabChange={() => {}}>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{project.client_name}</p>
            </div>
            {getStatusBadge(project.status)}
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Project Settings
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {customMetrics.map((metric) => (
            <Card key={metric.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.name}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
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

        {/* Charts and Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Takes 70% width */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `$${value.toLocaleString()}`, 
                        name === 'revenue' ? 'Revenue' : 
                        name === 'spend' ? 'Ad Spend' : 
                        name === 'profit' ? 'Profit' : 'Conversions'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.8}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="spend" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.8}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.8}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Funnel - Takes 30% width */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {funnelData.map((stage, index) => {
                    const heightRatio = (stage.value / Math.max(...funnelData.map(s => s.value))) * 100;
                    const widthRatio = (stage.percentage / Math.max(...funnelData.map(s => s.percentage))) * 100;
                    
                    return (
                      <div key={stage.name} className="relative">
                        {/* Stage Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                              {index === 0 && <Eye className="h-4 w-4" style={{ color: stage.color }} />}
                              {index === 1 && <MousePointer className="h-4 w-4" style={{ color: stage.color }} />}
                              {index === 2 && <ShoppingCart className="h-4 w-4" style={{ color: stage.color }} />}
                              {index === 3 && <CheckCircle className="h-4 w-4" style={{ color: stage.color }} />}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{stage.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {stage.percentage.toFixed(2)}% conversion rate
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {stage.value.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stage.percentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Funnel Bar */}
                        <div className="relative">
                          <div 
                            className="rounded-lg transition-all duration-500 ease-out relative overflow-hidden"
                            style={{ 
                              height: `${Math.max(20, heightRatio * 0.8)}px`,
                              backgroundColor: stage.color,
                              opacity: 0.9
                            }}
                          >
                            {/* Gradient overlay */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}80 100%)`
                              }}
                            />
                            
                            {/* Percentage indicator */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {stage.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Width indicator line */}
                          <div 
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-300"
                            style={{ 
                              left: `${100 - widthRatio}%`,
                              zIndex: 10
                            }}
                          />
                        </div>

                        {/* Drop indicator */}
                        {index < funnelData.length - 1 && (
                          <div className="flex justify-center mt-2">
                            <div className="w-0.5 h-4 bg-gray-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {((funnelData[funnelData.length - 1]?.percentage / funnelData[0]?.percentage) * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Overall Conversion</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {funnelData[0]?.value.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Impressions</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Project Metrics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b bg-blue-50/50">
              <CardTitle className="text-lg text-blue-700">Sales Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Sales Calls</span>
                <span className="font-semibold text-lg">247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled Calls</span>
                <span className="font-semibold text-lg">189</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Show Up Rate</span>
                <span className="font-semibold text-lg text-green-600">76.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Qualified Leads</span>
                <span className="font-semibold text-lg">94</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Close Rate</span>
                <span className="font-semibold text-lg text-blue-600">12.8%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b bg-green-50/50">
              <CardTitle className="text-lg text-green-700">Financial Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cash Collected (Pre-Refund)</span>
                <span className="font-semibold text-lg">$59,090</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Refunds</span>
                <span className="font-semibold text-lg text-red-600">$2,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cash Collected (Post-Refund)</span>
                <span className="font-semibold text-lg text-green-600">$56,640</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sales Value</span>
                <span className="font-semibold text-lg">$59,090</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b bg-purple-50/50">
              <CardTitle className="text-lg text-purple-700">Marketing Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ad Spend</span>
                <span className="font-semibold text-lg">$22,650</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cost Per Lead</span>
                <span className="font-semibold text-lg">$91.70</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cost Per Deal</span>
                <span className="font-semibold text-lg">$1,888</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ROAS (Post-Refund)</span>
                <span className="font-semibold text-lg text-green-600">250%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Custom Metrics Management */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Custom Metrics</h2>
            <Button onClick={addCustomMetric} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Metric
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customMetrics.map((metric) => (
              <Card key={metric.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
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
                  <div className="text-2xl font-bold">{metric.value}</div>
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
      </div>
    </DashboardLayout>
  );
} 