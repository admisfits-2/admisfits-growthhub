# GHL Integration Setup Guide

This guide will help you set up the Go High Level (GHL) integration for your project.

## Prerequisites

- A Go High Level account with sub-account access
- Your sub-account API key (found in Business Profile > API Key)
- Supabase project with database access

## Step 1: Database Setup

1. **Run the migration script** in your Supabase SQL editor:
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Copy the entire contents of `run_ghl_migrations.sql`
   - Paste and run the SQL script
   - You should see "Success. No rows returned" message

## Step 2: Deploy Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   cd "/Users/hari/Admisfits Project Dashboard/admisfits-growthhub"
   supabase link --project-ref <your-project-ref>
   ```
   (You can find your project ref in Supabase dashboard URL)

4. **Deploy the edge function**:
   ```bash
   supabase functions deploy ghl-api
   ```

## Step 3: Configure GHL Integration in Dashboard

1. **Navigate to your project** in the dashboard
2. Go to **Settings** tab
3. Click on **Integrations** sub-tab
4. Find **Go High Level Integration** section
5. Click **Setup GHL Integration**

### Setup Wizard Steps:

1. **API Key**:
   - Enter your sub-account API key from GHL (Business Profile > API Key)
   - Click "Test & Continue"
   - The system will validate your API key

2. **Location Selection**:
   - If your API key has access to multiple locations, select the appropriate one
   - For sub-account keys, this is usually automatic

3. **Sync Settings**:
   - Enable/disable auto-sync
   - Set sync frequency (15 minutes to daily)
   - Click "Create Integration"

## Step 4: Verify Integration

After setup, you should see:
- ✅ Active status badge
- Location name displayed
- API usage statistics
- Manual sync options

## Troubleshooting

### "relation does not exist" error
- Make sure you've run the database migration script
- Check that all tables were created successfully

### CORS errors
- Ensure the edge function is deployed
- Verify your Supabase project URL is correct

### Invalid API key
- Double-check your API key from GHL sub-account
- Ensure the key has necessary permissions
- Try regenerating the key in GHL

### No locations found
- Sub-account API keys are location-specific
- Verify your sub-account has proper access
- Contact your GHL admin if needed

## Data Syncing

### Automatic Sync
- Based on your configured frequency
- Runs in the background
- Updates metrics automatically

### Manual Sync
- Use "Quick Sync" options for immediate updates
- Choose from preset ranges (24h, 7d, 30d)
- Or select custom date range

## Available Metrics

The integration syncs the following data:
- **Appointments**: Total, completed, no-show, cancelled
- **Opportunities/Deals**: Total, won, lost, pipeline value
- **Revenue**: From deals and invoices
- **Performance Metrics**: Win rates, completion rates

## API Limits

- GHL API allows 200,000 requests per day
- The dashboard tracks your usage
- Warnings appear at 80% usage
- Daily reset at midnight

## Security Notes

- API keys are stored securely in your database
- All API calls go through Supabase Edge Functions
- Row Level Security (RLS) ensures data privacy
- Only project owners can view/edit integrations

## Need Help?

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify all setup steps were completed
3. Ensure your GHL sub-account has proper API access
4. Contact support with error details and screenshots