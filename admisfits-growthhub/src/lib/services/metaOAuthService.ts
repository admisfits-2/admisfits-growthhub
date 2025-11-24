import { supabase } from '@/integrations/supabase/client';

// Meta OAuth Configuration
const META_OAUTH_CONFIG = {
  appId: import.meta.env.VITE_META_APP_ID || '',
  appSecret: import.meta.env.VITE_META_APP_SECRET || '',
  redirectUri: import.meta.env.VITE_META_REDIRECT_URI || 'http://localhost:5173/auth/meta/callback',
  authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
  apiVersion: 'v22.0',
};

// OAuth Token Interface
export interface MetaToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
}

// Meta User Profile
export interface MetaUserProfile {
  id: string;
  name: string;
  email?: string;
}

// Meta Ad Account
export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  account_status: number;
}

// Project Meta Connection Interface
export interface ProjectMetaConnection {
  id: string;
  project_id: string;
  ad_account_id: string;
  ad_account_name: string;
  access_token: string;
  expires_at?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MetaOAuthService {
  // Generate OAuth URL
  static getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: META_OAUTH_CONFIG.appId,
      redirect_uri: META_OAUTH_CONFIG.redirectUri,
      scope: 'ads_read,read_insights,business_management,email',
      response_type: 'code',
      ...(state && { state }),
    });

    return `${META_OAUTH_CONFIG.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  static async exchangeCodeForToken(code: string): Promise<MetaToken> {
    const params = new URLSearchParams({
      client_id: META_OAUTH_CONFIG.appId,
      client_secret: META_OAUTH_CONFIG.appSecret,
      redirect_uri: META_OAUTH_CONFIG.redirectUri,
      code,
    });

    try {
      const response = await fetch(`${META_OAUTH_CONFIG.tokenUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to exchange code: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Calculate expiration timestamp
      if (data.expires_in) {
        data.expires_at = Date.now() + (data.expires_in * 1000);
      }

      return data;
    } catch (error) {
      console.error('Meta OAuth token exchange failed:', error);
      throw error;
    }
  }

  // Exchange short-lived token for long-lived token
  static async getLongLivedToken(shortLivedToken: string): Promise<MetaToken> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_OAUTH_CONFIG.appId,
      client_secret: META_OAUTH_CONFIG.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    try {
      const response = await fetch(`${META_OAUTH_CONFIG.tokenUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get long-lived token: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Calculate expiration timestamp (typically 60 days)
      if (data.expires_in) {
        data.expires_at = Date.now() + (data.expires_in * 1000);
      }

      return data;
    } catch (error) {
      console.error('Meta long-lived token exchange failed:', error);
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(accessToken: string): Promise<MetaUserProfile> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${META_OAUTH_CONFIG.apiVersion}/me?fields=id,name,email&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get user profile: ${error.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch Meta user profile:', error);
      throw error;
    }
  }

  // Get ad accounts
  static async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${META_OAUTH_CONFIG.apiVersion}/me/adaccounts?fields=id,name,account_id,currency,account_status&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get ad accounts: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch Meta ad accounts:', error);
      throw error;
    }
  }

  // Save connection to database
  static async saveConnection(
    projectId: string,
    adAccountId: string,
    adAccountName: string,
    accessToken: string,
    expiresAt?: number
  ): Promise<ProjectMetaConnection> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_meta_connections')
      .upsert({
        project_id: projectId,
        ad_account_id: adAccountId,
        ad_account_name: adAccountName,
        access_token: accessToken,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
        user_id: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save Meta connection:', error);
      throw error;
    }

    return data;
  }

  // Get connection for a project
  static async getConnection(projectId: string): Promise<ProjectMetaConnection | null> {
    // Get current user to check email domain
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email || '';
    const isAdmisfitsUser = userEmail.endsWith('@admisfits.com');

    // Build query based on user type
    let query = supabase
      .from('project_meta_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    // If not an @admisfits.com user, filter by user_id
    if (!isAdmisfitsUser && userData?.user?.id) {
      query = query.eq('user_id', userData.user.id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No connection found
      console.error('Failed to get Meta connection:', error);
      throw error;
    }

    return data;
  }

  // Disconnect (deactivate) a connection
  static async disconnectConnection(projectId: string): Promise<void> {
    // Get current user to check email domain
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email || '';
    const isAdmisfitsUser = userEmail.endsWith('@admisfits.com');

    let query = supabase
      .from('project_meta_connections')
      .update({ is_active: false })
      .eq('project_id', projectId);

    // If not an @admisfits.com user, filter by user_id
    if (!isAdmisfitsUser && userData?.user?.id) {
      query = query.eq('user_id', userData.user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to disconnect Meta connection:', error);
      throw error;
    }
  }

  // Refresh token if needed
  static async refreshTokenIfNeeded(connection: ProjectMetaConnection): Promise<string> {
    // Check if token is expired or about to expire (within 1 day)
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at).getTime();
      const oneDayFromNow = Date.now() + (24 * 60 * 60 * 1000);
      
      if (expiresAt < oneDayFromNow) {
        // Token is expired or about to expire, refresh it
        try {
          const newToken = await this.getLongLivedToken(connection.access_token);
          
          // Update the connection with new token
          await this.saveConnection(
            connection.project_id,
            connection.ad_account_id,
            connection.ad_account_name,
            newToken.access_token,
            newToken.expires_at
          );
          
          return newToken.access_token;
        } catch (error) {
          console.error('Failed to refresh Meta token:', error);
          // Return existing token and let the API call fail if it's truly expired
          return connection.access_token;
        }
      }
    }
    
    return connection.access_token;
  }
}