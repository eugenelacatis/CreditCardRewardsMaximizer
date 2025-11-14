"""
Pytest Configuration and Fixtures
Provides test database, test client, and test data fixtures
"""

import pytest
import os
import sys
import time
from collections import deque
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
from models import User, CreditCard, OptimizationGoalEnum, CardIssuerEnum
from crud import create_user, create_credit_card
import uuid


# Test Database URL (SQLite in-memory for fast tests)
TEST_DATABASE_URL = "sqlite:///./test.db"


# ============================================================================
# GROQ API RATE LIMIT TRACKER
# ============================================================================
class GroqRateLimitTracker:
    """
    Tracks Groq API calls and automatically pauses when approaching rate limits.
    Groq free tier: ~30 requests per minute for llama-3.3-70b-versatile
    """
    def __init__(self, max_requests_per_minute=25, window_seconds=60):
        self.max_requests = max_requests_per_minute  # Conservative: 25 instead of 30
        self.window_seconds = window_seconds
        self.request_times = deque()
        self.total_waits = 0
        self.total_wait_time = 0
    
    def record_request(self):
        """Record an API request and pause if needed"""
        current_time = time.time()
        
        # Remove requests older than the time window
        while self.request_times and current_time - self.request_times[0] > self.window_seconds:
            self.request_times.popleft()
        
        # Check if we're at the limit
        if len(self.request_times) >= self.max_requests:
            # Calculate how long to wait
            oldest_request = self.request_times[0]
            wait_time = self.window_seconds - (current_time - oldest_request) + 1  # +1 for safety
            
            if wait_time > 0:
                self.total_waits += 1
                self.total_wait_time += wait_time
                print(f"\n⏸️  Rate limit approaching ({len(self.request_times)}/{self.max_requests} requests)")
                print(f"   Pausing for {wait_time:.1f}s to avoid 429 errors...")
                time.sleep(wait_time)
                current_time = time.time()
                
                # Clean up old requests after waiting
                while self.request_times and current_time - self.request_times[0] > self.window_seconds:
                    self.request_times.popleft()
        
        # Record this request
        self.request_times.append(current_time)
    
    def get_stats(self):
        """Get statistics about rate limiting"""
        return {
            "total_requests": len(self.request_times),
            "total_waits": self.total_waits,
            "total_wait_time": self.total_wait_time
        }


# Global rate limit tracker (session scope)
_rate_limit_tracker = GroqRateLimitTracker()


@pytest.fixture(scope="session")
def rate_limit_tracker():
    """Provide the rate limit tracker to tests"""
    return _rate_limit_tracker


def pytest_runtest_setup(item):
    """
    Hook that runs before each test. Checks rate limits and pauses if needed.
    This prevents 429 errors by proactively managing API call rate.
    """
    test_name = item.name
    
    # Estimate API calls based on test name
    estimated_calls = 0
    
    if "multiple_sequential" in test_name.lower():
        estimated_calls = 10  # test_multiple_sequential_requests makes 10 calls
    elif "recommendation" in test_name.lower():
        estimated_calls = 1  # Single recommendation test
    elif "performance" in test_name.lower() and "recommendation" in test_name.lower():
        estimated_calls = 1
    
    # Record the estimated calls BEFORE running the test
    if estimated_calls > 0:
        print(f"\n🔍 Test '{test_name}' will make ~{estimated_calls} API call(s)")
        for _ in range(estimated_calls):
            _rate_limit_tracker.record_request()


def pytest_sessionfinish(session, exitstatus):
    """Print rate limit statistics at the end of the test session"""
    stats = _rate_limit_tracker.get_stats()
    print(f"\n{'='*70}")
    print(f"📊 Groq API Rate Limit Management:")
    print(f"   Total API calls made: ~{stats['total_requests']}")
    print(f"   Times paused to avoid rate limits: {stats['total_waits']}")
    if stats['total_waits'] > 0:
        print(f"   Total wait time: {stats['total_wait_time']:.1f}s")
        print(f"   ✅ Successfully avoided 429 errors!")
    else:
        print(f"   ✅ No rate limit pauses needed")
    print(f"{'='*70}")


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False}  # SQLite specific
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create a new database session for each test"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture(scope="function")
def test_client(test_db):
    """Create FastAPI test client with test database"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(test_db):
    """Create a test user with credit cards"""
    # Create user
    user = create_user(
        test_db,
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        full_name="Test User",
        phone="+1234567890",
        default_optimization_goal=OptimizationGoalEnum.BALANCED
    )
    
    # Create test credit cards
    chase = create_credit_card(
        test_db,
        user_id=user.user_id,
        card_name="Chase Sapphire Reserve",
        issuer=CardIssuerEnum.CHASE,
        cash_back_rate={"dining": 0.03, "travel": 0.03, "groceries": 0.01, "gas": 0.01, "other": 0.01},
        points_multiplier={"dining": 3.0, "travel": 3.0, "groceries": 1.0, "gas": 1.0, "other": 1.0},
        annual_fee=550.0,
        benefits=["Airport Lounge Access", "Travel Insurance", "$300 Travel Credit"],
        last_four_digits="4123",
        credit_limit=20000.0
    )
    
    citi = create_credit_card(
        test_db,
        user_id=user.user_id,
        card_name="Citi Double Cash",
        issuer=CardIssuerEnum.CITI,
        cash_back_rate={"dining": 0.02, "travel": 0.02, "groceries": 0.02, "gas": 0.02, "other": 0.02},
        points_multiplier={"dining": 0.0, "travel": 0.0, "groceries": 0.0, "gas": 0.0, "other": 0.0},
        annual_fee=0.0,
        benefits=["2% Cash Back on Everything"],
        last_four_digits="8765",
        credit_limit=15000.0
    )
    
    amex = create_credit_card(
        test_db,
        user_id=user.user_id,
        card_name="American Express Gold",
        issuer=CardIssuerEnum.AMEX,
        cash_back_rate={"dining": 0.04, "groceries": 0.04, "travel": 0.01, "gas": 0.01, "other": 0.01},
        points_multiplier={"dining": 4.0, "groceries": 4.0, "travel": 1.0, "gas": 1.0, "other": 1.0},
        annual_fee=250.0,
        benefits=["Dining Credits", "Uber Credits", "No Foreign Fees"],
        last_four_digits="1005",
        credit_limit=25000.0
    )
    
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def sample_transaction_data():
    """Sample transaction data for testing"""
    return {
        "merchant": "Chipotle",
        "amount": 50.0,
        "category": "dining",
        "optimization_goal": "cash_back"
    }
