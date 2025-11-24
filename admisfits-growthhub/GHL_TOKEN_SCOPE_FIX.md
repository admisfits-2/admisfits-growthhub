# GHL Token Scope Authorization Fix

## The Issue
You're getting "The token is not authorized for this scope" error even though you have calendar scopes enabled in your Private Integration.

## Common Causes & Solutions

### 1. Token Generation Timing
**Issue**: If you generated your Private Integration Token BEFORE enabling the calendar scopes, the token won't have those permissions.

**Solution**: 
1. Go to your GHL Private Integration
2. Regenerate a new token (this will invalidate the old one)
3. Update your token in the app with the new one

### 2. Scope Names Have Changed
The GHL API v2 uses different scope names than what might be shown in the UI:
- UI shows: "View Calendars" 
- API expects: `calendars.readonly` or `calendars.write`

### 3. Location vs Sub-Account Access
Private Integration Tokens are scoped to specific locations. Make sure:
- Your token is for the correct location
- The location ID you're using matches the token's location

## How to Fix

### Step 1: Regenerate Your Token
1. Go to your GHL account
2. Navigate to Settings → Integrations → Private Integrations
3. Find your "ADM Reports" integration
4. Click on it and regenerate the token
5. Copy the new token

### Step 2: Update Your App
1. Go to your project's Integration tab
2. Update the GHL settings with the new token
3. Save the changes

### Step 3: Verify Location ID
Make sure your Location ID is correct. You can find it in:
- GHL Settings → Business Profile → Location ID
- Or in the URL when you're in a specific location

### Alternative: Use OAuth 2.0
If Private Integration Tokens continue to have issues, consider using OAuth 2.0:
1. Create a GHL Marketplace App (even for internal use)
2. Set up OAuth flow
3. This gives more granular scope control

## Updated API Endpoints

The code has been updated to try these calendar endpoints in order:
1. `/locations/{locationId}/calendars` (v2 standard)
2. `/calendars/services?locationId={locationId}` (alternative)
3. `/calendars?locationId={locationId}` (fallback)

## Testing

After updating your token:
1. Deploy the edge function: `npx supabase functions deploy ghl-proxy`
2. Clear your browser cache
3. Try connecting again

## If Still Not Working

Check these:
1. **API Version**: Some endpoints require specific API versions
2. **Rate Limits**: You might be hitting rate limits
3. **Location Settings**: Calendars might be disabled at the location level
4. **Token Permissions**: The token might need additional permissions beyond just calendar scopes

You can test your token directly:
```bash
curl -X GET "https://services.leadconnectorhq.com/locations/{your-location-id}/calendars" \
  -H "Authorization: Bearer {your-token}" \
  -H "Version: 2021-07-28"
```