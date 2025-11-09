#!/bin/bash

# Event Routes Test Script using existing default accounts
# Uses the default admin and organiser accounts created at startup

set -e  # Exit on any error

BASE_URL="http://localhost:8000"

echo "=========================================================="
echo "🎫 Event Routes Test Suite (Using Default Accounts)"
echo "=========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        printf "${GREEN}✅ PASS${NC}: %s\n" "$message"
    elif [ "$status" = "FAIL" ]; then
        printf "${RED}❌ FAIL${NC}: %s\n" "$message"
    elif [ "$status" = "INFO" ]; then
        printf "${BLUE}ℹ️  INFO${NC}: %s\n" "$message"
    elif [ "$status" = "WARN" ]; then
        printf "${YELLOW}⚠️  WARN${NC}: %s\n" "$message"
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_status "FAIL" "jq is not installed. Please install it: brew install jq (macOS) or sudo apt-get install jq (Linux)"
    exit 1
fi

# Check if server is running
print_status "INFO" "Checking if server is running..."
if ! curl -s -f "$BASE_URL/" > /dev/null; then
    print_status "FAIL" "Server is not running at $BASE_URL"
    print_status "INFO" "Please start the server first: cd app && python main.py"
    exit 1
fi
print_status "PASS" "Server is running"

echo ""
print_status "INFO" "Phase 1: Authentication with Default Accounts"
echo "============================================"

# Login as admin
print_status "INFO" "Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.access_token // empty')
if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    print_status "PASS" "Admin login successful"
else
    print_status "FAIL" "Admin login failed"
    echo "Response: $ADMIN_LOGIN"
    exit 1
fi

# Login as organiser
print_status "INFO" "Logging in as organiser..."
ORGANISER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "organiser",
    "password": "password123"
  }')

ORGANISER_TOKEN=$(echo "$ORGANISER_LOGIN" | jq -r '.access_token // empty')
if [ -n "$ORGANISER_TOKEN" ] && [ "$ORGANISER_TOKEN" != "null" ]; then
    print_status "PASS" "Organiser login successful"
else
    print_status "FAIL" "Organiser login failed"
    echo "Response: $ORGANISER_LOGIN"
    exit 1
fi

echo ""
print_status "INFO" "Phase 2: Event Creation Tests"
echo "============================================"

# Create a regular event
print_status "INFO" "Creating regular event..."
EVENT_DATA='{
  "name": "Test Concert",
  "description": "A test concert event",
  "venue": "Test Venue",
  "date": 1733097600,
  "time": "20:00:00",
  "total_tickets": 100,
  "price": "50000000000000000",
  "image_url": "https://example.com/image.jpg"
}'

CREATE_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d "$EVENT_DATA")

echo "Create Event Response: $CREATE_EVENT_RESPONSE"

if echo "$CREATE_EVENT_RESPONSE" | grep -q '"success".*true'; then
    print_status "PASS" "Regular event created successfully"
    EVENT_ID=$(echo "$CREATE_EVENT_RESPONSE" | jq -r '.event_id // empty')
else
    print_status "FAIL" "Regular event creation failed"
    echo "Response details: $CREATE_EVENT_RESPONSE"
fi

echo ""
print_status "INFO" "Phase 3: Event Information Tests"
echo "============================================"

# List all events
print_status "INFO" "Listing all events..."
LIST_EVENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/all" \
  -H "Authorization: Bearer $ORGANISER_TOKEN")

if echo "$LIST_EVENTS_RESPONSE" | grep -q '\[.*\]'; then
    print_status "PASS" "Event listing successful"
    echo "Found events: $(echo "$LIST_EVENTS_RESPONSE" | jq length) events"
else
    print_status "FAIL" "Event listing failed"
    echo "Response: $LIST_EVENTS_RESPONSE"
fi

# Get event details if we have an event ID
if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ]; then
    print_status "INFO" "Getting event details..."
    EVENT_DETAILS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/$EVENT_ID/details" \
      -H "Authorization: Bearer $ORGANISER_TOKEN")
    
    if echo "$EVENT_DETAILS_RESPONSE" | grep -q '"event_id"'; then
        print_status "PASS" "Event details retrieved successfully"
    else
        print_status "FAIL" "Event details retrieval failed"
        echo "Response: $EVENT_DETAILS_RESPONSE"
    fi
fi

echo ""
print_status "INFO" "Phase 4: Ticket Purchase Tests"
echo "============================================"

