// Environment configuration for the application
export const env = {

  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',

  // Meta Ads Configuration
  META_APP_ID: import.meta.env.VITE_META_APP_ID || '',
  META_APP_SECRET: import.meta.env.VITE_META_APP_SECRET || '',
  META_ADS_ACCESS_TOKEN: import.meta.env.VITE_META_ADS_ACCESS_TOKEN || '',
  META_ADS_AD_ACCOUNT_ID: import.meta.env.VITE_META_ADS_AD_ACCOUNT_ID || '',
  META_REDIRECT_URI: import.meta.env.VITE_META_REDIRECT_URI || 'http://localhost:5173/auth/meta/callback',

  // Application Configuration
  NODE_ENV: import.meta.env.MODE || 'development',
  IS_DEVELOPMENT: import.meta.env.DEV || false,
  IS_PRODUCTION: import.meta.env.PROD || false,
};

// Validate required environment variables
export function validateEnvironment() {
  const requiredVars: string[] = [];

  const optionalVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missingRequiredVars = requiredVars.filter(varName => !env[varName as keyof typeof env]);
  const missingOptionalVars = optionalVars.filter(varName => !env[varName as keyof typeof env]);

  if (missingRequiredVars.length > 0) {
    console.warn('Missing required environment variables:', missingRequiredVars);
    console.warn('Please check your .env file and ensure all required variables are set.');
  }

  if (missingOptionalVars.length > 0) {
    console.warn('Missing optional environment variables (caching will be disabled):', missingOptionalVars);
  }

  return missingRequiredVars.length === 0;
}


// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(env.SUPABASE_URL && 
           env.SUPABASE_ANON_KEY && 
           env.SUPABASE_URL.startsWith('http') &&
           env.SUPABASE_URL !== 'your_supabase_url_here' &&
           env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here');
} 