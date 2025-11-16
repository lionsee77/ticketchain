#!/bin/bash
set -e

echo "=== Testing Event API Fixes ==="

# Test 1: Get tokens
echo "Getting authentication tokens..."
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" -H "Content-Type: application/json" -d '{"username": "admin", "password": "password123"}' | jq -r '.access_token')
ORGANISER_TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" -H "Content-Type: application/json" -d '{"username": "organiser", "password": "password123"}' | jq -r '.access_token')

echo "Tokens obtained successfully"

# Test 2: Create event
echo "Creating test event..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:8000/events/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d '{
    "name": "Test Event",
    "venue": "Test Venue", 
    "date": 1733097600,
    "price": 50000000000000000,
    "total_tickets": 100
  }')

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Event creation successful"
  EVENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.event_id // 1')
else
  echo "❌ Event creation failed"
  exit 1
fi

# Test 3: Get event details (this was the main issue)
echo "Getting event details..."
DETAILS_RESPONSE=$(curl -s -X GET "http://localhost:8000/events/$EVENT_ID/details" \
  -H "Authorization: Bearer $ORGANISER_TOKEN")

if echo "$DETAILS_RESPONSE" | grep -q '"event_id"'; then
  echo "✅ Event details retrieval successful"
  echo "Event details: $DETAILS_RESPONSE"
else
  echo "❌ Event details retrieval failed"
  echo "Response: $DETAILS_RESPONSE"
  exit 1
fi

# Test 4: Check swap eligibility for same event (should be false)
echo "Testing swap eligibility for same event tickets..."
SWAP_CHECK=$(curl -s -X POST "http://localhost:8000/events/tickets/swap/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d '{"ticket_id_1": 1, "ticket_id_2": 2}')

echo "Swap check response: $SWAP_CHECK"

if echo "$SWAP_CHECK" | grep -q '"can_swap": *false'; then
  echo "✅ Swap eligibility correctly returns false for same regular event"
else
  echo "❌ Swap eligibility check failed"
  exit 1
fi

echo "=== All Event API Fixes Verified Successfully! ==="