import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Settings, Trash2, Database, Wifi } from 'lucide-react';

const DataIntegrationTab = () => {
  const [activeTab, setActiveTab] = useState('google-sheets');
  const [connections] = useState([
    {
      id: '1',
      name: 'Tech Startup - Sales Data',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/...',
      refreshInterval: 'daily',
      lastSync: '2024-01-15 10:30 AM',
      status: 'active'
    },
    {
      id: '2',
      name: 'E-commerce - Marketing Metrics',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/...',
      refreshInterval: 'hourly',
      lastSync: '2024-01-15 11:00 AM',
      status: 'active'
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

    return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Integration</h1>
          <p className="text-muted-foreground">Connect and manage your data sources and integrations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="google-sheets" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Meta Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google-sheets" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Google Sheets Integration</h2>
              <p className="text-muted-foreground">Connect and manage your Google Sheets data sources</p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Connection
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>New Google Sheets Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="connectionName">Connection Name</Label>
                  <Input id="connectionName" placeholder="e.g., Project Sales Data" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheetUrl">Google Sheets URL</Label>
                  <Input id="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Refresh Interval</Label>
                  <select className="w-full px-3 py-2 border border-input rounded-md">
                    <option value="real-time">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <Button className="w-full">Connect Sheet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Column Mapping Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Map your Google Sheets columns to dashboard metrics
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sheet Column A</span>
                      <span className="text-sm text-muted-foreground">→ Date</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sheet Column B</span>
                      <span className="text-sm text-muted-foreground">→ Ad Spend</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sheet Column C</span>
                      <span className="text-sm text-muted-foreground">→ Revenue</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Configure Mapping</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Connection Name</TableHead>
                    <TableHead>Sheet URL</TableHead>
                    <TableHead>Refresh Interval</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="font-medium">{connection.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{connection.sheetUrl}</TableCell>
                      <TableCell className="capitalize">{connection.refreshInterval}</TableCell>
                      <TableCell>{connection.lastSync}</TableCell>
                      <TableCell>{getStatusBadge(connection.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Meta Ads Integration</h2>
              <p className="text-muted-foreground">Connect and manage your Meta Ads data</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Meta Ads integration will be available in the next update. This will allow you to fetch 
                ad spend, impressions, clicks, and conversion data directly from your Meta Ads account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
            </Tabs>
    </div>
  );
};

export default DataIntegrationTab;