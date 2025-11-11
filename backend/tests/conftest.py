"""
Pytest Configuration and Fixtures
Provides test database, test client, and test data fixtures
"""

import pytest
import os
import sys
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
