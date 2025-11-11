# Backend - Credit Card Rewards Maximizer

AI-powered credit card recommendation engine using FastAPI, PostgreSQL, and Groq LLM.

## Quick Start

```bash
# From project root
docker-compose up --build

# Backend runs on: http://localhost:8000
# API docs: http://localhost:8000/docs
```

## Testing

### Manual API Testing

**Test User ID:** Check Docker logs for the generated user ID:
```bash
docker logs credit-card-backend | grep "USER_ID"
# Example output: USER_ID: user_96b619142f87
```

**Get User Cards:**
```bash
curl http://localhost:8000/api/v1/users/{user_id}/cards
```

**Get Recommendation:**
```bash
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{user_id}",
    "merchant": "Starbucks",
    "amount": 50.0,
    "category": "dining",
    "optimization_goal": "cash_back"
  }'
```

**Categories:** `dining`, `travel`, `groceries`, `gas`, `entertainment`, `shopping`, `other`

**Optimization Goals:** `cash_back`, `travel_points`, `balanced`, `specific_discounts`

### Test Different Scenarios

```bash
# Cash back optimization
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"{user_id}","merchant":"Whole Foods","amount":100,"category":"groceries","optimization_goal":"cash_back"}'

# Travel points optimization
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"{user_id}","merchant":"Delta Airlines","amount":500,"category":"travel","optimization_goal":"travel_points"}'

# Balanced optimization
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"{user_id}","merchant":"Target","amount":75,"category":"shopping","optimization_goal":"balanced"}'
```

## Logs

View backend logs:
```bash
docker logs credit-card-backend -f

# Or check agent logs file
cat backend/logs/agent.log
```

## Database

**Reset database:**
```bash
docker-compose down -v  # Removes volumes
docker-compose up --build
```

**Access PostgreSQL:**
```bash
docker exec -it credit-card-postgres psql -U postgres -d agentic_wallet
```

## Environment Variables

Create `backend/.env`:
```bash
GROQ_API_KEY=your_groq_api_key_here
```

DATABASE_URL is set automatically by docker-compose.

## Health Check

```bash
curl http://localhost:8000/health
```

## Architecture

- **`agents.py`** - AI recommendation engine with weighted optimization
- **`main.py`** - FastAPI application and routes
- **`models.py`** - SQLAlchemy database models
- **`database.py`** - Database connection management
- **`crud.py`** - Database CRUD operations
- **`init_db.py`** - Database initialization and seeding
- **`agentic_enhancements.py`** - Advanced agentic features

## Development

**Local development without Docker:**
```bash
# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (or use Docker postgres only)
docker-compose up postgres -d

# Set DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/agentic_wallet

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
