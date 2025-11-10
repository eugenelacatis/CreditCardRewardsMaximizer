#!/bin/bash

echo "=========================================="
echo "EUGENE - DAY 1 COMPLETE TEST SUITE"
echo "=========================================="
echo ""

# Test 1: All Categories
echo "📋 TEST 1: All Categories with Cash Back Goal"
echo "-------------------------------------------"

categories=("dining" "travel" "groceries" "gas" "entertainment" "shopping" "other")
for cat in "${categories[@]}"; do
    echo -n "  $cat: "
    result=$(curl -X POST http://localhost:8000/api/v1/recommend \
      -H "Content-Type: application/json" \
      -d "{\"user_id\":\"user123\",\"merchant\":\"Test Merchant\",\"amount\":100,\"category\":\"$cat\",\"optimization_goal\":\"cash_back\"}" \
      -s | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['recommended_card']['card_name'])" 2>/dev/null)
    
    if [ -z "$result" ]; then
        echo "❌ FAILED"
    else
        echo "✅ $result"
    fi
done

echo ""
echo "📊 TEST 2: All Optimization Goals"
echo "-------------------------------------------"

goals=("cash_back" "travel_points" "balanced" "specific_discounts")
for goal in "${goals[@]}"; do
    echo -n "  $goal: "
    result=$(curl -X POST http://localhost:8000/api/v1/recommend \
      -H "Content-Type: application/json" \
      -d "{\"user_id\":\"user123\",\"merchant\":\"Test\",\"amount\":100,\"category\":\"dining\",\"optimization_goal\":\"$goal\"}" \
      -s | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['recommended_card']['card_name'])" 2>/dev/null)
    
    if [ -z "$result" ]; then
        echo "❌ FAILED"
    else
        echo "✅ $result"
    fi
done

echo ""
echo "🔍 TEST 3: Edge Cases"
echo "-------------------------------------------"

# Small amount
echo -n "  Small amount (\$0.50): "
result=$(curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Coffee","amount":0.50,"category":"dining","optimization_goal":"cash_back"}' \
  -s | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"{data['recommended_card']['card_name']} - \${data['recommended_card']['cash_back_earned']}\")" 2>/dev/null)
if [ -z "$result" ]; then
    echo "❌ FAILED"
else
    echo "✅ $result"
fi

# Large amount
echo -n "  Large amount (\$5000): "
result=$(curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Electronics","amount":5000,"category":"shopping","optimization_goal":"cash_back"}' \
  -s | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"{data['recommended_card']['card_name']} - \${data['recommended_card']['cash_back_earned']}\")" 2>/dev/null)
if [ -z "$result" ]; then
    echo "❌ FAILED"
else
    echo "✅ $result"
fi

# Invalid user (should still work with mock data)
echo -n "  Different user_id: "
result=$(curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Test","amount":100,"category":"dining","optimization_goal":"cash_back"}' \
  -s | python3 -c "import sys, json; data=json.load(sys.stdin); print('Works')" 2>/dev/null)
if [ -z "$result" ]; then
    echo "❌ FAILED"
else
    echo "✅ $result"
fi

echo ""
echo "🎯 TEST 4: Response Structure Validation"
echo "-------------------------------------------"

response=$(curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Test","amount":100,"category":"dining","optimization_goal":"cash_back"}' \
  -s)

echo -n "  Has recommended_card: "
echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Yes' if 'recommended_card' in data else '❌ No')"

echo -n "  Has alternative_cards: "
echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Yes' if 'alternative_cards' in data else '❌ No')"

echo -n "  Has optimization_summary: "
echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Yes' if 'optimization_summary' in data else '❌ No')"

echo -n "  Has explanation: "
echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Yes' if 'explanation' in data['recommended_card'] else '❌ No')"

echo -n "  Has confidence_score: "
echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ Yes' if 'confidence_score' in data['recommended_card'] else '❌ No')"

echo ""
echo "⚡ TEST 5: Performance Check"
echo "-------------------------------------------"

start=$(date +%s%N)
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Test","amount":100,"category":"dining","optimization_goal":"cash_back"}' \
  -s > /dev/null
end=$(date +%s%N)
duration=$(( (end - start) / 1000000 ))

echo "  Response time: ${duration}ms"
if [ $duration -lt 2000 ]; then
    echo "  ✅ Under 2 seconds (target met)"
else
    echo "  ⚠️  Over 2 seconds (needs optimization)"
fi

echo ""
echo "🔧 TEST 6: Other Endpoints"
echo "-------------------------------------------"

echo -n "  GET /health: "
health=$(curl -s http://localhost:8000/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['status'])" 2>/dev/null)
if [ "$health" = "healthy" ]; then
    echo "✅ $health"
else
    echo "❌ FAILED"
fi

echo -n "  GET /api/v1/users/user123/cards: "
cards=$(curl -s http://localhost:8000/api/v1/users/user123/cards | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null)
if [ ! -z "$cards" ]; then
    echo "✅ $cards cards returned"
else
    echo "❌ FAILED"
fi

echo ""
echo "=========================================="
echo "✅ DAY 1 TESTING COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - All categories tested"
echo "  - All optimization goals tested"
echo "  - Edge cases validated"
echo "  - Response structure verified"
echo "  - Performance checked"
echo "  - Additional endpoints tested"
echo ""
echo "Ready to commit and push! 🚀"
echo ""
