"""
Prometheus metrics for the Credit Card Rewards Maximizer.

This module defines all application metrics for monitoring:
- HTTP request metrics
- Database metrics
- AI/Groq API metrics
- Business metrics
"""

from prometheus_client import Counter, Histogram, Gauge, Info, Summary

# =============================================================================
# HTTP Metrics
# =============================================================================

HTTP_REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'path', 'status_code'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

HTTP_REQUESTS_TOTAL = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'path', 'status_code']
)

HTTP_REQUEST_SIZE = Histogram(
    'http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'path'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)

HTTP_RESPONSE_SIZE = Histogram(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'path'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)

ACTIVE_REQUESTS = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

# =============================================================================
# Database Metrics
# =============================================================================

DB_QUERY_DURATION = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

DB_QUERIES_TOTAL = Counter(
    'db_queries_total',
    'Total number of database queries',
    ['operation', 'table', 'status']
)

DB_CONNECTION_POOL_SIZE = Gauge(
    'db_connection_pool_size',
    'Current size of the database connection pool'
)

DB_CONNECTION_POOL_CHECKED_OUT = Gauge(
    'db_connection_pool_checked_out',
    'Number of connections currently checked out from the pool'
)

DB_CONNECTION_POOL_OVERFLOW = Gauge(
    'db_connection_pool_overflow',
    'Number of overflow connections in use'
)

# =============================================================================
# AI/Groq API Metrics
# =============================================================================

AI_REQUEST_DURATION = Histogram(
    'ai_request_duration_seconds',
    'AI API request duration in seconds',
    ['model', 'operation'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
)

AI_REQUESTS_TOTAL = Counter(
    'ai_requests_total',
    'Total number of AI API requests',
    ['model', 'operation', 'status']
)

AI_TOKENS_USED = Counter(
    'ai_tokens_used_total',
    'Total number of AI tokens used',
    ['model', 'token_type']  # token_type: prompt, completion
)

AI_ESTIMATED_COST = Counter(
    'ai_estimated_cost_dollars',
    'Estimated cost of AI API calls in dollars',
    ['model']
)

# =============================================================================
# Business Metrics
# =============================================================================

RECOMMENDATIONS_TOTAL = Counter(
    'recommendations_total',
    'Total number of recommendations made',
    ['status']  # success, error
)

RECOMMENDATION_ACCEPTED = Counter(
    'recommendation_accepted_total',
    'Number of recommendations accepted by users'
)

RECOMMENDATION_REJECTED = Counter(
    'recommendation_rejected_total',
    'Number of recommendations rejected by users'
)

CARDS_REGISTERED = Gauge(
    'cards_registered_total',
    'Total number of credit cards registered'
)

USERS_TOTAL = Gauge(
    'users_total',
    'Total number of registered users'
)

TRANSACTIONS_TOTAL = Counter(
    'transactions_total',
    'Total number of transactions processed',
    ['category']
)

ESTIMATED_SAVINGS = Counter(
    'estimated_savings_dollars',
    'Total estimated savings from recommendations'
)

# =============================================================================
# Location Service Metrics
# =============================================================================

LOCATION_REQUESTS_TOTAL = Counter(
    'location_requests_total',
    'Total number of location service requests',
    ['service', 'status']  # service: osm, google
)

LOCATION_REQUEST_DURATION = Histogram(
    'location_request_duration_seconds',
    'Location service request duration',
    ['service'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# =============================================================================
# Application Info
# =============================================================================

APP_INFO = Info(
    'app',
    'Application information'
)

# Set application info on module load
APP_INFO.info({
    'version': '1.0.0',
    'service': 'credit-card-rewards-backend',
    'python_version': '3.11'
})


# =============================================================================
# Helper Functions
# =============================================================================

def track_db_query(operation: str, table: str, duration: float, success: bool = True):
    """
    Track a database query.

    Args:
        operation: Type of operation (select, insert, update, delete)
        table: Table name
        duration: Query duration in seconds
        success: Whether the query succeeded
    """
    DB_QUERY_DURATION.labels(operation=operation, table=table).observe(duration)
    DB_QUERIES_TOTAL.labels(
        operation=operation,
        table=table,
        status='success' if success else 'error'
    ).inc()


def track_ai_request(model: str, operation: str, duration: float,
                     prompt_tokens: int = 0, completion_tokens: int = 0,
                     success: bool = True):
    """
    Track an AI API request with token usage and estimated cost.

    Args:
        model: Model name (e.g., 'llama-3.3-70b-versatile')
        operation: Operation type (e.g., 'recommendation')
        duration: Request duration in seconds
        prompt_tokens: Number of prompt tokens
        completion_tokens: Number of completion tokens
        success: Whether the request succeeded
    """
    AI_REQUEST_DURATION.labels(model=model, operation=operation).observe(duration)
    AI_REQUESTS_TOTAL.labels(
        model=model,
        operation=operation,
        status='success' if success else 'error'
    ).inc()

    if prompt_tokens > 0:
        AI_TOKENS_USED.labels(model=model, token_type='prompt').inc(prompt_tokens)
    if completion_tokens > 0:
        AI_TOKENS_USED.labels(model=model, token_type='completion').inc(completion_tokens)

    # Estimate cost (Groq pricing as of 2024)
    # These are approximate rates - adjust based on actual pricing
    cost = 0
    if 'llama' in model.lower():
        # Groq Llama pricing (approximate)
        cost = (prompt_tokens * 0.05 + completion_tokens * 0.08) / 1_000_000

    if cost > 0:
        AI_ESTIMATED_COST.labels(model=model).inc(cost)


def track_recommendation(success: bool, accepted: bool = None, savings: float = 0):
    """
    Track a recommendation event.

    Args:
        success: Whether the recommendation was generated successfully
        accepted: Whether the user accepted the recommendation (None if not yet known)
        savings: Estimated savings in dollars
    """
    RECOMMENDATIONS_TOTAL.labels(status='success' if success else 'error').inc()

    if accepted is True:
        RECOMMENDATION_ACCEPTED.inc()
    elif accepted is False:
        RECOMMENDATION_REJECTED.inc()

    if savings > 0:
        ESTIMATED_SAVINGS.inc(savings)


def update_business_metrics(users: int = None, cards: int = None):
    """
    Update business gauge metrics.

    Args:
        users: Total number of users
        cards: Total number of cards
    """
    if users is not None:
        USERS_TOTAL.set(users)
    if cards is not None:
        CARDS_REGISTERED.set(cards)
