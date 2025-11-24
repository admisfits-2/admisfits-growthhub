// Direct GHL API Client - Bypasses edge function for testing
// This will likely cause CORS errors but can be used as a fallback

import { GHLCalendar, GHLAppointment } from '@/types/ghlIntegration';

export class GHLRealClientDirect {
  private token: string;
  private locationId: string;
  private baseUrl = 'https://services.leadconnectorhq.com';

  constructor(privateIntegrationToken: string, locationId: string) {
    this.token = privateIntegrationToken;
    this.locationId = locationId;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = this.baseUrl + endpoint;
    console.log(`Making direct GHL API request: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-07-28',
          'X-Company-Id': this.locationId,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Direct API request failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try a simple endpoint to test the token
      await this.makeRequest(`/locations/${this.locationId}`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to connect to GHL API' 
      };
    }
  }

  async getCalendars(): Promise<GHLCalendar[]> {
    console.log('Fetching calendars directly from GHL API...');
    
    try {
      // Try the main calendar endpoint
      const response = await this.makeRequest(`/locations/${this.locationId}/calendars`);
      
      if (response.calendars && Array.isArray(response.calendars)) {
        return response.calendars;
      }
      
      if (Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      
      // Return mock data as fallback
      return [
        {
          id: 'fallback-calendar-1',
          name: 'Default Calendar (API Error - Using Fallback)',
          description: 'Calendar data unavailable due to API error',
          isActive: true,
          eventType: 'appointment',
          locationId: this.locationId
        }
      ];
    }
  }

  async getAppointments(params: {
    calendarId?: string;
    startDate: string;
    endDate: string;
  }): Promise<GHLAppointment[]> {
    try {
      const endpoint = `/calendars/events?locationId=${this.locationId}&startDate=${params.startDate}&endDate=${params.endDate}` +
        (params.calendarId ? `&calendarId=${params.calendarId}` : '');
      
      const response = await this.makeRequest(endpoint);
      
      if (response.events && Array.isArray(response.events)) {
        return response.events;
      }
      
      if (Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }
}

// Create a direct GHL client
export const createGHLRealClientDirect = (token: string, locationId: string) => {
  return new GHLRealClientDirect(token, locationId);
};