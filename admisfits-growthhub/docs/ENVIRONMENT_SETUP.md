# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```bash
# Supabase Configuration (Required for data storage)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google OAuth Configuration (for Google Sheets integration)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Meta Ads Configuration (for advertising data)
VITE_META_APP_ID=your_meta_app_id_here
VITE_META_APP_SECRET=your_meta_app_secret_here
VITE_META_REDIRECT_URI=http://localhost:5173/auth/meta/callback
```

## How to Get Supabase Credentials

1. **Create a Supabase Account**:
   - Visit [supabase.com](https://supabase.com)
   - Sign up for a free account

2. **Create a New Project**:
   - Click "New Project"
   - Choose your organization
   - Enter project name and database password
   - Select a region close to your users

3. **Get API Credentials**:
   - Go to Settings → API
   - Copy the "Project URL" for `VITE_SUPABASE_URL`
   - Copy the "anon public" key for `VITE_SUPABASE_ANON_KEY`

## How to Get Google OAuth Credentials

1. **Go to Google Cloud Console**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable APIs**:
   - Go to APIs & Services → Library
   - Enable "Google Sheets API"
   - Enable "Google Drive API"

3. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:5173/auth/google/callback`
   - Copy Client ID and Client Secret

## How to Get Meta Ads Credentials

1. **Create Meta App**:
   - Visit [developers.facebook.com](https://developers.facebook.com)
   - Create a new app
   - Add "Marketing API" product

2. **Configure App**:
   - Go to App Settings → Basic
   - Copy App ID and App Secret
   - Add redirect URI: `http://localhost:5173/auth/meta/callback`

3. **Get Access Token**:
   - Use Facebook's Graph API Explorer
   - Generate a long-lived access token
   - Grant necessary permissions for ads data

## Environment Validation

The application will automatically validate environment variables on startup and warn you about missing required variables.

Required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional variables (for integrations):
- Google OAuth credentials
- Meta Ads credentials

## Security Notes

- Never commit your `.env` file to version control
- Use different credentials for development and production
- Regularly rotate your API keys and tokens
- Ensure redirect URIs match your deployment URLs