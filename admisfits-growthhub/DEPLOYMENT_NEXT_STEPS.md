# Next Steps for Deployment

## 1. Deploy the Edge Function

Since you've set the SUPABASE_ACCESS_TOKEN, run these commands in order:

```bash
cd /Users/hari/Admisfits\ Project\ Dashboard/admisfits-growthhub

# Run the deployment script
./deploy-edge-function.sh
```

If the script doesn't work, try these commands directly:

```bash
# First, ensure the token is set in the current session
export SUPABASE_ACCESS_TOKEN=your-token-here

# Link the project
npx supabase link --project-ref lpuqcvnyzvnrsiyhwoxs

# Deploy the edge function
npx supabase functions deploy ghl-proxy
```

## 2. After Deployment

Once the edge function is deployed successfully:

1. Edit `src/lib/services/ghlRealClient.ts`
2. Change line 13 from:
   ```typescript
   private edgeFunctionDeployed = false;
   ```
   to:
   ```typescript
   private edgeFunctionDeployed = true;
   ```

## 3. About the Read-Only Scope

Since you don't have write permissions enabled, that's actually fine for this integration. We only need to:
- View calendars (read-only)
- View appointments (read-only)

The code has been updated to work with read-only permissions. We're not trying to create or modify any data in GHL.

## 4. Required Scopes

Make sure these **read-only** scopes are enabled in your GHL Private Integration:
- ✅ View Calendars (calendars.readonly)
- ✅ View Locations (locations.readonly)
- ✅ View Contacts (contacts.readonly) - optional but helpful

You do NOT need:
- ❌ calendars.write
- ❌ Any other write permissions

## 5. Testing After Deployment

1. Regenerate your GHL token (if you haven't already)
2. Update the token in your app
3. The app should now be able to fetch calendars with read-only permissions

## Troubleshooting

If you still get errors after deployment:

1. **Check Edge Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → ghl-proxy → Logs
   - Look for any error messages

2. **Verify Token Permissions**:
   - Make sure your token was regenerated AFTER enabling the read scopes
   - The old token won't have the new permissions

3. **Test Directly**:
   You can test your token with curl:
   ```bash
   curl -X GET "https://services.leadconnectorhq.com/calendars?locationId=YOUR_LOCATION_ID" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Version: 2021-07-28"
   ```