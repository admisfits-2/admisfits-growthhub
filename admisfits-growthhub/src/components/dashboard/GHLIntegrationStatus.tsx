// GHL Integration Status Component
// Displays current status, metrics, and API usage information

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  GHLIntegration, 
  GHLIntegrationStatus as GHLStatus 
} from '@/types/ghlIntegration';
import { useGHLMetrics } from '@/hooks/useGHLIntegration';
import { formatDistanceToNow, format } from 'date-fns';

interface GHLIntegrationStatusProps {
  projectId: string;
  integrationConfig: GHLIntegration;
  integrationStatus: GHLStatus | undefined;
}

const GHLIntegrationStatus: React.FC<GHLIntegrationStatusProps> = ({
  projectId,
  integrationConfig,
  integrationStatus
}) => {
  // Get project summary metrics
  const { 
    projectSummary, 
    isLoadingSummary 
  } = useGHLMetrics(projectId, new Date(), new Date(), false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const apiUsagePercentage = integrationStatus?.apiUsage 
    ? (integrationStatus.apiUsage.dailyCalls / integrationStatus.apiUsage.limit) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Integration Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Connection Status</label>
            <div className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg 
              ${getStatusColor(integrationStatus?.syncStatus || 'pending')}
            `}>
              {getStatusIcon(integrationStatus?.syncStatus || 'pending')}
              <span className="text-sm font-medium">
                {integrationStatus?.syncStatus === 'success' && 'Connected'}
                {integrationStatus?.syncStatus === 'error' && 'Error'}
                {integrationStatus?.syncStatus === 'in_progress' && 'Syncing'}
                {integrationStatus?.syncStatus === 'pending' && 'Pending'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Last Sync</label>
            <div className="text-sm">
              {integrationStatus?.lastSync ? (
                <div>
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(integrationStatus.lastSync), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(integrationStatus.lastSync), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">Never synced</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Auto Sync</label>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={integrationConfig.auto_sync_enabled ? "default" : "secondary"}
                className="text-xs"
              >
                {integrationConfig.auto_sync_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {integrationConfig.auto_sync_enabled && (
                <span className="text-xs text-gray-500">
                  Every {integrationConfig.sync_frequency_minutes}m
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {integrationStatus?.syncStatus === 'error' && integrationStatus.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sync Error:</strong> {integrationStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {/* API Usage */}
        {integrationStatus?.apiUsage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">API Usage Today</label>
              <span className="text-sm text-gray-500">
                {integrationStatus.apiUsage.dailyCalls.toLocaleString()} / {integrationStatus.apiUsage.limit.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={apiUsagePercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{apiUsagePercentage.toFixed(1)}% used</span>
              <span>Resets {integrationStatus.apiUsage.resetDate}</span>
            </div>
            {apiUsagePercentage > 80 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  API usage is high. Consider reducing sync frequency if you approach the limit.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Quick Metrics Summary */}
        {projectSummary && projectSummary.isConfigured && !isLoadingSummary && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">30-Day Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {projectSummary.totalAppointments || 0}
                </div>
                <div className="text-xs text-gray-500">Appointments</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  ${(projectSummary.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Revenue</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  --
                </div>
                <div className="text-xs text-gray-500">Deals Won</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg mx-auto mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  --
                </div>
                <div className="text-xs text-gray-500">Conversion Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Location Information */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Location Details</h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{integrationConfig.location_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Location ID:</span>
              <code className="text-xs bg-white px-2 py-1 rounded border">
                {integrationConfig.location_id}
              </code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Integration Created:</span>
              <span className="text-gray-800">
                {format(new Date(integrationConfig.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GHLIntegrationStatus;