import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';

// Mock data for charts - will be replaced with real data
const chartData = [
  { date: 'Jan', revenue: 12000, spend: 8000, leads: 45 },
  { date: 'Feb', revenue: 15000, spend: 9500, leads: 52 },
  { date: 'Mar', revenue: 18000, spend: 11000, leads: 61 },
  { date: 'Apr', revenue: 22000, spend: 12500, leads: 68 },
  { date: 'May', revenue: 25000, spend: 14000, leads: 75 },
  { date: 'Jun', revenue: 28000, spend: 15500, leads: 82 },
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
  const [activeTab, setActiveTab] = useState('overview');
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lead Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="leads" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed analytics and insights will be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="flex justify-between items-center">
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Project configuration and settings will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 