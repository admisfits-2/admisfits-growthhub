import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

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