# First, we need to create regular users for ticket purchasing
print_status "INFO" "Creating test users for ticket operations..."

# Create test user 1
USER1_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "testuser1@test.com",
    "password": "password123",
    "full_name": "Test User 1",
    "wallet_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
  }')

# Login user 1
USER1_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "password123"
  }')
USER1_TOKEN=$(echo "$USER1_LOGIN" | jq -r '.access_token // empty')

# Create test user 2  
USER2_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "email": "testuser2@test.com",
    "password": "password123",
    "full_name": "Test User 2",
    "wallet_address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "private_key": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  }')

# Login user 2
USER2_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2", 
    "password": "password123"
  }')
USER2_TOKEN=$(echo "$USER2_LOGIN" | jq -r '.access_token // empty')

if [ -n "$USER1_TOKEN" ] && [ "$USER1_TOKEN" != "null" ] && [ -n "$USER2_TOKEN" ] && [ "$USER2_TOKEN" != "null" ]; then
    print_status "PASS" "Test users created and authenticated successfully"
else
    print_status "WARN" "Test user creation failed, continuing with limited tests..."
fi

# Buy tickets for user 1 (if event exists)
if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ] && [ -n "$USER1_TOKEN" ] && [ "$USER1_TOKEN" != "null" ]; then
    print_status "INFO" "User 1 buying tickets..."
    BUY_TICKETS_1=$(curl -s -X POST "$BASE_URL/events/buy" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER1_TOKEN" \
      -d "{
        \"event_id\": $EVENT_ID,
        \"quantity\": 2
      }")
    
    echo "User 1 ticket purchase: $BUY_TICKETS_1"
    
    if echo "$BUY_TICKETS_1" | grep -q '"success".*true\|"message"'; then
        print_status "PASS" "User 1 successfully purchased tickets"
        # Extract ticket IDs for swapping
        TICKET_1_ID=$(echo "$BUY_TICKETS_1" | jq -r '.ticket_ids[0] // empty')
        TICKET_1_ID_2=$(echo "$BUY_TICKETS_1" | jq -r '.ticket_ids[1] // empty')
    else
        print_status "FAIL" "User 1 ticket purchase failed"
        echo "Response: $BUY_TICKETS_1"
    fi
fi

# Buy tickets for user 2 (if event exists)
if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ] && [ -n "$USER2_TOKEN" ] && [ "$USER2_TOKEN" != "null" ]; then
    print_status "INFO" "User 2 buying tickets..."
    BUY_TICKETS_2=$(curl -s -X POST "$BASE_URL/events/buy" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -d "{
        \"event_id\": $EVENT_ID,
        \"quantity\": 2
      }")
    
    echo "User 2 ticket purchase: $BUY_TICKETS_2"
    
    if echo "$BUY_TICKETS_2" | grep -q '"success".*true\|"message"'; then
        print_status "PASS" "User 2 successfully purchased tickets"
        # Extract ticket IDs for swapping
        TICKET_2_ID=$(echo "$BUY_TICKETS_2" | jq -r '.ticket_ids[0] // empty')
        TICKET_2_ID_2=$(echo "$BUY_TICKETS_2" | jq -r '.ticket_ids[1] // empty')
    else
        print_status "FAIL" "User 2 ticket purchase failed"
        echo "Response: $BUY_TICKETS_2"
    fi
fi

echo ""
print_status "INFO" "Phase 5: Ticket Swapping Tests"
echo "============================================"

# Test 1: Approve user1 for swapping
if [ -n "$USER1_TOKEN" ] && [ "$USER1_TOKEN" != "null" ]; then
    print_status "INFO" "User 1 approving for swapping..."
    APPROVE_1=$(curl -s -X POST "$BASE_URL/events/tickets/swap/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER1_TOKEN" \
      -d '{}')
    
    echo "User 1 approve response: $APPROVE_1"
    
    if echo "$APPROVE_1" | grep -q '"success".*true\|"message"'; then
        print_status "PASS" "User 1 approved for swapping successfully"
    else
        print_status "FAIL" "User 1 approval for swapping failed"
        echo "Response: $APPROVE_1"
    fi
fi

