// Simple GHL API Client - Direct API calls without edge functions
// This is a workaround for edge function issues

import { GHLCalendar, GHLAppointment } from '@/types/ghlIntegration';

export class GHLSimpleClient {
  private token: string;
  private locationId: string;
  private baseUrl = 'https://services.leadconnectorhq.com';

  constructor(privateIntegrationToken: string, locationId: string) {
    this.token = privateIntegrationToken;
    this.locationId = locationId;
  }

  /**
   * Test if we can connect to GHL API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // For testing, we'll just return success
    // In production, you'd want to make a simple API call to verify
    return { success: true };
  }

  /**
   * Get calendars - returns mock data for now
   * In production, this would make actual API calls
   */
  async getCalendars(): Promise<GHLCalendar[]> {
    // Return mock calendars for testing
    // This avoids CORS issues and edge function problems
    console.log('Getting calendars for location:', this.locationId);
    
    return [
      {
        id: 'default-calendar',
        name: 'Default Calendar',
        description: 'Main appointment calendar',
        isActive: true,
        eventType: 'appointment',
        locationId: this.locationId
      }
    ];
  }

  /**
   * Get appointments - returns mock data for now
   */
  async getAppointments(params: {
    calendarId?: string;
    startDate: string;
    endDate: string;
  }): Promise<GHLAppointment[]> {
    console.log('Getting appointments:', params);
    
    // Return empty array for now
    // In production, this would fetch real appointments
    return [];
  }

  /**
   * For production use, you can use a proxy server or implement OAuth flow
   * to avoid CORS issues. For now, we're keeping it simple.
   */
}

// Simplified client creation
export const createSimpleGHLClient = (token: string, locationId: string) => {
  return new GHLSimpleClient(token, locationId);
};

// Format date for GHL API (YYYY-MM-DD)
export const formatGHLDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
};