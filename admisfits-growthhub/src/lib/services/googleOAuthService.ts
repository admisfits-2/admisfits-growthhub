import { supabase } from '@/integrations/supabase/client';

// Google OAuth Configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  apiVersion: 'v4',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly', // Read access to spreadsheets
    'https://www.googleapis.com/auth/drive.readonly', // List spreadsheets in Drive
    'https://www.googleapis.com/auth/drive.metadata.readonly', // Additional metadata access for shared files
    'https://www.googleapis.com/auth/drive.file', // Access to files shared with the user
    'profile',
    'email'
  ],
};

// OAuth Token Interface
export interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
}

// Google User Profile
export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

// Google Spreadsheet
export interface GoogleSpreadsheet {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  owners: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  shared?: boolean;
  permissions?: Array<{
    id: string;
    type: string;
    role: string;
    emailAddress?: string;
  }>;
  capabilities?: {
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canCopy: boolean;
  };
}

// Google Sheet (tab within spreadsheet)
export interface GoogleSheet {
  sheetId: number;
  title: string;
  sheetType: string;
  gridProperties: {
    rowCount: number;
    columnCount: number;
  };
}

// Google Spreadsheet Details
export interface GoogleSpreadsheetDetails {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    timeZone: string;
  };
  sheets: GoogleSheet[];
}