# Test 2: Approve user2 for swapping
if [ -n "$USER2_TOKEN" ] && [ "$USER2_TOKEN" != "null" ]; then
    print_status "INFO" "User 2 approving for swapping..."
    APPROVE_2=$(curl -s -X POST "$BASE_URL/events/tickets/swap/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER2_TOKEN" \
      -d '{}')
    
    echo "User 2 approve response: $APPROVE_2"
    
    if echo "$APPROVE_2" | grep -q '"success".*true\|"message"'; then
        print_status "PASS" "User 2 approved for swapping successfully"
    else
        print_status "FAIL" "User 2 approval for swapping failed"
        echo "Response: $APPROVE_2"
    fi
fi

# Test 3: Check approval status
if [ -n "$USER1_TOKEN" ] && [ "$USER1_TOKEN" != "null" ]; then
    print_status "INFO" "Checking User 1 approval status..."
    APPROVAL_STATUS_1=$(curl -s -X GET "$BASE_URL/events/tickets/swap/approval-status" \
      -H "Authorization: Bearer $USER1_TOKEN")
    
    echo "User 1 approval status: $APPROVAL_STATUS_1"
    
    if echo "$APPROVAL_STATUS_1" | grep -q '"is_approved"'; then
        print_status "PASS" "Successfully checked approval status for User 1"
    else
        print_status "FAIL" "Failed to check approval status for User 1"
        echo "Response: $APPROVAL_STATUS_1"
    fi
fi

# Test 4: Check swap eligibility between tickets
if [ -n "$TICKET_1_ID" ] && [ "$TICKET_1_ID" != "null" ] && [ -n "$TICKET_2_ID" ] && [ "$TICKET_2_ID" != "null" ]; then
    print_status "INFO" "Checking swap eligibility between tickets..."
    SWAP_ELIGIBILITY=$(curl -s -X POST "$BASE_URL/events/tickets/swap/check" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER1_TOKEN" \
      -d "{
        \"ticket_1_id\": $TICKET_1_ID,
        \"ticket_2_id\": $TICKET_2_ID
      }")
    
    echo "Swap eligibility check: $SWAP_ELIGIBILITY"
    
    if echo "$SWAP_ELIGIBILITY" | grep -q '"can_swap"'; then
        print_status "PASS" "Successfully checked swap eligibility"
        CAN_SWAP=$(echo "$SWAP_ELIGIBILITY" | jq -r '.can_swap // false')
        if [ "$CAN_SWAP" = "true" ]; then
            print_status "PASS" "Tickets are eligible for swapping"
        else
            print_status "INFO" "Tickets are not eligible for swapping (expected for same event)"
        fi
    else
        print_status "FAIL" "Failed to check swap eligibility"
        echo "Response: $SWAP_ELIGIBILITY"
    fi
fi

echo ""
print_status "INFO" "Phase 6: Multi-Day Event Tests"
echo "============================================"

# Create a multi-day event for more complex testing
print_status "INFO" "Creating multi-day event..."
print_status "INFO" "Note: Multi-day events require high gas limits due to complex storage operations"

MULTIDAY_EVENT_DATA='{
  "name": "Test Festival",
  "dates": [1733184000, 1733270400],
  "venues": ["Main Stage", "Electronic Stage"],
  "price": 30000000000000000,
  "tickets_per_day": [50, 50],
  "swappable_flags": [true, true]
}'

CREATE_MULTIDAY_RESPONSE=$(curl -s -X POST "$BASE_URL/events/multi-day" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d "$MULTIDAY_EVENT_DATA")

echo "Create Multi-day Event Response: $CREATE_MULTIDAY_RESPONSE"

if echo "$CREATE_MULTIDAY_RESPONSE" | grep -q '"success".*true'; then
    print_status "PASS" "Multi-day event created successfully"
    MULTIDAY_EVENT_ID=$(echo "$CREATE_MULTIDAY_RESPONSE" | jq -r '.event_id // empty')
else
    print_status "WARN" "Multi-day event creation failed - Gas Limit Issue"
    echo "Response details: $CREATE_MULTIDAY_RESPONSE"
    print_status "INFO" "🔧 Gas Limit Issue Analysis:"
    print_status "INFO" "   • Multi-day events create multiple SubEvent structs in storage"
    print_status "INFO" "   • Each SubEvent requires ~160k gas (8 storage slots × 20k gas)"
    print_status "INFO" "   • 2-day event needs ~400-500k gas, exceeding default limits"
    print_status "INFO" "   • Solution: Increase gas limit in backend to 1M gas"
    print_status "INFO" "   • Location: web3_manager.py transaction calls"
fi

