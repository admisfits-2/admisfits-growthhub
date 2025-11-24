#!/bin/bash

# Test GHL API Connection Script
# This script tests various GHL API endpoints to diagnose connection issues

echo "=== GHL API Connection Test ==="
echo ""

# Check if required parameters are provided
if [ $# -lt 2 ]; then
    echo "Usage: ./test-ghl-connection.sh <TOKEN> <LOCATION_ID>"
    echo "Example: ./test-ghl-connection.sh 'your-token-here' 'your-location-id'"
    exit 1
fi

TOKEN="$1"
LOCATION_ID="$2"
BASE_URL="https://services.leadconnectorhq.com"

echo "Testing with:"
echo "Location ID: $LOCATION_ID"
echo "Token: ${TOKEN:0:20}..." # Show only first 20 chars for security
echo ""

# Function to test an endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    echo "----------------------------------------"
    echo "Testing: $description"
    echo "Endpoint: $endpoint"
    echo ""
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
        "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json" \
        -H "Version: 2021-07-28" \
        -H "X-Company-Id: ${LOCATION_ID}")
    
    # Extract HTTP status code
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d':' -f2)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    echo "HTTP Status: $http_status"
    
    if [ "$http_status" -eq 200 ]; then
        echo "✅ Success!"
        echo "Response:"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo "❌ Failed"
        echo "Error Response:"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    fi
    echo ""
}

# Test 1: Basic location info (to verify token works)
test_endpoint "/locations/${LOCATION_ID}" "Basic Location Info"

# Test 2: Calendars endpoint (most common)
test_endpoint "/calendars?locationId=${LOCATION_ID}" "Calendars List (v2 style)"

# Test 3: Calendar services endpoint
test_endpoint "/calendars/services?locationId=${LOCATION_ID}" "Calendar Services"

# Test 4: Location-specific calendars
test_endpoint "/locations/${LOCATION_ID}/calendars" "Location Calendars (v2 standard)"

# Test 5: Try without locationId parameter (some endpoints don't need it)
test_endpoint "/calendars" "Calendars (no location param)"

# Test 6: Check user/token validity
test_endpoint "/users/me" "Current User Info"

echo "=== Test Complete ==="
echo ""
echo "Summary:"
echo "- If you see 401 errors: Token is invalid or expired"
echo "- If you see 403 errors: Token lacks required permissions"
echo "- If you see 404 errors: Endpoint doesn't exist or location ID is wrong"
echo "- If you see 200 with empty data: No calendars exist for this location"