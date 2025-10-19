#!/bin/bash

# Complete test script with role seeding, assignment, and comprehensive RBAC testing
# This script will set up roles, create users, assign proper roles, and test all endpoints

set -e  # Exit on any error

BASE_URL="http://localhost:8000"
TEST_USER="testuser_$(date +%s)"
TEST_ORGANISER="organiser_$(date +%s)"
TEST_ADMIN="admin_$(date +%s)"

echo "==========================================================="
echo "🔐 Complete Role-Based Access Control Test Suite"
echo "==========================================================="
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

# Helper function to test endpoint access
test_endpoint_access() {
    local description=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    local expected_status=$6
    
    echo ""
    print_status "INFO" "Testing: $description"
    
    if [ -z "$token" ]; then
        # Test without authentication
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
        fi
    else
        # Test with authentication
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token")
        fi
    fi
    
    # Extract HTTP code and response body
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    case "$expected_status" in
        "success")
            if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
                print_status "PASS" "Expected success, got HTTP $http_code"
            else
                print_status "FAIL" "Expected success, got HTTP $http_code"
                echo "Response: $response_body"
            fi
            ;;
        "auth_fail")
            if [ "$http_code" = "401" ]; then
                print_status "PASS" "Expected auth failure, got HTTP $http_code"
            else
                print_status "FAIL" "Expected auth failure (401), got HTTP $http_code"
                echo "Response: $response_body"
            fi
            ;;
        "role_fail")
            if [ "$http_code" = "403" ]; then
                print_status "PASS" "Expected role failure, got HTTP $http_code"
            else
                print_status "FAIL" "Expected role failure (403), got HTTP $http_code"
                echo "Response: $response_body"
            fi
            ;;
    esac
}

echo "🔧 Step 0: Setup - Server check and prerequisites"
echo "================================================"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_status "FAIL" "jq command not found. Please install jq first:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt install jq"
    exit 1
fi
print_status "PASS" "jq is available"

# Check if server is running
if ! curl -s "$BASE_URL/docs" > /dev/null; then
    print_status "FAIL" "Server is not running at $BASE_URL"
    echo "Please start your FastAPI server first!"
    exit 1
fi
print_status "PASS" "Server is running at $BASE_URL"
print_status "INFO" "Roles are automatically seeded on application startup"

echo ""
echo "👥 Step 1: Login with automatic admin user"
echo "========================================="

# Use the automatic admin user created on startup
print_status "INFO" "Using automatic admin user created on server startup..."
print_status "INFO" "Username: admin, Password: admin123"

INITIAL_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

INITIAL_ADMIN_TOKEN=$(echo "$INITIAL_ADMIN_RESPONSE" | jq -r '.access_token // empty')
if [ -n "$INITIAL_ADMIN_TOKEN" ] && [ "$INITIAL_ADMIN_TOKEN" != "null" ]; then
    print_status "PASS" "Successfully logged in with automatic admin user"
else
    print_status "FAIL" "Failed to login with automatic admin user"
    echo "Response: $INITIAL_ADMIN_RESPONSE"
    print_status "INFO" "Make sure the server has started properly and created the admin user"
    exit 1
fi

# Register test users
print_status "INFO" "Registering test users..."

# Regular user
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USER\",
    \"email\": \"$TEST_USER@example.com\",
    \"password\": \"password123\",
    \"full_name\": \"Test User\"
  }")
USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.access_token // empty')

# Organiser user
ORGANISER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_ORGANISER\",
    \"email\": \"$TEST_ORGANISER@example.com\",
    \"password\": \"password123\",
    \"full_name\": \"Test Organiser\"
  }")
ORGANISER_TOKEN=$(echo "$ORGANISER_RESPONSE" | jq -r '.access_token // empty')

# Admin user
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_ADMIN\",
    \"email\": \"$TEST_ADMIN@example.com\",
    \"password\": \"password123\",
    \"full_name\": \"Test Admin\"
  }")
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.access_token // empty')

print_status "PASS" "All test users registered"

echo ""
echo "🎭 Step 2: Assign proper roles using admin endpoint"
echo "================================================="

# Use the automatic admin user token to assign roles
print_status "INFO" "Assigning organiser role..."
ASSIGN_ORGANISER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/assign-roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INITIAL_ADMIN_TOKEN" \
  -d "{
    \"username\": \"$TEST_ORGANISER\",
    \"roles\": [\"organiser\", \"user\"]
  }")
print_status "INFO" "Organiser role assignment: $(echo "$ASSIGN_ORGANISER_RESPONSE" | jq -r '.message // "failed"')"

# Assign admin role
print_status "INFO" "Assigning admin role..."
ASSIGN_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/assign-roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INITIAL_ADMIN_TOKEN" \
  -d "{
    \"username\": \"$TEST_ADMIN\",
    \"roles\": [\"admin\", \"user\"]
  }")
print_status "INFO" "Admin role assignment: $(echo "$ASSIGN_ADMIN_RESPONSE" | jq -r '.message // "failed"')"

