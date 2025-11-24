import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Facebook, 
  Link, 
  Unlink, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye
} from 'lucide-react';
import { MetaOAuthService } from '@/lib/services/metaOAuthService';
import { useMetaAdsData } from '@/hooks/useMetaAdsData';
import { format } from 'date-fns';
import { debugConnections } from '@/lib/utils/connectionDebug';

interface ProjectMetaIntegrationProps {
  projectId: string;
  projectName: string;
}

export default function ProjectMetaIntegration({ projectId, projectName }: ProjectMetaIntegrationProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const {
    isConnected,
    connection,
    overview,
    campaigns,
    isLoadingOverview,
    isLoadingCampaigns,
    testConnection,
    disconnect,
    refetchConnection,
  } = useMetaAdsData(projectId);

  // Debug connections on mount and when connection status changes
  useEffect(() => {
    debugConnections(projectId);
  }, [projectId, connection]);

  const handleConnect = () => {
    setIsConnecting(true);
    // Generate OAuth URL with project ID as state
    const authUrl = MetaOAuthService.getAuthorizationUrl(projectId);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Meta Ads account?')) {
      await disconnect();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    await testConnection();
    setIsTesting(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="data" disabled={!isConnected}>Data</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Meta Ads Connection
              </CardTitle>
              <CardDescription>
                Connect your Meta (Facebook) Ads account to import advertising data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected && connection ? (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Connected to <strong>{connection.ad_account_name}</strong>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Account ID</span>
                      <span className="font-mono text-sm">{connection.ad_account_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Connected</span>
                      <span className="text-sm">{format(new Date(connection.created_at), 'PPP')}</span>
                    </div>
                    {connection.expires_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Token Expires</span>
                        <span className="text-sm">{format(new Date(connection.expires_at), 'PPP')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        refetchConnection();
                        debugConnections(projectId);
                      }}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnect}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No Meta Ads account connected. Connect your account to start importing ad data.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Connect Meta Ads Account
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. Prerequisites</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Meta Business account with ad account access</li>
                  <li>Admin or Advertiser role on the ad account</li>
                  <li>Active advertising campaigns (optional)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Available Metrics</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Ad spend and budget tracking</li>
                  <li>Impressions, reach, and frequency</li>
                  <li>Clicks, CTR, and CPC</li>
                  <li>Conversions and ROAS</li>
                  <li>Campaign and ad set performance</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Data Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Data is synced in real-time when you view the reports. Historical data is available based on your Meta Ads account retention.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingOverview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    formatCurrency(overview?.spend || 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingOverview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    formatNumber(overview?.impressions || 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingOverview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    formatNumber(overview?.clicks || 0)
                  )}
                </div>
                {overview?.ctr ? (
                  <p className="text-xs text-muted-foreground">
                    {overview.ctr.toFixed(2)}% CTR
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingOverview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    formatNumber(overview?.conversions || 0)
                  )}
                </div>
                {overview?.cpa ? (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(overview.cpa)} CPA
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>
                Performance metrics for your Meta advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCampaigns ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Campaign</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-right py-2 px-2">Spend</th>
                        <th className="text-right py-2 px-2">Impressions</th>
                        <th className="text-right py-2 px-2">Clicks</th>
                        <th className="text-right py-2 px-2">CTR</th>
                        <th className="text-right py-2 px-2">CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b">
                          <td className="py-2 px-2">
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-xs text-muted-foreground">{campaign.objective}</div>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-2">{formatCurrency(campaign.metrics.spend)}</td>
                          <td className="text-right py-2 px-2">{formatNumber(campaign.metrics.impressions)}</td>
                          <td className="text-right py-2 px-2">{formatNumber(campaign.metrics.clicks)}</td>
                          <td className="text-right py-2 px-2">{campaign.metrics.ctr.toFixed(2)}%</td>
                          <td className="text-right py-2 px-2">{formatCurrency(campaign.metrics.cpc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No campaigns found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}