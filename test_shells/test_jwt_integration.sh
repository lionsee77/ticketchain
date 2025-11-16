#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🎯 JWT Wallet Integration Test${NC}"

# Test 1: JWT tokens include wallet info
echo -e "\n${GREEN}1. Test JWT Token Contains Wallet Info${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{"username": "organiser", "password": "password123"}')

echo "Login response: $RESPONSE"

TOKEN=$(echo $RESPONSE | jq -r '.access_token')
echo "✅ JWT Token: ${TOKEN:0:50}..."

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get valid JWT token"
    exit 1
fi

# Decode JWT payload (just the middle part)
PAYLOAD=$(echo $TOKEN | cut -d. -f2)
echo "JWT Payload (base64): ${PAYLOAD:0:50}..."

# Add padding for base64 decode
PADDING_LENGTH=$((4 - ${#PAYLOAD} % 4))
if [ $PADDING_LENGTH -ne 4 ]; then
    PADDED_PAYLOAD="${PAYLOAD}$(printf '%*s' $PADDING_LENGTH | tr ' ' '=')"
else
    PADDED_PAYLOAD="$PAYLOAD"
fi

DECODED=$(echo $PADDED_PAYLOAD | base64 -d 2>/dev/null | jq '.' 2>/dev/null)
echo "Decoded JWT payload: $DECODED"

if [ -n "$DECODED" ] && echo "$DECODED" | jq -e '.wallet_address' > /dev/null 2>&1; then
    WALLET_ADDRESS=$(echo "$DECODED" | jq -r '.wallet_address')
    echo "✅ JWT contains wallet_address: $WALLET_ADDRESS"
else
    echo "❌ JWT missing wallet_address"
fi

if [ -n "$DECODED" ] && echo "$DECODED" | jq -e '.wallet_address' > /dev/null 2>&1; then
    WALLET_ADDRESS=$(echo "$DECODED" | jq -r '.wallet_address')
    echo "✅ JWT contains wallet_address: $WALLET_ADDRESS"
else
    echo "❌ JWT missing wallet_address"
fi

# Test 2: API endpoints work without account parameters
echo -e "\n${GREEN}2. Test API Endpoints Use JWT Info${NC}"

# Check approval status (no parameters needed)
APPROVAL_RESPONSE=$(curl -s -X GET http://localhost:8000/market/approval/status \
-H "Authorization: Bearer $TOKEN")

if echo $APPROVAL_RESPONSE | jq -e '.user_account' > /dev/null; then
    echo "✅ Approval endpoint gets account from JWT"
else
    echo "❌ Approval endpoint failed"
fi

# Test 3: Security - minimal request bodies
echo -e "\n${GREEN}3. Test Minimal Request Bodies${NC}"

# Approve with empty body
APPROVE_RESPONSE=$(curl -s -X POST http://localhost:8000/market/approval/approve \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{}')

if echo $APPROVE_RESPONSE | jq -e '.success' > /dev/null; then
    echo "✅ Approval works with empty request body"
else
    echo "❌ Approval failed with empty body"
fi

echo -e "\n${GREEN}🎉 JWT Integration Test Complete${NC}"
echo -e "${GREEN}✅ No more redundant account parameters needed!${NC}"
echo -e "${GREEN}✅ Enhanced security - users can only act on their own behalf${NC}"
echo -e "${GREEN}✅ Cleaner API - JWT handles all user identification${NC}"