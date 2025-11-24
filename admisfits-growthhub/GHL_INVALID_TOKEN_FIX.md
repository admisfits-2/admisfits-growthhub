# GHL Invalid Private Integration Token Fix

## The Problem

Your Private Integration Token is being rejected with "Invalid Private Integration token" error. This happens when:

1. The token format is incorrect
2. The token has expired
3. The token was not properly generated
4. The API endpoints don't support Private Integration Tokens

## Solution Steps

### 1. Regenerate Your Token

Go to your GHL account and regenerate the Private Integration Token:

1. Go to Settings → Integrations → Private Integrations
2. Find your "ADM Reports" integration
3. Click "Regenerate Token"
4. **Important**: Make sure the token starts with `pit-` (Private Integration Token)

### 2. Alternative: Use OAuth 2.0 Token

If Private Integration Tokens continue to fail, you might need to use OAuth tokens instead. Private Integration Tokens have limited endpoint support in GHL v2.

### 3. Test with Basic Authentication

Some GHL endpoints work better with API keys instead of Private Integration Tokens. Try this format:

```bash
# Using API Key instead of Private Token
curl -X GET "https://services.leadconnectorhq.com/calendars/services" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

### 4. Use Location API Key

If you have a Location-specific API key (not a Private Integration Token), that might work better:

1. Go to your GHL Location Settings
2. Navigate to Business Profile → API Keys
3. Create or copy an API key for your location
4. Use that instead of the Private Integration Token

## Current Status

The error "Invalid Private Integration token" suggests that:
- Your token (`pit-b1080513-58cf-4071-aa05-ebd116a36d2a`) is not being recognized
- The endpoints you're trying to access might not support Private Integration Tokens

## Workaround: Manual Calendar Configuration

Since the API isn't working, you can manually configure calendars:

1. Use the "Add Calendar Manually" feature in the app
2. Enter your calendar IDs directly
3. The app will store these and use them for metrics

## Next Steps

1. Try regenerating your Private Integration Token
2. Or switch to using a Location API Key
3. Or manually configure calendars in the app

The manual calendar configuration is already built into the app - just click "Add Calendar Manually" in the GHL integration settings.