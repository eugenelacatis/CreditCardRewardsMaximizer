# Testing Guide

## Quick Start

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_analytics.py -v

# Run specific test
pytest tests/test_analytics.py::TestAnalyticsEndpoint::test_analytics_endpoint_exists -v
```

## Test Categories

### Rate Limit Handling Tests
```bash
pytest tests/test_rate_limit_handling.py -v
```
Tests the intelligent retry logic for Groq API rate limits.

### Analytics Tests
```bash
pytest tests/test_analytics.py -v
```
Tests the analytics endpoint. **Note:** These make real API calls with 2-second delays between requests to respect rate limits.

### Integration Tests
```bash
pytest tests/test_integration.py -v
```
Full end-to-end workflow tests.

### Performance Tests
```bash
pytest tests/test_performance.py -v
```
Response time and performance benchmarks.

## Important Notes

### Groq API Rate Limits
- **30 requests/minute** - Tests include 2-second delays to respect this
- **100K tokens/day** - If you hit this limit, tests will fail with 503 errors

If you see rate limit errors:
```
Rate limit reached for tokens per day (TPD): Limit 100000
```
Wait for the daily limit to reset (midnight UTC) and run tests again.

### Test Database
Tests use an in-memory SQLite database that's created fresh for each test run. No cleanup needed.

## Running Tests with Docker

```bash
# From project root
docker-compose up -d

# Run tests in container
docker-compose exec backend pytest tests/ -v

# View logs
docker-compose logs backend
```

## Useful Options

```bash
# Show print statements
pytest tests/ -v -s

# Stop on first failure
pytest tests/ -v -x

# Run only fast tests (no API calls)
pytest tests/ -v -k "not recommendation"

# Show detailed error traces
pytest tests/ -v --tb=short
```

## Test Coverage

```bash
# Run with coverage report
pytest tests/ --cov=. --cov-report=html

# View report
open htmlcov/index.html
```
