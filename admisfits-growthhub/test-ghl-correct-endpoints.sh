#!/bin/bash

# Test correct GHL v2 API endpoints

TOKEN="pit-b1080513-58cf-4071-aa05-ebd116a36d2a"
LOCATION_ID="IR6XOLKQoxqwlSbojPJx"

echo "Testing GHL v2 API with correct endpoints..."
echo "==========================================="
echo ""

# Test 1: Get location details first (to verify token works)
echo "1. Testing location endpoint (verify token):"
curl -s "https://services.leadconnectorhq.com/locations/${LOCATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" | python3 -m json.tool

echo ""
echo "2. Testing calendars/services endpoint:"
curl -s "https://services.leadconnectorhq.com/calendars/services?locationId=${LOCATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" | python3 -m json.tool

echo ""
echo "3. Testing calendar groups endpoint:"
curl -s "https://services.leadconnectorhq.com/calendars/groups?locationId=${LOCATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" | python3 -m json.tool

echo ""
echo "4. Testing appointments endpoint:"
START_DATE=$(date -u +"%Y-%m-%dT00:00:00.000Z")
END_DATE=$(date -u -v+7d +"%Y-%m-%dT23:59:59.999Z" 2>/dev/null || date -u -d "+7 days" +"%Y-%m-%dT23:59:59.999Z")
curl -s "https://services.leadconnectorhq.com/calendars/events?locationId=${LOCATION_ID}&startDate=${START_DATE}&endDate=${END_DATE}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" | python3 -m json.tool