#!/bin/bash

# Local test script for TicketChain API
# Usage: ./test-api.sh

set -e

echo "🎫 TicketChain API Test Suite"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

# Check if services are running
info "Checking if services are running..."
if ! curl -s http://localhost:8000/ > /dev/null; then
    error "API service is not running. Please start with: docker compose up"
fi

if ! curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    error "Blockchain service is not running. Please start with: docker compose up"
fi

success "All services are running"

# Test 1: Health Check
info "Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/)
if echo "$HEALTH_RESPONSE" | grep -q "TicketChain API is running"; then
    success "Health check passed"
else
    error "Health check failed"
fi

# Test 2: Create Event
info "Testing event creation..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:8000/events/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Test Concert",
    "venue": "Test Arena",
    "date": 1735689600,
    "price": 1000000000000000000,
    "total_tickets": 10
  }')

echo "Create Event Response: $CREATE_RESPONSE"

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    success "Event creation successful"
    # Extract transaction hash
    TX_HASH=$(echo "$CREATE_RESPONSE" | grep -o '"tx_hash":"[^"]*"' | cut -d'"' -f4)
    info "Transaction hash: $TX_HASH"
else
    error "Event creation failed: $CREATE_RESPONSE"
fi

# Test 3: Buy Tickets
info "Testing ticket purchase..."
BUY_RESPONSE=$(curl -s -X POST "http://localhost:8000/tickets/buy" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "quantity": 2,
    "user_account": 1
  }')

echo "Buy Tickets Response: $BUY_RESPONSE"

if echo "$BUY_RESPONSE" | grep -q '"success":true'; then
    success "Ticket purchase successful"
    # Extract transaction hash
    TX_HASH=$(echo "$BUY_RESPONSE" | grep -o '"tx_hash":"[^"]*"' | cut -d'"' -f4)
    info "Transaction hash: $TX_HASH"
else
    error "Ticket purchase failed: $BUY_RESPONSE"
fi

# Test 4: Multiple Users
info "Testing multiple user purchases..."
for user in 2 3 4; do
    info "User $user buying 1 ticket..."
    USER_RESPONSE=$(curl -s -X POST "http://localhost:8000/tickets/buy" \
      -H "Content-Type: application/json" \
      -d '{
        "event_id": 1,
        "quantity": 1,
        "user_account": '$user'
      }')
    
    if echo "$USER_RESPONSE" | grep -q '"success":true'; then
        success "User $user purchase successful"
    else
        warning "User $user purchase failed (might be expected if sold out)"
    fi
done

# Test 5: Error Handling
info "Testing error handling..."
ERROR_RESPONSE=$(curl -s -X POST "http://localhost:8000/events/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "venue": "Test Venue",
    "date": 1735689600,
    "price": -100,
    "total_tickets": 10
  }')

if echo "$ERROR_RESPONSE" | grep -q '"detail"'; then
    success "Error handling working correctly"
else
    warning "Error handling might not be working as expected"
fi

# Test 6: Invalid Ticket Purchase
info "Testing invalid ticket purchase..."
INVALID_BUY_RESPONSE=$(curl -s -X POST "http://localhost:8000/tickets/buy" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 999,
    "quantity": 1,
    "user_account": 1
  }')

if echo "$INVALID_BUY_RESPONSE" | grep -q '"detail"'; then
    success "Invalid purchase error handling working"
else
    warning "Invalid purchase error handling might need improvement"
fi

echo ""
echo "🎉 Test suite completed!"
echo "=============================="
success "All critical tests passed"
info "Check the logs above for any warnings or additional details"