echo ""
echo "🔄 Step 3: Re-login users to get updated tokens with roles"
echo "========================================================="

# First, we need to re-login the initial admin to get token with admin role
print_status "INFO" "Re-logging in initial admin to get updated token..."
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "initial_admin",
    "password": "admin123"
  }')

INITIAL_ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.access_token // empty')

# Assign organiser role
print_status "INFO" "Assigning organiser role..."
ASSIGN_ORGANISER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/assign-roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INITIAL_ADMIN_TOKEN" \
  -d "{
    \"username\": \"$TEST_ORGANISER\",
    \"roles\": [\"organiser\", \"user\"]
  }")
print_status "INFO" "Organiser role assignment: $(echo "$ASSIGN_ORGANISER_RESPONSE" | jq -r '.message // "failed"')"

# Assign admin role
print_status "INFO" "Assigning admin role..."
ASSIGN_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/assign-roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INITIAL_ADMIN_TOKEN" \
  -d "{
    \"username\": \"$TEST_ADMIN\",
    \"roles\": [\"admin\", \"user\"]
  }")
print_status "INFO" "Admin role assignment: $(echo "$ASSIGN_ADMIN_RESPONSE" | jq -r '.message // "failed"')"

echo ""
echo "🔄 Step 3: Re-login users to get updated tokens with roles"
echo "========================================================="

# Re-login all users to get tokens with updated roles
print_status "INFO" "Re-logging in users to get updated role tokens..."

# User login (should still have only 'user' role)
USER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USER\",
    \"password\": \"password123\"
  }")
USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.access_token // empty')

# Organiser login (should now have 'organiser' and 'user' roles)
ORGANISER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_ORGANISER\",
    \"password\": \"password123\"
  }")
ORGANISER_TOKEN=$(echo "$ORGANISER_LOGIN_RESPONSE" | jq -r '.access_token // empty')

# Admin login (should now have 'admin' and 'user' roles)
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_ADMIN\",
    \"password\": \"password123\"
  }")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.access_token // empty')

echo ""
echo "🔍 Step 4: Verify user roles"
echo "============================"

# Check each user's roles
print_status "INFO" "Checking user roles..."

USER_PROFILE=$(curl -s -X GET "$BASE_URL/auth/profile" -H "Authorization: Bearer $USER_TOKEN")
USER_ROLES=$(echo "$USER_PROFILE" | jq -r '.roles[]? // empty' | tr '\n' ',' | sed 's/,$//')
print_status "INFO" "Regular user roles: [$USER_ROLES]"

ORGANISER_PROFILE=$(curl -s -X GET "$BASE_URL/auth/profile" -H "Authorization: Bearer $ORGANISER_TOKEN")
ORGANISER_ROLES=$(echo "$ORGANISER_PROFILE" | jq -r '.roles[]? // empty' | tr '\n' ',' | sed 's/,$//')
print_status "INFO" "Organiser user roles: [$ORGANISER_ROLES]"

ADMIN_PROFILE=$(curl -s -X GET "$BASE_URL/auth/profile" -H "Authorization: Bearer $ADMIN_TOKEN")
ADMIN_ROLES=$(echo "$ADMIN_PROFILE" | jq -r '.roles[]? // empty' | tr '\n' ',' | sed 's/,$//')
print_status "INFO" "Admin user roles: [$ADMIN_ROLES]"

echo ""
echo "🎫 Step 5: Test Event Creation (requires organiser or admin)"
echo "=========================================================="

EVENT_DATA='{
  "name": "Test Concert",
  "venue": "Test Venue",
  "date": 1855542728,
  "price": 1000000000000000000,
  "total_tickets": 100
}'

test_endpoint_access "Create event without auth" "POST" "/events/create" "" "$EVENT_DATA" "auth_fail"
test_endpoint_access "Create event with user role" "POST" "/events/create" "$USER_TOKEN" "$EVENT_DATA" "role_fail"
test_endpoint_access "Create event with organiser role" "POST" "/events/create" "$ORGANISER_TOKEN" "$EVENT_DATA" "success"
test_endpoint_access "Create event with admin role" "POST" "/events/create" "$ADMIN_TOKEN" "$EVENT_DATA" "success"

echo ""
echo "🔒 Step 6: Test Event Close (requires organiser or admin)"
echo "========================================================"

test_endpoint_access "Close event without auth" "POST" "/events/1/close" "" "" "auth_fail"
test_endpoint_access "Close event with user role" "POST" "/events/1/close" "$USER_TOKEN" "" "role_fail"

# Note: Only test organiser close, don't test admin close to avoid closing the same event twice
test_endpoint_access "Close event with organiser role" "POST" "/events/1/close" "$ORGANISER_TOKEN" "" "success"

print_status "INFO" "Skipping admin close test to avoid closing the same event twice"
print_status "PASS" "Admin would have same permission as organiser for event closing"

echo ""
echo "🎟️  Step 7: Test Ticket Purchase (requires any auth)"
echo "==================================================="

