// Real GHL API Client - Actual API calls with proper error handling
// Uses a proxy approach to avoid CORS issues

import { GHLCalendar, GHLAppointment } from '@/types/ghlIntegration';
import { supabase } from '@/integrations/supabase/client';

export class GHLRealClient {
  private token: string;
  private locationId: string;
  private baseUrl = 'https://services.leadconnectorhq.com';
  private useMockData = false; // Set to true to use mock data instead of real API
  private useEdgeFunction = true; // Use Supabase edge function to avoid CORS
  private edgeFunctionDeployed = true; // Set to true once edge function is deployed

  constructor(privateIntegrationToken: string, locationId: string) {
    this.token = privateIntegrationToken;
    this.locationId = locationId;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Use edge function if enabled and deployed
    if (this.useEdgeFunction && this.edgeFunctionDeployed) {
      try {
        console.log(`Making GHL API request via edge function: ${endpoint}`);
        
        const { data, error } = await supabase.functions.invoke('ghl-proxy', {
          body: {
            endpoint,
            token: this.token,
            locationId: this.locationId,
            method: options.method || 'GET',
            body: options.body ? JSON.parse(options.body as string) : undefined
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(error.message || 'Edge function request failed');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (error) {
        console.error('Edge function request failed:', error);
        // If edge function fails, fall back to direct request
        if (this.useMockData) {
          throw error;
        }
        console.log('Falling back to direct API request...');
        this.useEdgeFunction = false;
      }
    }

    // Direct API request (will likely fail due to CORS in browser)
    try {
      const url = this.baseUrl + endpoint;
      console.log(`Making direct GHL API request: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-07-28',
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

  /**
   * Test if we can connect to GHL API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (this.useMockData) {
      console.log('Using mock data - connection test passed');
      return { success: true };
    }
    
    try {
      // Try to fetch the current user to test the token
      await this.makeRequest('/users/me');
      return { success: true };
    } catch (error: any) {
      // If CORS errors occur, suggest using mock data
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'CORS error: Unable to connect to GHL API directly from browser. Consider using a backend proxy or enabling mock mode.' 
        };
      }
      return { 
        success: false, 
        error: error.message || 'Failed to connect to GHL API' 
      };
    }
  }

  /**
   * Get calendars for the location
   */
  async getCalendars(): Promise<GHLCalendar[]> {
    if (this.useMockData) {
      console.log('Returning mock calendar data');
      return [
        {
          id: 'mock-calendar-1',
          name: 'Main Calendar',
          description: 'Primary appointment calendar',
          isActive: true,
          eventType: 'appointment',
          locationId: this.locationId
        },
        {
          id: 'mock-calendar-2',
          name: 'Sales Calendar',
          description: 'Sales team appointments',
          isActive: true,
          eventType: 'appointment',
          locationId: this.locationId
        }
      ];
    }
    
    try {
      console.log('Fetching real calendars from GHL API...');
      
      // GHL v2 API calendar endpoints
      // Note: Private Integration Tokens have limited endpoint support
      const endpoints = [
        `/calendars/services?locationId=${this.locationId}`, // Calendar services
        `/calendars/groups?locationId=${this.locationId}`, // Calendar groups
        `/calendars/events?locationId=${this.locationId}&startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 86400000).toISOString()}` // Try events endpoint
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await this.makeRequest(endpoint);
          
          // Handle different response formats
          if (response.calendars && Array.isArray(response.calendars)) {
            return response.calendars;
          }
          
          if (response.services && Array.isArray(response.services)) {
            // Map services to calendar format
            return response.services.map((service: any) => ({
              id: service.id,
              name: service.name,
              description: service.description,
              isActive: service.isActive,
              eventType: service.widgetType || 'appointment',
              locationId: this.locationId
            }));
          }
          
          if (Array.isArray(response)) {
            return response;
          }
        } catch (error) {
          console.error(`Endpoint ${endpoint} failed:`, error);
          continue;
        }
      }
      
      // If no calendars found, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  /**
   * Get appointments for a calendar
   */
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

// Create a real GHL client
export const createGHLRealClient = (token: string, locationId: string, useMockData = false) => {
  const client = new GHLRealClient(token, locationId);
  if (useMockData) {
    // Only use mock data if explicitly requested
    client.useMockData = true;
  }
  return client;
};