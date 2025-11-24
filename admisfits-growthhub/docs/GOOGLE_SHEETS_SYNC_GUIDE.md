# Google Sheets OAuth Sync Integration Guide

## Overview
This guide explains how to connect your Google Sheets containing Meta Ads data to automatically sync metrics into your AdmisFits project dashboard using secure Google OAuth authentication.

## Prerequisites

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Enable "Google Sheets API"
   - Enable "Google Drive API" (for listing spreadsheets)
4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:5173/auth/google/callback`
   - Copy Client ID and Client Secret

### 2. Environment Setup
Add your Google OAuth credentials to your `.env` file:

```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### 3. Spreadsheet Access
- ✅ **Works with view-only access** - No need to make spreadsheets public!
- ✅ **Secure OAuth authentication** - Uses your Google account permissions
- ✅ **Access any spreadsheet** you have permission to view

## Supported Data Structure

Based on your current Meta Ads sync setup, the system supports these columns:

| Column | Data Type | Description | Example |
|--------|-----------|-------------|---------|
| A | Date | Day in YYYY-MM-DD format | 2025-08-14 |
| B | Integer | Outbound clicks | 47 |
| C | Currency | Amount spent | $282.92 |
| D | Percentage | Outbound CTR (click-through rate) | 0.871338524% |
| E | Currency | CPM (cost per mille) | $52.45 |
| F | Currency | CPC (cost per click) | $6.02 |

## Setup Instructions

### Step 1: Connect Google Account
1. Go to **Project Details** → **Settings** → **Google Sheets** tab
2. Click **"Connect Google Account"**
3. Sign in with your Google account
4. Grant read-only permissions to access your spreadsheets

### Step 2: Select Your Spreadsheet
1. Browse through your available spreadsheets
2. Select the one containing your Meta Ads data
3. Choose the specific sheet tab with your metrics

### Step 3: Preview and Map Data
1. Review the data preview showing your spreadsheet structure
2. Map columns to the corresponding metrics:
   - **Date Column**: Column with dates (A)
   - **Outbound Clicks**: Column with click counts (B)
   - **Amount Spent**: Column with spend amounts (C)
   - **CTR, CPM, CPC**: Map remaining columns as needed

### Step 4: Save and Sync
1. Click **"Save & Continue"** to store your configuration
2. Click **"Sync Now"** to import your data
3. Set up automatic sync frequency if desired

## Column Mapping Configuration

### Default Mapping (Based on Your Data)
- **Date Column**: A
- **Outbound Clicks**: B  
- **Amount Spent**: C
- **Outbound CTR**: D
- **CPM**: E
- **CPC**: F

### Custom Mapping
You can customize the column mapping if your data is structured differently:
- Use column letters (A, B, C, etc.)
- Leave fields blank if you don't have that metric
- The Date column is required for all syncing

## Data Processing

### Date Format Support
The system supports these date formats:
- `YYYY-MM-DD` (2025-08-14) - Preferred
- `MM/DD/YYYY` (08/14/2025)
- `DD/MM/YYYY` (14/08/2025)
- Any standard JavaScript-parseable date format

### Numeric Data Processing
- Currency symbols ($, €, £) are automatically stripped
- Percentage symbols (%) are handled correctly  
- Comma separators (1,000) are processed properly
- Empty cells are treated as null/zero values

### Data Validation
- Invalid dates are skipped with warnings
- Non-numeric values in numeric fields are set to null
- Duplicate date entries are updated (upserted)

## Sync Behavior

### Automatic Sync
- Configurable sync frequency (15 minutes to 24 hours)
- Syncs run in the background
- Failed syncs are retried automatically

### Manual Sync
- Click "Sync Now" for immediate synchronization
- Useful for testing and one-time data imports
- Shows detailed results (inserted/updated records)

### Data Storage
- Metrics are stored in the `project_daily_metrics` table
- Each project can have one Google Sheets sync configuration
- Historical data is preserved and can be updated

## Troubleshooting

### Common Issues

**"Failed to fetch Google Sheets data"**
- Verify your API key is correct and active
- Check that the spreadsheet is publicly accessible
- Ensure the spreadsheet ID is correct

**"No data found"**
- Check that your sheet name is correct
- Verify the start range (usually "A2")
- Make sure there's actual data in your sheet

**"Invalid date format"**
- Ensure your date column contains proper dates
- Check for empty cells in the date column
- Verify the date format is recognizable

**"Permission denied"**
- Make sure your spreadsheet is shared publicly
- Or share it with "Anyone with the link can view"
- Check Google Sheets API is enabled in your project

### API Limits
- Google Sheets API has rate limits (100 requests per 100 seconds per user)
- Large datasets may take time to sync
- Consider reducing sync frequency for very large sheets

### Performance Tips
- Keep your data range reasonable (avoid syncing thousands of rows unnecessarily)
- Use the "Start Range" setting to skip processed data
- Monitor sync status and errors in the Sync History tab

## Data Usage

Once synced, your Google Sheets data will be available:
- In the project dashboard metrics
- In the Google Sheets → Data tab
- For creating custom reports and charts
- In the revenue area chart (if amount spent is mapped)

## Security Notes

- API keys are stored securely in environment variables
- No sensitive data is logged
- All API calls use HTTPS
- Spreadsheet access is read-only
- User data is protected with Row Level Security (RLS)

## Support

For issues with Google Sheets integration:
- Check the browser console for detailed error messages
- Verify your API setup in Google Cloud Console
- Test with a simple, public spreadsheet first
- Review the sync history tab for error details