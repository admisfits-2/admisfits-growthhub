import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Eye, Archive, Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import CreateProjectDialog from './CreateProjectDialog';
import ProjectEditDialog from './ProjectEditDialog';
import { useToast } from '@/hooks/use-toast';

const ProjectsTab = () => {
  const { projects, isLoadingProjects, projectsError, archiveProject } = useProjects();
  const { toast } = useToast();
  const navigate = useNavigate();

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

      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-xl">All Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                          onClick={() => navigate(`/project/${project.id}`)}
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
    </div>
  );
};

export default ProjectsTab;