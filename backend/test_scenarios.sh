#!/bin/bash

echo "=== Testing Credit Card Recommendation API ==="
echo ""

echo "Test 1: Dining - Cash Back Goal"
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Starbucks","amount":25.50,"category":"dining","optimization_goal":"cash_back"}' \
  -s | python3 -m json.tool | grep -E "(card_name|cash_back_earned|points_earned|expected_value)" | head -4

echo ""
echo "Test 2: Travel - Travel Points Goal"
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"United Airlines","amount":500,"category":"travel","optimization_goal":"travel_points"}' \
  -s | python3 -m json.tool | grep -E "(card_name|cash_back_earned|points_earned|expected_value)" | head -4

echo ""
echo "Test 3: Groceries - Cash Back Goal"
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Whole Foods","amount":150,"category":"groceries","optimization_goal":"cash_back"}' \
  -s | python3 -m json.tool | grep -E "(card_name|cash_back_earned|points_earned|expected_value)" | head -4

echo ""
echo "Test 4: Gas - Balanced Goal"
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Shell","amount":60,"category":"gas","optimization_goal":"balanced"}' \
  -s | python3 -m json.tool | grep -E "(card_name|cash_back_earned|points_earned|expected_value)" | head -4

echo ""
echo "Test 5: Large Amount"
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","merchant":"Best Buy","amount":2000,"category":"shopping","optimization_goal":"cash_back"}' \
  -s | python3 -m json.tool | grep -E "(card_name|cash_back_earned|points_earned|expected_value)" | head -4

echo ""
echo "=== All Tests Complete ==="
