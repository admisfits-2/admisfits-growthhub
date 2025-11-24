// GHL Setup Wizard Component
// Step-by-step wizard for setting up GHL integration

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  RefreshCw, 
  Key,
  MapPin,
  Settings,
  Zap,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useGHLIntegration, useGHLConnection } from '@/hooks/useGHLIntegration';
import { useAuth } from '@/hooks/useAuth';
import { 
  GHLIntegration, 
  GHLLocation, 
  GHLSetupStep,
  CreateGHLIntegrationInput,
  UpdateGHLIntegrationInput
} from '@/types/ghlIntegration';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GHLSetupWizardProps {
  projectId: string;
  existingConfig?: GHLIntegration | null;
  onClose: () => void;
  onComplete: () => void;
}

const GHLSetupWizard: React.FC<GHLSetupWizardProps> = ({
  projectId,
  existingConfig,
  onClose,
  onComplete
}) => {
  const { user } = useAuth();
  const { createIntegration, updateIntegration, isCreating, isUpdating } = useGHLIntegration(projectId);
  const { 
    testConnection, 
    getAvailableLocations, 
    isTestingConnection, 
    connectionResult,
    clearResult 
  } = useGHLConnection();

  const [currentStep, setCurrentStep] = useState<GHLSetupStep>('api_key');
  const [formData, setFormData] = useState({
    apiKey: existingConfig?.api_key || '',
    selectedLocation: null as GHLLocation | null,
    autoSync: existingConfig?.auto_sync_enabled ?? true,
    syncFrequency: existingConfig?.sync_frequency_minutes || 60,
    manualLocationId: '',
    manualLocationName: '',
    useManualEntry: false
  });
  const [availableLocations, setAvailableLocations] = useState<GHLLocation[]>([]);
  const [error, setError] = useState<string>('');

  const steps: { key: GHLSetupStep; title: string; icon: React.ReactNode }[] = [
    { key: 'api_key', title: 'Setup', icon: <Key className="h-4 w-4" /> },
    { key: 'sync_settings', title: 'Sync Settings', icon: <Settings className="h-4 w-4" /> },
    { key: 'completion', title: 'Complete', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  useEffect(() => {
    if (existingConfig) {
      setFormData(prev => ({
        ...prev,
        apiKey: existingConfig.api_key,
        autoSync: existingConfig.auto_sync_enabled,
        syncFrequency: existingConfig.sync_frequency_minutes
      }));
    }
  }, [existingConfig]);

  const handleApiKeyTest = async () => {
    if (!formData.apiKey.trim()) {
      setError('Please enter a Private Integration Token');
      return;
    }
    
    if (!formData.manualLocationId.trim()) {
      setError('Please enter a Location ID');
      return;
    }

    setError('');
    clearResult();

    try {
      const result = await testConnection(formData.apiKey, formData.manualLocationId);
      if (result.success) {
        setCurrentStep('sync_settings');
      } else {
        setError(result.error || 'Connection test failed. Please check your token and location ID.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const handleLocationSelect = (locationId: string) => {
    const location = availableLocations.find(loc => loc.id === locationId);
    if (location) {
      setFormData(prev => ({ ...prev, selectedLocation: location }));
    }
  };

  const handleNext = () => {
    const nextStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    setCurrentStep(steps[nextStepIndex].key);
  };

  const handlePrevious = () => {
    const prevStepIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(steps[prevStepIndex].key);
  };

  const handleComplete = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }
    
    if (!formData.manualLocationId) {
      setError('Please enter a location ID');
      return;
    }

    try {
      const configData: CreateGHLIntegrationInput | UpdateGHLIntegrationInput = {
        api_key: formData.apiKey,
        location_id: formData.manualLocationId,
        location_name: formData.manualLocationName || formData.manualLocationId,
        auto_sync_enabled: formData.autoSync,
        sync_frequency_minutes: formData.syncFrequency,
        skip_validation: true // Always skip validation for Private Integration Tokens
      };

      if (existingConfig) {
        await updateIntegration(configData as UpdateGHLIntegrationInput);
      } else {
        await createIntegration(configData as CreateGHLIntegrationInput);
      }

      setCurrentStep('completion');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full border-2
            ${index <= currentStepIndex 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'border-gray-300 text-gray-400'
            }
          `}>
            {index < currentStepIndex ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              step.icon
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`
              h-0.5 w-12 mx-2
              ${index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  const renderApiKeyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Enter Private Integration Token</h3>
        <p className="text-gray-600 text-sm">
          Enter your Go High Level Private Integration Token to connect your location.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="apiKey">Private Integration Token</Label>
          <Input
            id="apiKey"
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="Enter your Private Integration Token"
            className="mt-1"
          />
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>How to get a Private Integration Token:</strong>
            <ol className="list-decimal ml-5 mt-2">
              <li>Go to GHL Settings → Integrations → Private Apps</li>
              <li>Click "Create New Private Integration"</li>
              <li>Name your integration and select required scopes (calendars.readonly, calendars.write)</li>
              <li>Copy the generated token</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="locationId">Location ID</Label>
          <Input
            id="locationId"
            type="text"
            value={formData.manualLocationId}
            onChange={(e) => setFormData(prev => ({ ...prev, manualLocationId: e.target.value }))}
            placeholder="Enter your Location ID"
            className="mt-1"
          />
          <p className="text-xs text-gray-600 mt-1">
            Find your Location ID in GHL Settings → Business Profile
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => window.open('https://app.gohighlevel.com/settings/integrations', '_blank')}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open GHL Settings</span>
          </Button>
          <Button
            onClick={handleApiKeyTest}
            disabled={!formData.apiKey.trim() || !formData.manualLocationId.trim() || isTestingConnection}
            className="flex items-center space-x-2"
          >
            {isTestingConnection && <RefreshCw className="h-4 w-4 animate-spin" />}
            <span>Test & Continue</span>
          </Button>
        </div>
      </div>
    </div>
  );

  const renderLocationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Select Location</h3>
        <p className="text-gray-600 text-sm">
          Choose the GHL location to sync data from.
        </p>
      </div>

      <div className="space-y-4">
        {availableLocations.length > 0 ? (
          <>
            <div>
              <Label>Available Locations ({availableLocations.length})</Label>
              <Select
                value={formData.selectedLocation?.id || ''}
                onValueChange={handleLocationSelect}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{location.name}</span>
                        {location.city && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {location.city}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center text-sm text-gray-500">
              <span>— OR —</span>
            </div>
          </>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No locations found. You can enter the location ID manually below.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useManual"
              checked={formData.useManualEntry}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                useManualEntry: e.target.checked,
                selectedLocation: null 
              }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="useManual" className="cursor-pointer font-normal">
              Enter location details manually
            </Label>
          </div>
          
          {(formData.useManualEntry || availableLocations.length === 0) && (
            <>
              <div>
                <Label htmlFor="manualLocationId">Location ID</Label>
                <Input
                  id="manualLocationId"
                  type="text"
                  value={formData.manualLocationId}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    manualLocationId: e.target.value 
                  }))}
                  placeholder="Enter your GHL location ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manualLocationName">Location Name (optional)</Label>
                <Input
                  id="manualLocationName"
                  type="text"
                  value={formData.manualLocationName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    manualLocationName: e.target.value 
                  }))}
                  placeholder="Enter a name for this location"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!formData.selectedLocation && (!formData.useManualEntry || !formData.manualLocationId)}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSyncSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Sync Settings</h3>
        <p className="text-gray-600 text-sm">
          Set a name for your location and configure sync settings.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="locationName">Location Name (Optional)</Label>
          <Input
            id="locationName"
            type="text"
            value={formData.manualLocationName}
            onChange={(e) => setFormData(prev => ({ ...prev, manualLocationName: e.target.value }))}
            placeholder="Enter a friendly name for this location"
            className="mt-1"
          />
          <p className="text-xs text-gray-600 mt-1">
            This helps you identify the location in your dashboard
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Auto Sync</Label>
            <p className="text-sm text-gray-600">Automatically sync data at regular intervals</p>
          </div>
          <Switch
            checked={formData.autoSync}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, autoSync: checked }))
            }
          />
        </div>

        {formData.autoSync && (
          <div>
            <Label>Sync Frequency</Label>
            <Select
              value={formData.syncFrequency.toString()}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, syncFrequency: parseInt(value) }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="180">Every 3 hours</SelectItem>
                <SelectItem value="360">Every 6 hours</SelectItem>
                <SelectItem value="720">Every 12 hours</SelectItem>
                <SelectItem value="1440">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCreating || isUpdating}
            className="flex items-center space-x-2"
          >
            {(isCreating || isUpdating) && <RefreshCw className="h-4 w-4 animate-spin" />}
            <span>
              {existingConfig ? 'Update Integration' : 'Create Integration'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCompletionStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Integration Complete!</h3>
        <p className="text-gray-600">
          Your GHL integration has been {existingConfig ? 'updated' : 'set up'} successfully.
          Data syncing will begin automatically.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Location:</span>
            <p className="text-gray-600">
              {formData.manualLocationName || formData.manualLocationId}
            </p>
          </div>
          <div>
            <span className="font-medium">Auto Sync:</span>
            <p className="text-gray-600">
              {formData.autoSync ? `Every ${formData.syncFrequency} minutes` : 'Disabled'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'api_key':
        return renderApiKeyStep();
      case 'sync_settings':
        return renderSyncSettingsStep();
      case 'completion':
        return renderCompletionStep();
      default:
        return renderApiKeyStep();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>
              {existingConfig ? 'Update GHL Integration' : 'Setup GHL Integration'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {renderStepIndicator()}
          
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GHLSetupWizard;