#!/bin/bash

# Simple GHL API Test - Single endpoint test

echo "Simple GHL API Test"
echo "==================="
echo ""
echo "Usage: ./test-ghl-simple.sh <TOKEN> <LOCATION_ID>"
echo ""

if [ $# -lt 2 ]; then
    echo "Please provide TOKEN and LOCATION_ID as arguments"
    exit 1
fi

TOKEN="$1"
LOCATION_ID="$2"

echo "Testing calendars endpoint..."
echo ""

# Test the main calendars endpoint
curl -X GET "https://services.leadconnectorhq.com/calendars?locationId=${LOCATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" \
  -v 2>&1 | grep -E "< HTTP|< |{|}"

echo ""
echo "If you see 'HTTP/2 401' - Token is invalid"
echo "If you see 'HTTP/2 403' - Token lacks calendar permissions"
echo "If you see 'HTTP/2 200' - Success! Check the JSON response"