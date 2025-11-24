import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import { useGHLIntegration } from '@/hooks/useGHLIntegration';
import { GHLIntegrationService } from '@/lib/services/ghlIntegrationService';
import { createGHLRealClient } from '@/lib/services/ghlRealClient';
import { shouldUseMockData } from '@/lib/config/ghlConfig';
import { GHLCalendar, GHLIntegration } from '@/types/ghlIntegration';
import { formatDistanceToNow } from 'date-fns';

interface GHLCalendarManagerProps {
  projectId: string;
  integrationConfig: GHLIntegration;
}

const GHLCalendarManager: React.FC<GHLCalendarManagerProps> = ({ 
  projectId, 
  integrationConfig 
}) => {
  const { updateIntegration, isUpdating } = useGHLIntegration(projectId);
  const [calendars, setCalendars] = useState<GHLCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(
    integrationConfig.selected_calendar_ids || []
  );
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [error, setError] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [showManualCalendarAdd, setShowManualCalendarAdd] = useState(false);
  const [manualCalendarId, setManualCalendarId] = useState('');
  const [manualCalendarName, setManualCalendarName] = useState('');

  // Fetch calendars on component mount
  useEffect(() => {
    fetchCalendars();
    
    // Load saved calendar selection from localStorage as workaround
    const savedSelection = localStorage.getItem(`ghl_calendars_${integrationConfig.id}`);
    if (savedSelection) {
      try {
        const { calendar_ids, calendars } = JSON.parse(savedSelection);
        setSelectedCalendarIds(calendar_ids || []);
        if (calendars && calendars.length > 0) {
          setCalendars(calendars);
        }
      } catch (e) {
        console.error('Error loading saved calendars:', e);
      }
    }
  }, [integrationConfig.api_key, integrationConfig.location_id]);

  const fetchCalendars = async () => {
    setIsLoadingCalendars(true);
    setError('');

    try {
      let fetchedCalendars: GHLCalendar[] = [];
      let lastError: any = null;
      
      // Use Simple Client to avoid edge function issues
      try {
        console.log('Fetching calendars...');
        const client = createGHLRealClient(integrationConfig.api_key, integrationConfig.location_id, shouldUseMockData());
        fetchedCalendars = await client.getCalendars();
        console.log('Found calendars:', fetchedCalendars.length);
      } catch (error) {
        console.error('Failed to fetch calendars:', error);
        lastError = error;
      }

      setCalendars(fetchedCalendars);
      
      // If no calendars selected yet, auto-select all active ones
      if (!integrationConfig.selected_calendar_ids?.length && fetchedCalendars.length > 0) {
        const activeCalendarIds = fetchedCalendars
          .filter(cal => cal.isActive !== false)
          .map(cal => cal.id);
        setSelectedCalendarIds(activeCalendarIds);
      }
      
      if (fetchedCalendars.length === 0) {
        // Provide more specific error message based on the error
        if (lastError) {
          const errorMessage = lastError?.details?.message || lastError?.message || 'Unknown error';
          const errorDetails = lastError?.details || {};
          
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            setError('Authorization failed. Please check your API key is valid and has the necessary permissions.');
          } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            setError('Access forbidden. Your API key may not have calendar permissions for this location.');
          } else if (errorMessage.includes('404')) {
            setError('Calendar endpoint not found. This may indicate calendars are not enabled for this location.');
          } else {
            setError(`Failed to fetch calendars. ${errorMessage}. Please check your GHL setup and permissions.`);
          }
          
          console.error('Calendar fetch error details:', errorDetails);
        } else {
          setError('No calendars found for this location. Please ensure calendars are set up in your GHL account.');
        }
      }
    } catch (error: any) {
      console.error('Unexpected error fetching calendars:', error);
      const errorMessage = error?.details?.message || error?.message || 'Unknown error';
      setError(`Failed to fetch calendars: ${errorMessage}`);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendarIds(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  };

  const handleSaveSelection = async () => {
    try {
      const selectedCalendarNames = calendars
        .filter(cal => selectedCalendarIds.includes(cal.id))
        .map(cal => cal.name);

      console.log('Saving calendar selection:', {
        selected_calendar_ids: selectedCalendarIds,
        selected_calendar_names: selectedCalendarNames
      });

      // Save to localStorage as workaround until database columns exist
      localStorage.setItem(`ghl_calendars_${integrationConfig.id}`, JSON.stringify({
        calendar_ids: selectedCalendarIds,
        calendar_names: selectedCalendarNames,
        calendars: calendars
      }));
      
      await updateIntegration({
        selected_calendar_ids: selectedCalendarIds,
        selected_calendar_names: selectedCalendarNames
      });

      setError(''); // Clear any previous errors
      // Show success message temporarily
      setError('Calendar selection saved successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error: any) {
      console.error('Error saving calendar selection:', error);
      const errorMessage = error?.message || 'Failed to save calendar selection';
      setError(errorMessage);
    }
  };

  const handleAddManualCalendar = () => {
    if (!manualCalendarId || !manualCalendarName) {
      setError('Please provide both Calendar ID and Name');
      return;
    }

    const newCalendar: GHLCalendar = {
      id: manualCalendarId,
      name: manualCalendarName,
      description: 'Manually added calendar',
      isActive: true,
      eventType: 'appointment',
      locationId: integrationConfig.location_id
    };

    setCalendars([...calendars, newCalendar]);
    setSelectedCalendarIds([...selectedCalendarIds, manualCalendarId]);
    setManualCalendarId('');
    setManualCalendarName('');
    setShowManualCalendarAdd(false);
    setError('');
  };

  const renderCalendarMetrics = () => {
    if (!integrationConfig.selected_calendar_ids?.length) {
      return (
        <Alert>
          <CalendarDays className="h-4 w-4" />
          <AlertDescription>
            Please select calendars to view appointment metrics.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">No Shows</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Calendar Selection</span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchCalendars}
              disabled={isLoadingCalendars}
            >
              {isLoadingCalendars ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className={`mb-4 ${error.includes('successfully') ? 'border-green-500' : ''}`}>
              {error.includes('successfully') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className={error.includes('successfully') ? 'text-green-800' : ''}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {isLoadingCalendars ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading calendars...</p>
            </div>
          ) : calendars.length === 0 && !showManualCalendarAdd ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  No calendars found via API. This could mean:
                  <ul className="list-disc ml-5 mt-2">
                    <li>Your API key doesn't have calendar permissions</li>
                    <li>No calendars are set up in your GHL location</li>
                    <li>The calendar endpoint is not accessible</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setShowManualCalendarAdd(true)}
                >
                  Add Calendar Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {showManualCalendarAdd && (
                <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Add Calendar Manually</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="calendar-id">Calendar ID</Label>
                      <Input
                        id="calendar-id"
                        value={manualCalendarId}
                        onChange={(e) => setManualCalendarId(e.target.value)}
                        placeholder="Enter GHL Calendar ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendar-name">Calendar Name</Label>
                      <Input
                        id="calendar-name"
                        value={manualCalendarName}
                        onChange={(e) => setManualCalendarName(e.target.value)}
                        placeholder="Enter Calendar Name"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleAddManualCalendar}
                      >
                        Add Calendar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowManualCalendarAdd(false);
                          setManualCalendarId('');
                          setManualCalendarName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {calendars.map(calendar => (
                <div
                  key={calendar.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    id={calendar.id}
                    checked={selectedCalendarIds.includes(calendar.id)}
                    onCheckedChange={() => handleCalendarToggle(calendar.id)}
                  />
                  <label
                    htmlFor={calendar.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{calendar.name}</p>
                        {calendar.description && (
                          <p className="text-sm text-gray-600">{calendar.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {calendar.isActive === false && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {calendar.eventType && (
                          <Badge variant="outline">{calendar.eventType}</Badge>
                        )}
                        {calendar.description === 'Manually added calendar' && (
                          <Badge variant="secondary">Manual</Badge>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              ))}

              {calendars.length > 0 && !showManualCalendarAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowManualCalendarAdd(true)}
                  className="w-full"
                >
                  Add Another Calendar Manually
                </Button>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveSelection}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Selection'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Appointment Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderCalendarMetrics()}
        </CardContent>
      </Card>

      {/* Selected Calendars Summary */}
      {integrationConfig.selected_calendar_names?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Syncing Calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {integrationConfig.selected_calendar_names.map((name, idx) => (
                <Badge key={idx} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GHLCalendarManager;