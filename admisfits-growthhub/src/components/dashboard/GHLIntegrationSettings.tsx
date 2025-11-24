// GHL Integration Settings Component
// Main component for managing GHL integration in project settings

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react';
import { useGHLIntegration } from '@/hooks/useGHLIntegration';
import { useAuth } from '@/hooks/useAuth';
import GHLSetupWizard from './GHLSetupWizard';
import GHLCalendarManager from './GHLCalendarManager';
import GHLQuickSync from './GHLQuickSync';
import { formatDistanceToNow } from 'date-fns';

interface GHLIntegrationSettingsProps {
  projectId: string;
}

const GHLIntegrationSettings: React.FC<GHLIntegrationSettingsProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const {
    integrationConfig,
    integrationStatus,
    isLoadingConfig,
    isLoadingStatus,
    isDeleting,
    deleteIntegration,
    hasError,
    deleteError
  } = useGHLIntegration(projectId);

  const handleDeleteIntegration = () => {
    if (integrationConfig && user) {
      if (confirm('Are you sure you want to remove GHL integration? This will stop all data syncing.')) {
        deleteIntegration(integrationConfig.id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'in_progress':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
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

  if (isLoadingConfig || isLoadingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading GHL integration settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Go High Level Integration</CardTitle>
            </div>
            {integrationConfig ? (
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={integrationConfig.is_active ? "default" : "secondary"}
                  className="flex items-center space-x-1"
                >
                  {integrationConfig.is_active ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Inactive</span>
                    </>
                  )}
                </Badge>
              </div>
            ) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!integrationConfig ? (
            // No integration configured
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Go High Level
              </h3>
              <p className="text-gray-600 mb-6">
                Automatically sync appointments, deals, and revenue data from your GHL sub account.
              </p>
              <Button 
                onClick={() => setShowSetupWizard(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Setup GHL Integration</span>
              </Button>
            </div>
          ) : (
            // Integration configured
            <div className="space-y-4">
              {/* Integration Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{integrationConfig.location_name || 'Unknown Location'}</span>
                    <Badge variant="outline" className="text-xs">
                      ID: {integrationConfig.location_id.slice(0, 8)}...
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center space-x-2">
                    {integrationConfig.selected_calendar_ids?.length ? (
                      <Badge variant="default" className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>{integrationConfig.selected_calendar_ids.length} Calendars</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Calendars Selected</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {hasError && integrationStatus?.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sync Error:</strong> {integrationStatus.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Delete Error */}
              {deleteError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Delete Error:</strong> {deleteError.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowSetupWizard(true)}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Reconfigure</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteIntegration}
                  disabled={isDeleting}
                  className="flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{isDeleting ? 'Removing...' : 'Remove Integration'}</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Manager */}
      {integrationConfig && (
        <GHLCalendarManager
          projectId={projectId}
          integrationConfig={integrationConfig}
        />
      )}

      {/* Quick Sync Card */}
      {integrationConfig && integrationConfig.is_active && integrationConfig.selected_calendar_ids?.length > 0 && (
        <GHLQuickSync projectId={projectId} />
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <GHLSetupWizard
          projectId={projectId}
          existingConfig={integrationConfig}
          onClose={() => setShowSetupWizard(false)}
          onComplete={() => {
            setShowSetupWizard(false);
          }}
        />
      )}
    </div>
  );
};

export default GHLIntegrationSettings;