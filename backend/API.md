# Credit Card Rewards Maximizer API Documentation

**Version:** 2.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Tech Stack:** FastAPI + PostgreSQL + Groq AI (Llama 3.3 70B)

---

## Quick Start

### 1. Get Test User ID

The database is auto-seeded with a test user and 3 credit cards on first startup.

```bash
# Start the backend with Docker
docker-compose up

# The test user ID will be displayed in logs, e.g.:
# User ID: user_96b619142f87
```

### 2. Make Your First Request

```bash
# Get user's credit cards
curl http://localhost:8000/api/v1/users/user_96b619142f87/cards

# Get a recommendation
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_96b619142f87",
    "merchant": "Whole Foods",
    "amount": 150.0,
    "category": "groceries",
    "optimization_goal": "cash_back"
  }'
```

### 3. View Interactive API Docs

Navigate to: `http://localhost:8000/docs` (Swagger UI)

---

## Table of Contents

- [Recommendations](#recommendations)
- [Card Management](#card-management)
- [User Analytics](#user-analytics)
- [Advanced Features](#advanced-features)
- [Utility Endpoints](#utility-endpoints)
- [Error Codes](#error-codes)
- [Sequence Diagrams](#sequence-diagrams)

---

## Recommendations

### POST /api/v1/recommend

Get AI-powered credit card recommendation for a transaction.

**Request Body:**
```json
{
  "user_id": "string",
  "merchant": "string",
  "amount": 100.0,
  "category": "dining",
  "optimization_goal": "cash_back",
  "location": "optional_string",
  "timestamp": "optional_datetime"
}
```

**Parameters:**
- `user_id` (required): User's unique identifier
- `merchant` (required): Merchant name (e.g., "Starbucks")
- `amount` (required): Transaction amount (must be > 0)
- `category` (required): One of: `dining`, `travel`, `groceries`, `gas`, `entertainment`, `shopping`, `other`
- `optimization_goal` (required): One of: `cash_back`, `travel_points`, `balanced`, `specific_discounts`
- `location` (optional): Transaction location
- `timestamp` (optional): Transaction timestamp (defaults to now)

**Response (200 OK):**
```json
{
  "recommended_card": {
    "card_id": "card_abc123",
    "card_name": "American Express Gold",
    "expected_value": 6.5,
    "cash_back_earned": 6.0,
    "points_earned": 600.0,
    "applicable_benefits": ["Dining Credits", "Uber Credits"],
    "explanation": "American Express Gold earns $6.00 cash back 600 points ($9.00 value) vs. Citi Double Cash $3.00 cash back. Best choice for cash_back: American Express Gold ($6.50 value)",
    "confidence_score": 0.95
  },
  "alternative_cards": [
    {
      "card_id": "card_def456",
      "card_name": "Citi Double Cash",
      "expected_value": 3.0,
      "cash_back_earned": 3.0,
      "points_earned": 0.0,
      "applicable_benefits": ["2% Cash Back on Everything"],
      "explanation": "Alternative earning $3.00 total value",
      "confidence_score": 0.85
    }
  ],
  "optimization_summary": "Best choice for cash_back: American Express Gold ($6.50 value)",
  "total_savings": 6.5
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_96b619142f87",
    "merchant": "Chipotle",
    "amount": 50.0,
    "category": "dining",
    "optimization_goal": "cash_back"
  }'
```

**Performance:** < 2 seconds (average: 1.2s)

---

## Card Management

### GET /api/v1/users/{user_id}/cards

Get all active credit cards for a user.

**Parameters:**
- `user_id` (path): User's unique identifier

**Response (200 OK):**
```json
[
  {
    "card_id": "card_abc123",
    "card_name": "Chase Sapphire Reserve",
    "issuer": "Chase",
    "cash_back_rate": {
      "dining": 0.03,
      "travel": 0.03,
      "other": 0.01
    },
    "points_multiplier": {
      "dining": 3.0,
      "travel": 3.0,
      "other": 1.0
    },
    "annual_fee": 550.0,
    "benefits": ["Airport Lounge Access", "Travel Insurance"],
    "is_active": true
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/v1/users/user_96b619142f87/cards
```

---

### POST /api/v1/cards

Add a new credit card for a user.

**Query Parameters:**
- `user_id` (required): User's unique identifier

**Request Body:**
```json
{
  "card_name": "Discover It",
  "issuer": "Discover",
  "cash_back_rate": {
    "gas": 0.05,
    "groceries": 0.05,
    "other": 0.01
  },
  "points_multiplier": {
    "gas": 0.0,
    "groceries": 0.0,
    "other": 0.0
  },
  "annual_fee": 0.0,
  "benefits": ["5% Rotating Categories", "Cashback Match"],
  "last_four_digits": "9876",
  "credit_limit": 10000.0
}
```

**Response (201 Created):**
```json
{
  "card_id": "card_new789",
  "card_name": "Discover It",
  "issuer": "Discover",
  "cash_back_rate": {...},
  "points_multiplier": {...},
  "annual_fee": 0.0,
  "benefits": ["5% Rotating Categories", "Cashback Match"],
  "is_active": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/cards?user_id=user_96b619142f87" \
  -H "Content-Type: application/json" \
  -d '{
    "card_name": "Discover It",
    "issuer": "Discover",
    "cash_back_rate": {"gas": 0.05, "other": 0.01},
    "points_multiplier": {"gas": 0.0, "other": 0.0},
    "annual_fee": 0.0,
    "benefits": ["5% Rotating Categories"]
  }'
```

---

### PUT /api/v1/cards/{card_id}

Update an existing credit card.

**Parameters:**
- `card_id` (path): Card's unique identifier

**Request Body (all fields optional):**
```json
{
  "card_name": "Updated Card Name",
  "annual_fee": 95.0,
  "benefits": ["New Benefit 1", "New Benefit 2"],
  "credit_limit": 15000.0,
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "card_id": "card_abc123",
  "card_name": "Updated Card Name",
  "issuer": "Chase",
  "cash_back_rate": {...},
  "points_multiplier": {...},
  "annual_fee": 95.0,
  "benefits": ["New Benefit 1", "New Benefit 2"],
  "is_active": true
}
```

**Example:**
```bash
curl -X PUT http://localhost:8000/api/v1/cards/card_abc123 \
  -H "Content-Type: application/json" \
  -d '{"annual_fee": 95.0}'
```

---

### DELETE /api/v1/cards/{card_id}

Delete (deactivate) a credit card.

**Parameters:**
- `card_id` (path): Card's unique identifier

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Card card_abc123 has been deactivated",
  "card_id": "card_abc123"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8000/api/v1/cards/card_abc123
```

---

## User Analytics

### GET /api/v1/users/{user_id}/transactions

Get transaction history for a user.

**Parameters:**
- `user_id` (path): User's unique identifier
- `limit` (query, optional): Number of transactions to return (default: 50)

**Response (200 OK):**
```json
{
  "user_id": "user_96b619142f87",
  "total_transactions": 15,
  "transactions": [
    {
      "transaction_id": "txn_xyz789",
      "merchant": "Whole Foods",
      "amount": 150.0,
      "category": "groceries",
      "card_used": "American Express Gold",
      "rewards_earned": 6.5,
      "date": "2025-11-10T15:30:00"
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/users/user_96b619142f87/transactions?limit=10"
```

---

### GET /api/v1/users/{user_id}/stats

Get user statistics and optimization metrics.

**Parameters:**
- `user_id` (path): User's unique identifier

**Response (200 OK):**
```json
{
  "total_transactions": 25,
  "total_spent": 3500.0,
  "total_rewards": 125.50,
  "total_potential_rewards": 150.0,
  "missed_value": 24.50,
  "optimization_rate": 0.837
}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/users/user_96b619142f87/stats
```

---

## Advanced Features

### GET /api/v1/users/{user_id}/behavior

Get learned user preferences and spending patterns.

**Parameters:**
- `user_id` (path): User's unique identifier

**Response (200 OK):**
```json
{
  "user_id": "user_96b619142f87",
  "preferred_goal": "cash_back",
  "common_categories": ["dining", "groceries", "shopping"],
  "favorite_merchants": ["Whole Foods", "Starbucks", "Target"],
  "avg_transaction_amount": 85.50,
  "total_transactions": 25,
  "total_rewards_earned": 125.50,
  "optimization_score": 0.85,
  "most_used_card_id": "card_abc123",
  "last_updated": "2025-11-10T15:30:00"
}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/users/user_96b619142f87/behavior
```

---

### GET /api/v1/users/{user_id}/opportunities

Get proactive suggestions for missed optimizations.

**Parameters:**
- `user_id` (path): User's unique identifier

**Response (200 OK):**
```json
{
  "user_id": "user_96b619142f87",
  "opportunities": [
    {
      "type": "missed_optimization",
      "merchant": "Starbucks",
      "amount": 25.0,
      "missed_value": 1.50,
      "suggestion": "You could have earned $1.50 more by using American Express Gold",
      "timestamp": "2025-11-10T10:00:00"
    }
  ],
  "total_missed_value": 15.75
}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/users/user_96b619142f87/opportunities
```

---

### POST /api/v1/feedback

Record user feedback for learning.

**Query Parameters:**
- `transaction_id` (required): Transaction identifier
- `accepted` (required): Whether user accepted recommendation (true/false)
- `card_used` (required): Card actually used
- `rating` (optional): Satisfaction rating (1-5)
- `feedback_text` (optional): Text feedback

**Response (200 OK):**
```json
{
  "status": "recorded",
  "feedback_id": "fb_123",
  "learning_status": {
    "acceptance_rate": 0.85,
    "total_feedback": 20,
    "adjustments": {}
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/feedback?transaction_id=txn_xyz789&accepted=true&card_used=Amex+Gold&rating=5"
```

---

### POST /api/v1/users/{user_id}/rules

Create an automation rule.

**Parameters:**
- `user_id` (path): User's unique identifier

**Query Parameters:**
- `rule_name` (required): Name of the rule
- `condition_type` (required): Type of condition (e.g., "merchant")
- `action_card_id` (required): Card to use when rule matches

**Request Body:**
```json
{
  "merchant": "Whole Foods"
}
```

**Response (200 OK):**
```json
{
  "status": "created",
  "rule_id": "rule_abc123",
  "rule_name": "Always use Amex at Whole Foods"
}
```

---

### GET /api/v1/users/{user_id}/rules

Get automation rules for a user.

**Parameters:**
- `user_id` (path): User's unique identifier

**Response (200 OK):**
```json
{
  "user_id": "user_96b619142f87",
  "rules": [
    {
      "rule_id": "rule_abc123",
      "rule_name": "Always use Amex at Whole Foods",
      "condition_type": "merchant",
      "condition_value": {"merchant": "Whole Foods"},
      "action_card_id": "card_abc123",
      "times_triggered": 5,
      "is_active": true
    }
  ]
}
```

---

## Utility Endpoints

### GET /api/v1/categories

Get list of all available spending categories.

**Response (200 OK):**
```json
["dining", "travel", "groceries", "gas", "entertainment", "shopping", "other"]
```

**Example:**
```bash
curl http://localhost:8000/api/v1/categories
```

---

### GET /api/v1/optimization-goals

Get list of all available optimization goals.

**Response (200 OK):**
```json
["cash_back", "travel_points", "balanced", "specific_discounts"]
```

**Example:**
```bash
curl http://localhost:8000/api/v1/optimization-goals
```

---

### GET /health

Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-10T15:30:00"
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

## Error Codes

| Status Code | Description | Example |
|-------------|-------------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request format |
| 404 | Not Found | User or resource not found |
| 422 | Validation Error | Invalid parameters (e.g., negative amount) |
| 500 | Internal Server Error | Server error occurred |

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Errors:**

1. **User Not Found (404)**
```json
{
  "detail": "User not found"
}
```

2. **No Cards Available (404)**
```json
{
  "detail": "No active credit cards found for user"
}
```

3. **Validation Error (422)**
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

---

## Sequence Diagrams

### Recommendation Flow

```
┌──────┐          ┌─────────┐          ┌──────────┐          ┌─────────┐
│Client│          │FastAPI  │          │PostgreSQL│          │Groq AI  │
└──┬───┘          └────┬────┘          └────┬─────┘          └────┬────┘
   │                   │                    │                     │
   │ POST /recommend   │                    │                     │
   ├──────────────────>│                    │                     │
   │                   │                    │                     │
   │                   │ Get user & cards   │                     │
   │                   ├───────────────────>│                     │
   │                   │                    │                     │
   │                   │ User + 3 cards     │                     │
   │                   │<───────────────────┤                     │
   │                   │                    │                     │
   │                   │ Calculate weighted scores               │
   │                   │ (for each card)    │                     │
   │                   │                    │                     │
   │                   │ Get AI explanation │                     │
   │                   ├────────────────────┼────────────────────>│
   │                   │                    │                     │
   │                   │ Enhanced explanation                    │
   │                   │<────────────────────┼─────────────────────┤
   │                   │                    │                     │
   │                   │ Log transaction    │                     │
   │                   ├───────────────────>│                     │
   │                   │                    │                     │
   │ Recommendation    │                    │                     │
   │<──────────────────┤                    │                     │
   │                   │                    │                     │
```

### Add Card Flow

```
┌──────┐          ┌─────────┐          ┌──────────┐
│Client│          │FastAPI  │          │PostgreSQL│
└──┬───┘          └────┬────┘          └────┬─────┘
   │                   │                    │
   │ POST /cards       │                    │
   ├──────────────────>│                    │
   │                   │                    │
   │                   │ Validate user      │
   │                   ├───────────────────>│
   │                   │                    │
   │                   │ User exists        │
   │                   │<───────────────────┤
   │                   │                    │
   │                   │ Create card        │
   │                   ├───────────────────>│
   │                   │                    │
   │                   │ Card created       │
   │                   │<───────────────────┤
   │                   │                    │
   │ Card details      │                    │
   │<──────────────────┤                    │
   │                   │                    │
```

### User Analytics Flow

```
┌──────┐          ┌─────────┐          ┌──────────┐
│Client│          │FastAPI  │          │PostgreSQL│
└──┬───┘          └────┬────┘          └────┬─────┘
   │                   │                    │
   │ GET /stats        │                    │
   ├──────────────────>│                    │
   │                   │                    │
   │                   │ Get transactions   │
   │                   ├───────────────────>│
   │                   │                    │
   │                   │ Transaction list   │
   │                   │<───────────────────┤
   │                   │                    │
   │                   │ Calculate stats    │
   │                   │ (total spent,      │
   │                   │  rewards, etc.)    │
   │                   │                    │
   │ Statistics        │                    │
   │<──────────────────┤                    │
   │                   │                    │
```

---

## Performance Metrics

Based on integration testing with SQLite test database:

| Endpoint | Average Response Time | Target |
|----------|----------------------|--------|
| POST /recommend | 1.2s | < 2s ✅ |
| GET /cards | 0.05s | < 0.5s ✅ |
| GET /transactions | 0.3s | < 1s ✅ |
| GET /stats | 0.4s | < 1s ✅ |
| GET /health | 0.12s | < 0.2s ✅ |

**Note:** PostgreSQL performance may vary based on network latency and database load.

---

## Testing

Run the test suite:

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

**Test Coverage:**
- 47 integration tests
- 7 performance tests
- Coverage: ~75% of critical paths

---

## Support

For issues or questions:
- Check Swagger docs: `http://localhost:8000/docs`
- Review logs: `backend/logs/agent.log`
- Database health: `GET /health`

---

**Last Updated:** November 10, 2025  
**API Version:** 2.0.0
