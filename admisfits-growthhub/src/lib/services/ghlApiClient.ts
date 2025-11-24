// GHL API v2 Client for Sub Account Operations
// Handles authentication, rate limiting, and HTTP operations

import { 
  GHLLocation, 
  GHLAppointment, 
  GHLOpportunity, 
  GHLContact, 
  GHLInvoice,
  GHLApiParams 
} from '@/types/ghlIntegration';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = 'v2'; // Using API v2 for sub accounts

interface GHLApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    currentPage: number;
    nextPage?: number;
    prevPage?: number;
  };
}

interface GHLError {
  message: string;
  code?: string;
  statusCode: number;
}

export class GHLApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = `${GHL_BASE_URL}`;
  }

  /**
   * Make authenticated HTTP request to GHL API
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<GHLApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28', // GHL API version date
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Check for rate limiting
      this.checkRateLimit(response);

      if (!response.ok) {
        const error = await this.handleError(response);
        throw error;
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('GHL API request failed:', error);
      throw error;
    }
  }

  /**
   * Check rate limit headers and log usage
   */
  private checkRateLimit(response: Response): void {
    const dailyLimit = response.headers.get('X-RateLimit-Limit-Daily');
    const dailyRemaining = response.headers.get('X-RateLimit-Daily-Remaining');
    const burstRemaining = response.headers.get('X-RateLimit-Remaining');
    
    if (dailyRemaining && parseInt(dailyRemaining) < 1000) {
      console.warn('GHL API: Daily rate limit approaching', {
        dailyLimit,
        dailyRemaining,
        burstRemaining
      });
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<GHLError> {
    const contentType = response.headers.get('content-type');
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = response.status.toString();

    try {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code || errorCode;
      }
    } catch {
      // If error response is not JSON, use status text
    }

    return {
      message: errorMessage,
      code: errorCode,
      statusCode: response.status
    };
  }

  /**
   * Get location details by ID (Sub-Account permission)
   */
  async getLocation(locationId: string): Promise<GHLLocation> {
    const response = await this.makeRequest<GHLLocation>(
      `/locations/${locationId}`
    );
    return response.data;
  }

  /**
   * Search locations (Sub-Account permission)
   * For sub accounts, this typically returns the locations they have access to
   */
  async searchLocations(params?: {
    companyId?: string;
    limit?: number;
  }): Promise<GHLLocation[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const endpoint = `/locations/search${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.makeRequest<GHLLocation[]>(endpoint);
    return response.data;
  }

  /**
   * Get all locations the sub account has access to
   */
  async getAccessibleLocations(): Promise<GHLLocation[]> {
    const response = await this.makeRequest<GHLLocation[]>('/locations');
    return response.data;
  }

  /**
   * Validate API key and location access
   */
  async validateAccess(locationId: string): Promise<{
    isValid: boolean;
    location?: GHLLocation;
    error?: string;
  }> {
    try {
      const location = await this.getLocation(locationId);
      return {
        isValid: true,
        location
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Invalid API key or location access'
      };
    }
  }

  /**
   * Get appointments for a location with date filtering
   */
  async getAppointments(params: GHLApiParams & {
    locationId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<GHLAppointment[]> {
    const { locationId, ...queryParams } = params;
    const queryString = new URLSearchParams(queryParams as any).toString();
    const endpoint = `/locations/${locationId}/appointments${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.makeRequest<GHLAppointment[]>(endpoint);
    return response.data;
  }

  /**
   * Get opportunities/deals for a location
   */
  async getOpportunities(params: GHLApiParams & {
    locationId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<GHLOpportunity[]> {
    const { locationId, ...queryParams } = params;
    const queryString = new URLSearchParams(queryParams as any).toString();
    const endpoint = `/locations/${locationId}/opportunities${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.makeRequest<GHLOpportunity[]>(endpoint);
    return response.data;
  }

  /**
   * Get contacts for a location
   */
  async getContacts(params: GHLApiParams & {
    locationId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<GHLContact[]> {
    const { locationId, ...queryParams } = params;
    const queryString = new URLSearchParams(queryParams as any).toString();
    const endpoint = `/contacts?locationId=${locationId}${queryString ? `&${queryString}` : ''}`;
    
    const response = await this.makeRequest<GHLContact[]>(endpoint);
    return response.data;
  }

  /**
   * Get invoices for a location
   */
  async getInvoices(params: GHLApiParams & {
    locationId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<GHLInvoice[]> {
    const { locationId, ...queryParams } = params;
    const queryString = new URLSearchParams(queryParams as any).toString();
    const endpoint = `/locations/${locationId}/invoices${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.makeRequest<GHLInvoice[]>(endpoint);
    return response.data;
  }

  /**
   * Test API connectivity and permissions
   */
  async testConnection(): Promise<{
    success: boolean;
    locations?: GHLLocation[];
    error?: string;
  }> {
    try {
      const locations = await this.getAccessibleLocations();
      return {
        success: true,
        locations
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to GHL API'
      };
    }
  }
}

// Utility functions for common operations

/**
 * Create GHL API client instance
 */
export const createGHLClient = (apiKey: string): GHLApiClient => {
  return new GHLApiClient(apiKey);
};

/**
 * Format date for GHL API (YYYY-MM-DD)
 */
export const formatGHLDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
};

/**
 * Parse GHL datetime string to Date object
 */
export const parseGHLDateTime = (dateTimeString: string): Date => {
  return new Date(dateTimeString);
};

/**
 * Calculate date range for GHL API queries
 */
export const getDateRange = (
  startDate: Date | string, 
  endDate: Date | string
): { startDate: string; endDate: string } => {
  return {
    startDate: formatGHLDate(startDate),
    endDate: formatGHLDate(endDate)
  };
};