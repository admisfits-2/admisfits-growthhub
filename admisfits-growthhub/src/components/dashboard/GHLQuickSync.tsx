// GHL Quick Sync Component
// Provides manual sync controls and date range selection

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Calendar,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useGHLIntegration } from '@/hooks/useGHLIntegration';
import { useAuth } from '@/hooks/useAuth';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface GHLQuickSyncProps {
  projectId: string;
}

const GHLQuickSync: React.FC<GHLQuickSyncProps> = ({ projectId }) => {
  const { user } = useAuth();
  const { triggerSync, isSyncing, syncError } = useGHLIntegration(projectId);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7), // Last 7 days
    to: new Date()
  });
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleManualSync = async (range?: DateRange) => {
    if (!user) return;

    setSyncSuccess(false);
    
    try {
      await triggerSync(range ? {
        startDate: range.from || new Date(),
        endDate: range.to || new Date()
      } : undefined);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 5000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const quickSyncOptions = [
    {
      label: 'Last 24 Hours',
      range: {
        from: subDays(new Date(), 1),
        to: new Date()
      }
    },
    {
      label: 'Last 7 Days',
      range: {
        from: subDays(new Date(), 7),
        to: new Date()
      }
    },
    {
      label: 'Last 30 Days',
      range: {
        from: subDays(new Date(), 30),
        to: new Date()
      }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <span>Manual Sync</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Message */}
        {syncSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Data sync completed successfully! Your metrics have been updated.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {syncError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sync Error:</strong> {syncError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Sync Buttons */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Quick Sync Options</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {quickSyncOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => handleManualSync(option.range)}
                disabled={isSyncing}
                className="flex items-center justify-center space-x-2"
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Custom Date Range</label>
          <div className="flex items-center space-x-2">
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              className="flex-1"
            />
            <Button
              onClick={() => handleManualSync(dateRange)}
              disabled={isSyncing || !dateRange?.from || !dateRange?.to}
              className="flex items-center space-x-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Sync Range</span>
            </Button>
          </div>
        </div>

        {/* Sync Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Manual Sync Information</p>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• Syncs appointments, deals, and revenue data from GHL</li>
                <li>• Data is stored in your project metrics for analysis</li>
                <li>• Large date ranges may take longer to process</li>
                <li>• Automatic sync will continue as configured</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isSyncing && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Syncing Data...</p>
                <p className="text-xs text-gray-600">
                  Fetching data from GHL and updating your metrics
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GHLQuickSync;