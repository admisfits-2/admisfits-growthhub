import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import GoogleSheetsOAuthSyncV4 from './GoogleSheetsOAuthSyncV4';
import GHLIntegrationSettings from './GHLIntegrationSettings';
import ProjectMetaIntegration from './ProjectMetaIntegration';
import MetricSettings from './MetricSettings';
import { ArrowLeft, Database } from 'lucide-react';
import { useState } from 'react';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById } = useProjects();
  const [customMetrics, setCustomMetrics] = useState([]);

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

  return (
    <DashboardLayout activeTab="projects" onTabChange={() => {}}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/project/${projectId}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Project Settings</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>

        {/* Settings Content */}
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="space-y-6">
            <MetricSettings 
              projectId={projectId || ''}
              customMetrics={customMetrics}
              onMetricsUpdate={setCustomMetrics}
            />
          </TabsContent>
          
          <TabsContent value="integrations" className="space-y-6">
            <Tabs defaultValue="ghl" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ghl">GoHighLevel</TabsTrigger>
                <TabsTrigger value="google-sheets">Google Sheets</TabsTrigger>
                <TabsTrigger value="meta-ads">Meta Ads</TabsTrigger>
              </TabsList>
              
              {/* GHL Integration Tab */}
              <TabsContent value="ghl" className="space-y-6">
                <GHLIntegrationSettings projectId={projectId || ''} />
              </TabsContent>
              
              {/* Google Sheets Integration Tab */}
              <TabsContent value="google-sheets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Google Sheets Integration
                    </CardTitle>
                    <CardDescription>
                      Sync your project data with Google Sheets for advanced reporting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GoogleSheetsOAuthSyncV4 
                      projectId={projectId || ''} 
                      projectName={project?.name || ''} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Meta Ads Integration Tab */}
              <TabsContent value="meta-ads" className="space-y-6">
                <ProjectMetaIntegration
                  projectId={projectId || ''}
                  projectName={project?.name || ''}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}