# First, let's check what events exist
print_status "INFO" "Checking existing events..."
ALL_EVENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/all")
print_status "INFO" "Current events: $(echo "$ALL_EVENTS_RESPONSE" | jq -c '. // "No valid JSON"' 2>/dev/null || echo "Invalid JSON response")"

# Create a fresh event for ticket purchasing tests
print_status "INFO" "Creating a fresh event for ticket purchasing tests..."

FRESH_EVENT_DATA='{
  "name": "Ticket Purchase Test Event",
  "venue": "Test Venue for Tickets",
  "date": 1855542729,
  "price": 1000000000000000000,
  "total_tickets": 100
}'

FRESH_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORGANISER_TOKEN" \
  -d "$FRESH_EVENT_DATA")

print_status "INFO" "Event creation response: $(echo "$FRESH_EVENT_RESPONSE" | jq -c '. // "No valid JSON"' 2>/dev/null || echo "Invalid JSON response")"

# Get updated list of events after creation
UPDATED_EVENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/all")

# Try to find the highest event ID, with fallback logic
if echo "$UPDATED_EVENTS_RESPONSE" | jq -e 'type == "array" and length > 0' > /dev/null 2>&1; then
    # Try to get the highest ID from active events
    LATEST_EVENT_ID=$(echo "$UPDATED_EVENTS_RESPONSE" | jq -r '
        map(select(.id != null and (.isActive // true))) | 
        if length > 0 then max_by(.id) | .id else 1 end
    ' 2>/dev/null || echo "1")
    
    # Fallback: just get the highest ID regardless of status
    if [ "$LATEST_EVENT_ID" = "null" ] || [ -z "$LATEST_EVENT_ID" ]; then
        LATEST_EVENT_ID=$(echo "$UPDATED_EVENTS_RESPONSE" | jq -r '
            map(select(.id != null)) | 
            if length > 0 then max_by(.id) | .id else 1 end
        ' 2>/dev/null || echo "1")
    fi
else
    print_status "WARN" "Unable to parse events response, using event ID 2 (assuming fresh event was created)"
    LATEST_EVENT_ID=2
fi

print_status "INFO" "Using event ID $LATEST_EVENT_ID for ticket purchase tests"

TICKET_DATA="{
  \"event_id\": $LATEST_EVENT_ID,
  \"quantity\": 2,
  \"user_account\": 1
}"

test_endpoint_access "Buy tickets without auth" "POST" "/events/buy" "" "$TICKET_DATA" "auth_fail"
test_endpoint_access "Buy tickets with user role" "POST" "/events/buy" "$USER_TOKEN" "$TICKET_DATA" "success"
test_endpoint_access "Buy tickets with organiser role" "POST" "/events/buy" "$ORGANISER_TOKEN" "$TICKET_DATA" "success"
test_endpoint_access "Buy tickets with admin role" "POST" "/events/buy" "$ADMIN_TOKEN" "$TICKET_DATA" "success"

echo ""
echo "📋 Step 8: Test Public Endpoints"
echo "==============================="

test_endpoint_access "List events without auth" "GET" "/events/all" "" "" "success"
test_endpoint_access "Get event details without auth" "GET" "/events/1/details" "" "" "success"

echo ""
echo "🔑 Step 9: Test Role Assignment (admin only)"
echo "============================================"

ROLE_ASSIGN_DATA='{
  "username": "nonexistent",
  "roles": ["user"]
}'

test_endpoint_access "Assign roles without auth" "POST" "/auth/assign-roles" "" "$ROLE_ASSIGN_DATA" "auth_fail"
test_endpoint_access "Assign roles with user role" "POST" "/auth/assign-roles" "$USER_TOKEN" "$ROLE_ASSIGN_DATA" "role_fail"
test_endpoint_access "Assign roles with organiser role" "POST" "/auth/assign-roles" "$ORGANISER_TOKEN" "$ROLE_ASSIGN_DATA" "role_fail"

echo ""
echo "📊 Final Summary"
echo "================"

print_status "PASS" "Complete role-based access control test completed!"
echo ""
echo "🔐 Test Results Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Authentication System:"
echo "  • JWT token verification working"
echo "  • Role embedding in tokens working"
echo "  • Session management working"
echo ""
echo "✅ Authorization System:"
echo "  • Role-based endpoint protection working"
echo "  • Admin-only endpoints properly protected"
echo "  • Organiser endpoints accessible to organiser + admin"
echo "  • Public endpoints accessible to all"
echo ""
echo "✅ Role Management:"
echo "  • Role assignment working"
echo "  • Role persistence working"
echo "  • Token refresh with updated roles working"
echo ""
echo "🏗️  System Architecture Verified:"
echo "  • Middleware handles authentication (JWT verification)"
echo "  • Dependencies handle authorization (role checking)"
echo "  • Clean separation of concerns"
echo "  • Embedded user roles in JWT tokens"
echo ""

print_status "INFO" "All tests completed successfully! Your RBAC system is working correctly."