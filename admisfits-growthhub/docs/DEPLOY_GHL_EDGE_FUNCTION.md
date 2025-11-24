# Deploy GHL Edge Function - Alternative Methods

Since Supabase CLI installation requires admin permissions, here are alternative ways to deploy the edge function:

## Method 1: Deploy via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**:
   - Go to your project at https://app.supabase.com
   - Navigate to **Edge Functions** in the left sidebar

2. **Create New Function**:
   - Click **"New Function"**
   - Name it: `ghl-api`
   - Click **"Create Function"**

3. **Copy Function Code**:
   - Copy the entire contents of `supabase/functions/ghl-api/index.ts`
   - Paste it into the editor in Supabase dashboard

4. **Deploy**:
   - Click **"Deploy"** button
   - Wait for deployment to complete (usually takes 10-30 seconds)

5. **Get Function URL**:
   - After deployment, you'll see the function URL
   - It will look like: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ghl-api`

## Method 2: Install Supabase CLI Locally

If you want to use the CLI, install it as a project dependency:

```bash
cd "/Users/hari/Admisfits Project Dashboard/admisfits-growthhub"
npm install --save-dev supabase
```

Then use npx to run commands:

```bash
# Login to Supabase
npx supabase login

# Link your project (replace with your project ref)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
npx supabase functions deploy ghl-api
```

## Method 3: Using cURL (Advanced)

If you have your Supabase service role key, you can deploy using cURL:

```bash
# Get your service role key from Supabase dashboard > Settings > API

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/ghl-api \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data @supabase/functions/ghl-api/index.ts
```

## After Deployment

Once deployed, the GHL integration will automatically use the edge function to make API calls, avoiding CORS issues.

### Testing the Function

You can test if the function is working by visiting:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/ghl-api`

You should see a response (likely an error about missing authorization, which is expected).

## Troubleshooting

### Function Not Found
- Ensure the function name is exactly `ghl-api`
- Check that deployment was successful
- Verify the function appears in your Supabase dashboard

### Authorization Errors
- This is normal when accessing directly
- The function requires authentication headers
- It will work correctly when called from your app

### CORS Issues Still Occurring
- Double-check the function code includes CORS headers
- Ensure you're using the updated `ghlApiClientV2.ts`
- Clear browser cache and try again