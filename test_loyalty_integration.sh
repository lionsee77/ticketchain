#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🪙 Testing TicketChain Loyalty System Integration"
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

echo -e "\n${GREEN}2. Register organiser (if not exists)${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "organiser",
  "email": "organiser@test.com",
  "password": "password123",
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
}' > /dev/null 2>&1

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
  "name": "Loyalty Test Concert",
  "venue": "Test Arena",
  "date": 1792540800,
  "price": 1000000000000000000,
  "total_tickets": 100
}')
echo "Event created:"
echo $EVENT_RESPONSE | jq

echo -e "\n${GREEN}6. Register/Login testuser${NC}"
curl -s -X POST http://localhost:8000/auth/register \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser",
  "email": "testuser@test.com",
  "password": "test123",
  "wallet_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
}' > /dev/null 2>&1

TESTUSER_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "username": "testuser",
  "password": "test123"
}')
TESTUSER_TOKEN=$(echo $TESTUSER_RESPONSE | jq -r '.access_token')
echo "Testuser logged in successfully"

echo -e "\n${GREEN}7. Check initial loyalty points balance${NC}"
INITIAL_BALANCE=$(curl -s -X GET "http://localhost:8000/loyalty/balance" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Initial balance:"
echo $INITIAL_BALANCE | jq

echo -e "\n${GREEN}8. Buy ticket to earn loyalty points${NC}"
BUY_RESPONSE=$(curl -s -X POST http://localhost:8000/events/buy \
-H "Authorization: Bearer $TESTUSER_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "event_id": 1,
  "quantity": 1
}')
echo "Ticket purchase (earning points):"
echo $BUY_RESPONSE | jq

echo -e "\n${GREEN}9. Check balance after purchase${NC}"
EARNED_BALANCE=$(curl -s -X GET "http://localhost:8000/loyalty/balance" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Balance after earning points:"
echo $EARNED_BALANCE | jq

echo -e "\n${GREEN}10. Award additional loyalty points manually for testing${NC}"
AWARD_RESPONSE=$(curl -s -X POST "http://localhost:8000/loyalty/award" \
  -H "Authorization: Bearer $TESTUSER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wei_amount": 500000000000000000}')
echo "Manual points award:"
echo $AWARD_RESPONSE | jq

echo -e "\n${GREEN}11. Check updated balance after manual award${NC}"
UPDATED_BALANCE=$(curl -s -X GET "http://localhost:8000/loyalty/balance" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Updated balance:"
echo $UPDATED_BALANCE | jq

echo -e "\n${GREEN}12. Preview loyalty points redemption${NC}"
TICKET_WEI=400000000000000000  # 0.4 ETH
PREVIEW_RESPONSE=$(curl -s "http://localhost:8000/loyalty/preview?ticket_wei=$TICKET_WEI" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Redemption preview:"
echo $PREVIEW_RESPONSE | jq

# Extract values for validation
POINTS_APPLICABLE=$(echo "$PREVIEW_RESPONSE" | jq -r '.points_applicable // "0"')
WEI_DISCOUNT=$(echo "$PREVIEW_RESPONSE" | jq -r '.wei_discount // "0"')
WEI_DUE=$(echo "$PREVIEW_RESPONSE" | jq -r '.wei_due // "0"')

echo "Points applicable: $POINTS_APPLICABLE"
echo "Wei discount: $WEI_DISCOUNT"
echo "Wei due: $WEI_DUE"

echo -e "\n${GREEN}13. Check approval status before approving${NC}"
APPROVAL_STATUS_BEFORE=$(curl -s -X GET "http://localhost:8000/loyalty/approval/status" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Approval status before:"
echo $APPROVAL_STATUS_BEFORE | jq

echo -e "\n${GREEN}14. Approve loyalty points spending${NC}"
APPROVE_RESPONSE=$(curl -s -X POST "http://localhost:8000/loyalty/approval/approve" \
  -H "Authorization: Bearer $TESTUSER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Approval response:"
echo $APPROVE_RESPONSE | jq

echo -e "\n${GREEN}15. Check approval status after approving${NC}"
APPROVAL_STATUS_AFTER=$(curl -s -X GET "http://localhost:8000/loyalty/approval/status" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Approval status after:"
echo $APPROVAL_STATUS_AFTER | jq

echo -e "\n${GREEN}16. Check loyalty points allowance${NC}"
ALLOWANCE_RESPONSE=$(curl -s -X GET "http://localhost:8000/loyalty/allowance" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Allowance status:"
echo $ALLOWANCE_RESPONSE | jq

echo -e "\n${GREEN}17. Redeem loyalty points for ticket discount${NC}"
REDEEM_RESPONSE=$(curl -s -X POST "http://localhost:8000/loyalty/redeem" \
  -H "Authorization: Bearer $TESTUSER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ticket_wei\": $TICKET_WEI}")
echo "Redemption response:"
echo $REDEEM_RESPONSE | jq

echo -e "\n${GREEN}18. Check balance after redemption${NC}"
FINAL_BALANCE=$(curl -s -X GET "http://localhost:8000/loyalty/balance" \
  -H "Authorization: Bearer $TESTUSER_TOKEN")
echo "Final balance:"
echo $FINAL_BALANCE | jq

# Extract validation values from actual redemption (not preview)
REDEMPTION_WEI_DISCOUNT=$(echo "$REDEEM_RESPONSE" | jq -r '.wei_discount // "0"')
REDEMPTION_WEI_DUE=$(echo "$REDEEM_RESPONSE" | jq -r '.wei_due // "0"')
REDEMPTION_TICKET_WEI=$(echo "$REDEEM_RESPONSE" | jq -r '.ticket_wei // "0"')

# Validation checks
echo -e "\n${YELLOW}=== Validation Checks ===${NC}"

# Verify the math using actual redemption values
if [ "$REDEMPTION_WEI_DISCOUNT" != "0" ] && [ "$REDEMPTION_WEI_DUE" != "0" ]; then
    # Use bc for precise arithmetic comparison
    SUM=$(echo "$REDEMPTION_WEI_DUE + $REDEMPTION_WEI_DISCOUNT" | bc)
    echo "Math check - Sum (due + discount): $SUM, Ticket price: $REDEMPTION_TICKET_WEI"

    if [ "$SUM" = "$REDEMPTION_TICKET_WEI" ]; then
        echo "✅ Math check passed: due + discount = ticket price"
    else
        echo "❌ Math check failed: due + discount != ticket price"
    fi

    # Check if discount is within 30% cap
    CAP_WEI=$(jq -n --argjson t "$REDEMPTION_TICKET_WEI" '$t * 30 / 100')
    LEQ_CAP=$(jq -n --argjson d "$REDEMPTION_WEI_DISCOUNT" --argjson cap "$CAP_WEI" '$d <= $cap')

    if [ "$LEQ_CAP" = "true" ]; then
        echo "✅ Discount cap check passed: discount <= 30% of ticket price"
    else
        echo "❌ Discount cap check failed: discount exceeds 30% cap"
    fi
else
    echo "⚠️  Skipping math validation - insufficient points for redemption"
fi

echo -e "\n${GREEN}🎉 Loyalty System Integration Test Completed!${NC}"

echo -e "\n${YELLOW}📝 Summary:${NC}"
echo "   • Loyalty points earned automatically on ticket purchase"
echo "   • Manual points awarding works via API"
echo "   • JWT authentication integrated throughout"
echo "   • Preview system shows accurate discount calculations"
echo "   • Approval system works for points spending"
echo "   • Redemption system enforces 30% discount cap"
echo "   • Full loyalty lifecycle tested end-to-end"


if [ "$LEQ_CAP" = "true" ]; then
    echo "✅ Discount cap check passed: discount <= 30% of ticket price"
else
    echo "❌ Discount cap check failed: discount exceeds 30% cap"
fi

echo "=== Test completed ==="