// Project Google Connection Interface
export interface ProjectGoogleConnection {
  id: string;
  project_id: string;
  user_email: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class GoogleOAuthService {
  // Generate OAuth URL
  static getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
      ...(state && { state }),
    });

    return `${GOOGLE_OAUTH_CONFIG.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  static async exchangeCodeForToken(code: string): Promise<GoogleToken> {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      grant_type: 'authorization_code',
      code,
    });

    try {
      const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to exchange code: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Calculate expiration timestamp
      if (data.expires_in) {
        data.expires_at = Date.now() + (data.expires_in * 1000);
      }

      return data;
    } catch (error) {
      console.error('Google OAuth token exchange failed:', error);
      throw error;
    }
  }

  // Refresh access token
  static async refreshToken(refreshToken: string): Promise<GoogleToken> {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to refresh token: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Calculate expiration timestamp
      if (data.expires_in) {
        data.expires_at = Date.now() + (data.expires_in * 1000);
      }

      return data;
    } catch (error) {
      console.error('Google token refresh failed:', error);
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get user profile: ${error.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch Google user profile:', error);
      throw error;
    }
  }

  // List user's spreadsheets (including shared files)
  static async getSpreadsheets(accessToken: string): Promise<GoogleSpreadsheet[]> {
    try {
      // Use Drive API to list spreadsheets including shared ones
      // Include files shared with 'me' to get all accessible files regardless of organization
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=(mimeType='application/vnd.google-apps.spreadsheet') and (trashed=false) and ('me' in readers or 'me' in writers or sharedWithMe=true)&fields=files(id,name,createdTime,modifiedTime,webViewLink,owners,shared,permissions,capabilities)&orderBy=modifiedTime desc&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get spreadsheets: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Failed to fetch Google spreadsheets:', error);
      throw error;
    }
  }

  // Get spreadsheet details including sheets
  static async getSpreadsheetDetails(spreadsheetId: string, accessToken: string): Promise<GoogleSpreadsheetDetails> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get spreadsheet details: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        spreadsheetId: data.spreadsheetId,
        properties: data.properties,
        sheets: data.sheets.map((sheet: any) => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          sheetType: sheet.properties.sheetType || 'GRID',
          gridProperties: sheet.properties.gridProperties || { rowCount: 0, columnCount: 0 },
        })),
      };
    } catch (error) {
      console.error('Failed to fetch spreadsheet details:', error);
      throw error;
    }
  }

  // Get sheet data with OAuth token
  static async getSheetData(spreadsheetId: string, range: string, accessToken: string): Promise<any[][]> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get sheet data: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Failed to fetch sheet data:', error);
      throw error;
    }
  }

  // Save connection to localStorage (temporary approach)
  static saveConnectionToLocalStorage(
    projectId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    userEmail?: string
  ): ProjectGoogleConnection {
    const connection: ProjectGoogleConnection = {
      id: `temp_${projectId}`,
      project_id: projectId,
      user_email: userEmail || '',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(`google_connection_${projectId}`, JSON.stringify(connection));
    return connection;
  }

  // Save connection to database (fallback to localStorage if table doesn't exist)
  static async saveConnection(
    projectId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    userEmail?: string
  ): Promise<ProjectGoogleConnection> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_google_connections')
        .upsert({
          project_id: projectId,
          user_email: userEmail || user.user.email,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: true,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST106') {
          // Table doesn't exist - fall back to localStorage
          console.warn('Google connections table not available, using localStorage fallback');
          return this.saveConnectionToLocalStorage(projectId, accessToken, refreshToken, expiresAt, userEmail);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.warn('Database save failed, falling back to localStorage:', error);
      return this.saveConnectionToLocalStorage(projectId, accessToken, refreshToken, expiresAt, userEmail);
    }
  }

  // Get connection from localStorage
  static getConnectionFromLocalStorage(projectId: string): ProjectGoogleConnection | null {
    try {
      const stored = localStorage.getItem(`google_connection_${projectId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to get connection from localStorage:', error);
    }
    return null;
  }

  // Get connection for a project (try database first, then localStorage)
  static async getConnection(projectId: string): Promise<ProjectGoogleConnection | null> {
    try {
      // Get current user to check email domain
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || '';
      const isAdmisfitsUser = userEmail.endsWith('@admisfits.com');

      // Build query based on user type
      let query = supabase
        .from('project_google_connections')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      // If not an @admisfits.com user, filter by user_id
      if (!isAdmisfitsUser && userData?.user?.id) {
        query = query.eq('user_id', userData.user.id);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // No connection found or table doesn't exist - check localStorage
          return this.getConnectionFromLocalStorage(projectId);
        }
        console.error('Failed to get Google connection:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.warn('Database query failed, checking localStorage:', error);
      return this.getConnectionFromLocalStorage(projectId);
    }
  }

  // Disconnect (deactivate) a connection
  static async disconnectConnection(projectId: string): Promise<void> {
    try {
      // Get current user to check email domain
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || '';
      const isAdmisfitsUser = userEmail.endsWith('@admisfits.com');

      let query = supabase
        .from('project_google_connections')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // If not an @admisfits.com user, filter by user_id
      if (!isAdmisfitsUser && userData?.user?.id) {
        query = query.eq('user_id', userData.user.id);
      }

      const { error } = await query;

      if (error && error.code !== '42P01') {
        console.error('Failed to disconnect Google connection:', error);
        throw error;
      }
    } catch (error) {
      console.warn('Database disconnect failed, clearing localStorage:', error);
    }
    
    // Always clear localStorage connection
    localStorage.removeItem(`google_connection_${projectId}`);
  }

  // Get valid access token (refresh if needed)
  static async getValidAccessToken(connection: ProjectGoogleConnection): Promise<string> {
    // Check if token is expired or about to expire (within 5 minutes)
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at).getTime();
      const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
      
      if (expiresAt < fiveMinutesFromNow && connection.refresh_token) {
        // Token is expired or about to expire, refresh it
        try {
          const newToken = await this.refreshToken(connection.refresh_token);
          
          // Update the connection with new token
          await this.saveConnection(
            connection.project_id,
            newToken.access_token,
            connection.refresh_token, // Keep the same refresh token
            newToken.expires_at
          );
          
          return newToken.access_token;
        } catch (error) {
          console.error('Failed to refresh Google token:', error);
          throw new Error('Failed to refresh access token. Please reconnect your Google account.');
        }
      }
    }
    
    return connection.access_token;
  }

  // Test connection
  static async testConnection(accessToken: string): Promise<{ success: boolean; message: string; userEmail?: string }> {
    try {
      const profile = await this.getUserProfile(accessToken);
      
      return {
        success: true,
        message: `Successfully connected as ${profile.name}`,
        userEmail: profile.email,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Google',
      };
    }
  }
}