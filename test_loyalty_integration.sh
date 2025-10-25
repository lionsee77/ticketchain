#!/bin/bash

# Test script to verify loyalty system integration
echo "=== Testing Loyalty System Integration ==="

# Test user address (account 1 in the test setup)
BUYER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

echo "1. Checking initial loyalty points balance..."
INITIAL_BALANCE=$(curl -s "http://localhost:8000/loyalty/balance/$BUYER" | jq -r '.balance')
echo "Initial balance: $INITIAL_BALANCE"

echo "2. Awarding loyalty points manually..."
AWARD_RESPONSE=$(curl -s -X POST "http://localhost:8000/loyalty/award" \
  -H "Content-Type: application/json" \
  -d "{\"to_address\": \"$BUYER\", \"wei_amount\": 100000000000000000}")

echo "Award response: $AWARD_RESPONSE"

echo "3. Checking balance after awarding points..."
NEW_BALANCE=$(curl -s "http://localhost:8000/loyalty/balance/$BUYER" | jq -r '.balance')
echo "New balance: $NEW_BALANCE"

echo "4. Testing loyalty preview with points..."
TICKET_WEI=400000000000000000  # 0.4 ETH
PREVIEW_RESPONSE=$(curl -s "http://localhost:8000/loyalty/preview?address=$BUYER&ticket_wei=$TICKET_WEI")
echo "Preview response: $PREVIEW_RESPONSE"

POINTS_APPLICABLE=$(echo "$PREVIEW_RESPONSE" | jq -r '.points_applicable')
WEI_DISCOUNT=$(echo "$PREVIEW_RESPONSE" | jq -r '.wei_discount')
WEI_DUE=$(echo "$PREVIEW_RESPONSE" | jq -r '.wei_due')

echo "Points applicable: $POINTS_APPLICABLE"
echo "Wei discount: $WEI_DISCOUNT"
echo "Wei due: $WEI_DUE"

# Verify the math
SUM=$(jq -n --argjson a "$WEI_DUE" --argjson b "$WEI_DISCOUNT" '$a + $b')
echo "Sum (due + discount): $SUM"
echo "Ticket price: $TICKET_WEI"

if [ "$SUM" = "$TICKET_WEI" ]; then
    echo "✅ Math check passed: due + discount = ticket price"
else
    echo "❌ Math check failed: due + discount != ticket price"
fi

# Check if discount is within 30% cap
CAP_WEI=$(jq -n --argjson t "$TICKET_WEI" '$t * 30 / 100')
LEQ_CAP=$(jq -n --argjson d "$WEI_DISCOUNT" --argjson cap "$CAP_WEI" '$d <= $cap')

if [ "$LEQ_CAP" = "true" ]; then
    echo "✅ Discount cap check passed: discount <= 30% of ticket price"
else
    echo "❌ Discount cap check failed: discount exceeds 30% cap"
fi

echo "=== Test completed ==="
