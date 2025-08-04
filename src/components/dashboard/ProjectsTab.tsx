import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Eye, Archive } from 'lucide-react';

const ProjectsTab = () => {
  // Mock data - will be replaced with real data from Supabase
  const [projects] = useState([
    {
      id: '1',
      name: 'Tech Startup Campaign',
      client: 'InnovateTech Ltd',
      status: 'active',
      revenue: 24500,
      spend: 8650,
      roi: 285,
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'E-commerce Store',
      client: 'ShopFast Inc',
      status: 'active',
      revenue: 18920,
      spend: 6100,
      roi: 312,
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      name: 'SaaS Platform',
      client: 'CloudFlow Systems',
      status: 'inactive',
      revenue: 15670,
      spend: 7900,
      roi: 198,
      lastUpdated: '2024-01-10'
    }
  ]);

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
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
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
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatCurrency(project.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(project.spend)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {project.roi}%
                  </TableCell>
                  <TableCell>{project.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
  );
};

export default ProjectsTab;