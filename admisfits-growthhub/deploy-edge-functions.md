# Deploy GHL Edge Functions Guide

## Prerequisites

1. Make sure you have Supabase CLI installed:
```bash
npm install -g supabase
```

2. You need to be logged in to Supabase CLI.

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click **"New Function"**
4. Name it: `ghl-proxy`
5. Copy and paste this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, token, locationId, method = 'GET', body } = await req.json()

    if (!endpoint || !token || !locationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construct the full URL
    const baseUrl = 'https://services.leadconnectorhq.com'
    const url = `${baseUrl}${endpoint}`

    console.log(`Proxying GHL request to: ${url}`)

    // Make the request to GHL API
    const ghlResponse = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
        'X-Company-Id': locationId, // Some endpoints require this header
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseText = await ghlResponse.text()
    
    // Try to parse as JSON
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // If not JSON, return as is
      responseData = { message: responseText }
    }

    // If the response is not ok, include error details
    if (!ghlResponse.ok) {
      console.error('GHL API error:', ghlResponse.status, responseData)
      return new Response(
        JSON.stringify({
          error: responseData.message || responseData.error || 'GHL API request failed',
          status: ghlResponse.status,
          details: responseData
        }),
        { 
          status: ghlResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return successful response
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

6. Click **"Deploy Function"**

## Option 2: Deploy via CLI (If you have access token)

1. Get your Supabase access token from: https://app.supabase.com/account/tokens
2. Run:
```bash
export SUPABASE_ACCESS_TOKEN=your-token-here
npx supabase link --project-ref lpuqcvnyzvnrsiyhwoxs
npx supabase functions deploy ghl-proxy
```

## Option 3: Alternative - Direct API Call (No Edge Function)

If you can't deploy the edge function, temporarily enable direct API calls:

1. Edit `src/lib/services/ghlRealClient.ts`
2. Change line 9:
```typescript
private useEdgeFunction = false; // Disable edge function
```

Note: This will likely cause CORS errors, but might work in some environments.

## After Deployment

1. The edge function URL will be:
   `https://lpuqcvnyzvnrsiyhwoxs.supabase.co/functions/v1/ghl-proxy`

2. Test the deployment by refreshing your app and trying the GHL integration again.

## Troubleshooting

If you get CORS errors after deployment:
1. Make sure the edge function is actually deployed (check Supabase dashboard)
2. Check the browser console for specific error messages
3. Verify your GHL token has been regenerated with the correct scopes