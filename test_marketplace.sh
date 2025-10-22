#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Testing TicketChain Marketplace Flow"

# Store tokens
echo -e "\n${GREEN}1. Login as admin${NC}"
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "admin",
  "password": "admin123"
}')
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.access_token')

# Check if organiser exists first
echo -e "\n${GREEN}2. Register organiser (if not exists)${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "organiser",
  "email": "organiser@test.com",
  "password": "password123",
  "account_index": 2,
  "wallet_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
}')
echo $REGISTER_RESPONSE | jq -r '.detail // "Registration successful"'

echo -e "\n${GREEN}3. Assign organiser role${NC}"
curl -s -X POST http://localhost:8000/auth/assign-roles \
-H "Authorization: Bearer $ADMIN_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "username": "organiser",
  "roles": ["user", "organiser"]
}'

echo -e "\n${GREEN}4. Login as organiser${NC}"
ORGANISER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "organiser",
  "password": "password123"
}')
ORGANISER_TOKEN=$(echo $ORGANISER_RESPONSE | jq -r '.access_token')

echo -e "\n${GREEN}5. Create event${NC}"
EVENT_RESPONSE=$(curl -s -X POST http://localhost:8000/events/create \
-H "Authorization: Bearer $ORGANISER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "name": "Test Concert 2026",
  "venue": "Test Arena",
  "date": 1792540800,
  "price": 1,
  "total_tickets": 100
}')
echo $EVENT_RESPONSE | jq

echo -e "\n${GREEN}6. Login as testuser${NC}"
TESTUSER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser",
  "password": "test123"
}')
TESTUSER_TOKEN=$(echo $TESTUSER_RESPONSE | jq -r '.access_token')

echo -e "\n${GREEN}7. Buy ticket${NC}"
BUY_RESPONSE=$(curl -s -X POST http://localhost:8000/events/buy \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "event_id": 1,
  "quantity": 1,
  "user_account": 1
}')
echo $BUY_RESPONSE | jq

echo -e "\n${GREEN}8. Approve ResaleMarket${NC}"
APPROVE_RESPONSE=$(curl -s -X POST http://localhost:8000/market/approval/approve \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "user_account": 1
}')
echo $APPROVE_RESPONSE | jq

echo -e "\n${GREEN}9. List ticket (with price within cap)${NC}"
LIST_RESPONSE=$(curl -s -X POST http://localhost:8000/market/list \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 1,
  "price": 1,
  "seller_account": 1
}')
echo $LIST_RESPONSE | jq

echo -e "\n${GREEN}10. Check listings${NC}"
LISTINGS_RESPONSE=$(curl -s -X GET "http://localhost:8000/market/my-listings?user_account=1" \
-H "Authorization: Bearer $TESTUSER_TOKEN")
echo $LISTINGS_RESPONSE | jq

# Only delist if listing was successful
if echo $LIST_RESPONSE | jq -e '.success' > /dev/null; then
    echo -e "\n${GREEN}11. Delist ticket${NC}"
    DELIST_RESPONSE=$(curl -s -X POST http://localhost:8000/market/delist \
    -H "Authorization: Bearer $TESTUSER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "ticket_id": 1,
      "seller_account": 1
    }')
    echo $DELIST_RESPONSE | jq

    echo -e "\n${GREEN}12. Verify delisting${NC}"
    VERIFY_RESPONSE=$(curl -s -X GET "http://localhost:8000/market/my-listings?user_account=1" \
    -H "Authorization: Bearer $TESTUSER_TOKEN")
    echo $VERIFY_RESPONSE | jq
else
    echo -e "\n${YELLOW}Skipping delist steps as listing failed${NC}"
fi


echo -e "\n${GREEN}13. Register testuser2${NC}"
REGISTER_USER2_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser2",
  "email": "testuser2@test.com",
  "password": "test123",
  "account_index": 3,
  "wallet_address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "private_key": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
}')
echo $REGISTER_USER2_RESPONSE | jq -r '.detail // "Registration successful"'

echo -e "\n${GREEN}14. Login as testuser2${NC}"
TESTUSER2_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser2",
  "password": "test123"
}')
TESTUSER2_TOKEN=$(echo $TESTUSER2_RESPONSE | jq -r '.access_token')

# List ticket again with testuser1
echo -e "\n${GREEN}15. List ticket for sale${NC}"
LIST_RESPONSE=$(curl -s -X POST http://localhost:8000/market/list \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 1,
  "price": 1,
  "seller_account": 1
}')
echo $LIST_RESPONSE | jq

echo -e "\n${GREEN}16. Verify ticket is listed${NC}"
LISTINGS_RESPONSE=$(curl -s -X GET "http://localhost:8000/market/listings" \
-H "Authorization: Bearer $TESTUSER2_TOKEN")
echo $LISTINGS_RESPONSE | jq

echo -e "\n${GREEN}17. Buy listed ticket as testuser2${NC}"
BUY_LISTING_RESPONSE=$(curl -s -X POST http://localhost:8000/market/buy \
-H "Authorization: Bearer $TESTUSER2_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 1,
  "buyer_account": 3
}')
echo $BUY_LISTING_RESPONSE | jq

echo -e "\n${GREEN}18. Verify ticket ownership changed${NC}"
VERIFY_LISTINGS_RESPONSE=$(curl -s -X GET "http://localhost:8000/market/my-listings?user_account=3" \
-H "Authorization: Bearer $TESTUSER2_TOKEN")
echo $VERIFY_LISTINGS_RESPONSE | jq

echo -e "\n${GREEN}✅ Full marketplace test completed${NC}"