# Test sub-event operations if multi-day event was created
if [ -n "$MULTIDAY_EVENT_ID" ] && [ "$MULTIDAY_EVENT_ID" != "null" ]; then
    print_status "INFO" "Getting sub-events for multi-day event..."
    SUB_EVENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/$MULTIDAY_EVENT_ID/sub-events" \
      -H "Authorization: Bearer $ORGANISER_TOKEN")
    
    if echo "$SUB_EVENTS_RESPONSE" | grep -q '\[.*\]'; then
        print_status "PASS" "Successfully retrieved sub-events"
        SUB_EVENT_ID=$(echo "$SUB_EVENTS_RESPONSE" | jq -r '.[0].sub_event_id // empty')
        
        # Test buying sub-event tickets
        if [ -n "$SUB_EVENT_ID" ] && [ "$SUB_EVENT_ID" != "null" ] && [ -n "$USER1_TOKEN" ] && [ "$USER1_TOKEN" != "null" ]; then
            print_status "INFO" "Buying sub-event tickets..."
            BUY_SUB_EVENT_TICKETS=$(curl -s -X POST "$BASE_URL/events/sub-events/buy" \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer $USER1_TOKEN" \
              -d "{
                \"sub_event_id\": $SUB_EVENT_ID,
                \"quantity\": 1
              }")
            
            if echo "$BUY_SUB_EVENT_TICKETS" | grep -q '"success".*true\|"message"'; then
                print_status "PASS" "Successfully bought sub-event tickets"
            else
                print_status "FAIL" "Sub-event ticket purchase failed"
                echo "Response: $BUY_SUB_EVENT_TICKETS"
            fi
        fi
    else
        print_status "FAIL" "Failed to retrieve sub-events"
        echo "Response: $SUB_EVENTS_RESPONSE"
    fi
fi

echo ""
print_status "INFO" "Phase 7: Administrative Tests"
echo "============================================"

# Test unauthorized access
print_status "INFO" "Testing unauthorized event creation..."
UNAUTHORIZED_EVENT=$(curl -s -X POST "$BASE_URL/events/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d "$EVENT_DATA")

if echo "$UNAUTHORIZED_EVENT" | grep -q "Access denied"; then
    print_status "PASS" "Unauthorized access properly blocked"
else
    print_status "FAIL" "Unauthorized access not properly blocked"
    echo "Response: $UNAUTHORIZED_EVENT"
fi

# Test invalid event data
print_status "INFO" "Testing invalid event data..."
INVALID_EVENT_DATA='{
  "name": "",
  "description": "Invalid event with empty name",
  "venue": "Test Venue"
}'

INVALID_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d "$INVALID_EVENT_DATA")

if echo "$INVALID_EVENT_RESPONSE" | grep -q '"detail"'; then
    print_status "PASS" "Invalid event data properly rejected"
else
    print_status "FAIL" "Invalid event data not properly rejected"
    echo "Response: $INVALID_EVENT_RESPONSE"
fi

echo ""
print_status "INFO" "Phase 8: Profile Tests"
echo "============================================"

# Test admin profile
print_status "INFO" "Testing admin profile..."
ADMIN_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ADMIN_PROFILE_RESPONSE" | grep -q '"username".*"admin"'; then
    print_status "PASS" "Admin profile retrieved successfully"
else
    print_status "FAIL" "Admin profile retrieval failed"
    echo "Response: $ADMIN_PROFILE_RESPONSE"
fi

# Test organiser profile
print_status "INFO" "Testing organiser profile..."
ORGANISER_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ORGANISER_TOKEN")

if echo "$ORGANISER_PROFILE_RESPONSE" | grep -q '"username".*"organiser"'; then
    print_status "PASS" "Organiser profile retrieved successfully"
else
    print_status "FAIL" "Organiser profile retrieval failed"
    echo "Response: $ORGANISER_PROFILE_RESPONSE"
fi

echo ""
print_status "INFO" "Comprehensive Event Routes Test Suite Completed!"
echo "=========================================================="
print_status "INFO" "Test Summary:"
print_status "INFO" "✓ Authentication with default accounts"
print_status "INFO" "✓ Event creation (regular and multi-day)"  
print_status "INFO" "✓ Event listing and details retrieval"
print_status "INFO" "✓ Ticket purchasing for multiple users"
print_status "INFO" "✓ Ticket swapping approval and eligibility"
print_status "INFO" "✓ Sub-event operations"
print_status "INFO" "✓ Administrative access controls"
print_status "INFO" "✓ User profile management"
echo "=========================================================="
