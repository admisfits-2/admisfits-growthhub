import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Eye, Archive, Loader2, X, TrendingUp, TrendingDown, DollarSign, Users, Target } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import CreateProjectDialog from './CreateProjectDialog';
import ProjectViewDialog from './ProjectViewDialog';
import ProjectEditDialog from './ProjectEditDialog';
import ProjectFunnelChart from './ProjectFunnelChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const ProjectsTab = () => {
  const { projects, isLoadingProjects, projectsError, archiveProject } = useProjects();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Mock data for charts
  const chartData = [
    { month: 'Jan', revenue: 12000, spend: 8000, profit: 4000 },
    { month: 'Feb', revenue: 15000, spend: 9500, profit: 5500 },
    { month: 'Mar', revenue: 18000, spend: 11000, profit: 7000 },
    { month: 'Apr', revenue: 22000, spend: 12500, profit: 9500 },
    { month: 'May', revenue: 25000, spend: 14000, profit: 11000 },
    { month: 'Jun', revenue: 28000, spend: 15500, profit: 12500 },
  ];

  const funnelData = [
    { name: 'Impressions', value: 100000, percentage: 100, color: '#3b82f6', icon: Eye },
    { name: 'Clicks', value: 25000, percentage: 25, color: '#10b981', icon: TrendingUp },
    { name: 'Leads', value: 5000, percentage: 5, color: '#f59e0b', icon: Users },
    { name: 'Conversions', value: 1250, percentage: 1.25, color: '#ef4444', icon: Target },
  ];

  const defaultMetrics = [
    { id: 'revenue', name: 'Revenue', value: '$28,000', change: '+12%', trend: 'up', icon: DollarSign },
    { id: 'spend', name: 'Ad Spend', value: '$15,500', change: '+8%', trend: 'up', icon: TrendingUp },
    { id: 'roi', name: 'ROI', value: '180%', change: '+15%', trend: 'up', icon: Target },
    { id: 'leads', name: 'Leads', value: '82', change: '+9%', trend: 'up', icon: Users },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your client projects and campaigns</p>
        </div>
        <CreateProjectDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProjects ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading projects...
                    </div>
                  </TableCell>
                </TableRow>
              ) : projectsError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-500">
                    Error loading projects. Please try again.
                  </TableCell>
                </TableRow>
              ) : projects && projects.length > 0 ? (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client_name}</TableCell>
                    <TableCell>{getStatusBadge(project.status)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      $0.00
                    </TableCell>
                    <TableCell className="text-right">
                      $0.00
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      0%
                    </TableCell>
                    <TableCell>{new Date(project.updated_at).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedProject(project)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <ProjectEditDialog project={project} />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          archiveProject(project.id);
                          toast({
                            title: 'Project Archived',
                            description: `${project.name} has been archived.`,
                          });
                        }}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No projects found. Create your first project to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedProject ? (
        <div className="space-y-6">
          {/* Project Detail Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{selectedProject.name} - Project Details</h2>
              {getStatusBadge(selectedProject.status)}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedProject(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {defaultMetrics.map((metric) => (
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

          {/* Charts and Funnel */}
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
                          name === 'spend' ? 'Ad Spend' : 'Profit'
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
              <ProjectFunnelChart data={funnelData} />
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default ProjectsTab;