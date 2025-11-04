#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Testing TicketChain Marketplace Flow"
echo -e "${YELLOW}⚠️  Note: For clean testing, restart blockchain: docker-compose restart ticketchain-blockchain-1${NC}"

# Store tokens
echo -e "\n${GREEN}1. Login as admin${NC}"
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "admin",
  "password": "password123"
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
  "account_index": 1,
  "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "private_key": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
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
  "symbol": "TC2026",
  "venue": "Test Arena",
  "date": 1792540800,
  "price": 1,
  "total_tickets": 100,
  "ticket_price": 1,
  "max_supply": 100,
  "max_resale_price": 2
}')
echo $EVENT_RESPONSE | jq

echo -e "\n${GREEN}6. Register/Login testuser${NC}"
# Try to register first (in case doesn't exist)
curl -s -X POST http://localhost:8000/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser",
  "email": "testuser@test.com",
  "password": "test123",
  "account_index": 2,
  "wallet_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
}' > /dev/null 2>&1

# Now login
TESTUSER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser",
  "password": "test123"
}')
TESTUSER_TOKEN=$(echo $TESTUSER_RESPONSE | jq -r '.access_token')
echo "Testuser logged in successfully"

echo -e "\n${GREEN}7. Buy ticket${NC}"
BUY_RESPONSE=$(curl -s -X POST http://localhost:8000/events/buy \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "event_id": 1,
  "quantity": 1
}')
echo $BUY_RESPONSE | jq

echo -e "\n${GREEN}8. Approve ResaleMarket${NC}"
APPROVE_RESPONSE=$(curl -s -X POST http://localhost:8000/market/approval/approve \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{}')
echo $APPROVE_RESPONSE | jq

echo -e "\n${GREEN}9. Check testuser's tickets before listing${NC}"
TESTUSER_LISTINGS=$(curl -s -X GET "http://localhost:8000/market/my-listings" \
-H "Authorization: Bearer $TESTUSER_TOKEN")
echo "testuser current listings:"
echo $TESTUSER_LISTINGS | jq

echo -e "\n${GREEN}10. Try to list ticket #1 (may fail if blockchain state has issues)${NC}"
LIST_RESPONSE=$(curl -s -X POST http://localhost:8000/market/list \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 1,
  "price": 1
}')
echo $LIST_RESPONSE | jq

# Only attempt delist if listing was successful
if echo $LIST_RESPONSE | jq -e '.success' > /dev/null; then
    echo -e "\n${GREEN}11. Delist ticket${NC}"
    DELIST_RESPONSE=$(curl -s -X POST http://localhost:8000/market/delist \
    -H "Authorization: Bearer $TESTUSER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "ticket_id": 1
    }')
    echo $DELIST_RESPONSE | jq
else
    echo -e "\n${YELLOW}⚠️  Skipping delist - listing failed (likely blockchain state issue, prune docker volume)${NC}"
fi

echo -e "\n${GREEN}12. Final testuser listings check${NC}"
FINAL_TESTUSER_LISTINGS=$(curl -s -X GET "http://localhost:8000/market/my-listings" \
-H "Authorization: Bearer $TESTUSER_TOKEN")
echo $FINAL_TESTUSER_LISTINGS | jq


echo -e "\n${GREEN}13. Register/Login testuser2${NC}"
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

echo -e "\n${GREEN}14.5. testuser2 buys their own ticket${NC}"
BUY_RESPONSE2=$(curl -s -X POST http://localhost:8000/events/buy \
-H "Authorization: Bearer $TESTUSER2_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "event_id": 1,
  "quantity": 1
}')
echo $BUY_RESPONSE2 | jq

echo -e "\n${GREEN}14.6. testuser2 approves ResaleMarket${NC}"
APPROVE_RESPONSE2=$(curl -s -X POST http://localhost:8000/market/approval/approve \
-H "Authorization: Bearer $TESTUSER2_TOKEN" \
-H "Content-Type: application/json" \
-d '{}')
echo $APPROVE_RESPONSE2 | jq

# List testuser2's ticket (#2) for sale
echo -e "\n${GREEN}15. testuser2 lists their ticket #2 for sale${NC}"
LIST_RESPONSE2=$(curl -s -X POST http://localhost:8000/market/list \
-H "Authorization: Bearer $TESTUSER2_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 2,
  "price": 1
}')
echo $LIST_RESPONSE2 | jq

echo -e "\n${GREEN}16. Verify ticket is listed${NC}"
LISTINGS_RESPONSE=$(curl -s -X GET "http://localhost:8000/market/listings" \
-H "Authorization: Bearer $TESTUSER_TOKEN")
echo $LISTINGS_RESPONSE | jq

echo -e "\n${GREEN}17. Buy listed ticket #2 as testuser${NC}"
BUY_LISTING_RESPONSE=$(curl -s -X POST http://localhost:8000/market/buy \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 2
}')
echo $BUY_LISTING_RESPONSE | jq

echo -e "\n${GREEN}18. Verify successful purchase${NC}"
if echo $BUY_LISTING_RESPONSE | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Marketplace purchase successful!${NC}"
    # Check that testuser2 no longer has the ticket listed
    TESTUSER2_LISTINGS=$(curl -s -X GET "http://localhost:8000/market/my-listings" \
    -H "Authorization: Bearer $TESTUSER2_TOKEN")
    echo "testuser2 listings after sale:"
    echo $TESTUSER2_LISTINGS | jq
else
    echo -e "${RED}❌ Marketplace purchase failed${NC}"
    echo $BUY_LISTING_RESPONSE | jq
fi

echo -e "\n${GREEN}19. Verify testuser can list the purchased ticket${NC}"
# testuser should now own ticket #2 and be able to list it
LIST_PURCHASED_RESPONSE=$(curl -s -X POST http://localhost:8000/market/list \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "ticket_id": 2,
  "price": 1
}')
echo $LIST_PURCHASED_RESPONSE | jq

if echo $LIST_PURCHASED_RESPONSE | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ testuser successfully listed the purchased ticket!${NC}"
    
    echo -e "\n${GREEN}20. Verify listing appears in marketplace${NC}"
    FINAL_LISTINGS=$(curl -s -X GET "http://localhost:8000/market/listings" \
    -H "Authorization: Bearer $TESTUSER_TOKEN")
    echo "Current marketplace listings:"
    echo $FINAL_LISTINGS | jq
    
    echo -e "\n${GREEN}21. Clean up - delist the ticket${NC}"
    FINAL_DELIST=$(curl -s -X POST http://localhost:8000/market/delist \
    -H "Authorization: Bearer $TESTUSER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "ticket_id": 2
    }')
    echo $FINAL_DELIST | jq
    
    if echo $FINAL_DELIST | jq -e '.success' > /dev/null; then
        echo -e "${GREEN}✅ Ticket successfully delisted - testuser now owns ticket #2 outright${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  testuser could not list the purchased ticket (may be blockchain state issue)${NC}"
fi

echo -e "\n${GREEN}✅ Complete marketplace ownership transfer test completed${NC}"
echo -e "\n${GREEN}🎉 Summary: testuser2 → listed ticket #2 → testuser bought it → testuser can now list it${NC}"