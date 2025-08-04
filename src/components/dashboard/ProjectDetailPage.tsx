import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    { 
      name: 'Impressions', 
      value: 100000, 
      percentage: 100, 
      color: '#3b82f6',
      description: 'Total ad impressions across all platforms and campaigns.'
    },
    { 
      name: 'Clicks', 
      value: 25000, 
      percentage: 25, 
      color: '#10b981',
      description: 'Users who clicked on ads and visited landing pages.'
    },
    { 
      name: 'Leads', 
      value: 5000, 
      percentage: 5, 
      color: '#f59e0b',
      description: 'Qualified leads who showed interest in the product.'
    },
    { 
      name: 'Conversions', 
      value: 1250, 
      percentage: 1.25, 
      color: '#ef4444',
      description: 'Final conversions and sales completed.'
    },
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
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
        </div>
      </div>

      {/* Main Content - Single Container */}
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {customMetrics.map((metric) => (
            <Card key={metric.id}>
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

        {/* Charts and Funnel Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Takes 70% width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
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
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, index) => (
                    <div key={stage.name} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Eye className="h-4 w-4 text-blue-500" />}
                          {index === 1 && <MousePointer className="h-4 w-4 text-green-500" />}
                          {index === 2 && <ShoppingCart className="h-4 w-4 text-yellow-500" />}
                          {index === 3 && <CheckCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm font-medium">{stage.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stage.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${stage.percentage}%`, 
                            backgroundColor: stage.color 
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stage.percentage}% conversion rate
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Three Metric Categories */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-6">Project Metrics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New Sales Calls</span>
                  <span className="font-medium">247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Scheduled Calls</span>
                  <span className="font-medium">189</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Show Up Rate</span>
                  <span className="font-medium">76.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Qualified Leads</span>
                  <span className="font-medium">94</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Close Rate</span>
                  <span className="font-medium">12.8%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Collected (Pre-Refund)</span>
                  <span className="font-medium">$59,090</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Refunds</span>
                  <span className="font-medium text-red-600">$2,450</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Collected (Post-Refund)</span>
                  <span className="font-medium text-green-600">$56,640</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sales Value</span>
                  <span className="font-medium">$59,090</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Marketing Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ad Spend</span>
                  <span className="font-medium">$22,650</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Per Lead</span>
                  <span className="font-medium">$91.70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Per Deal</span>
                  <span className="font-medium">$1,888</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ROAS (Post-Refund)</span>
                  <span className="font-medium text-green-600">250%</span>
                </div>
              </CardContent>
            </Card>
          </div>
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
              <Card key={metric.id}>
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
    </div>
  );
} 