"""
Initialize Database - Creates tables and seeds test data
Combined init + seed for Docker startup
"""

from database import db
from crud import create_user, create_credit_card
from models import Base, OptimizationGoalEnum, CardIssuerEnum
from auth import hash_password


def init_and_seed_database():
    """Initialize database tables and seed with test data"""
    
    print("\n" + "="*60)
    print("🔧 INITIALIZING DATABASE")
    print("="*60)
    
    # Create all tables
    print("\n📋 Creating database tables...")
    try:
        db.create_tables()
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"⚠️  Tables may already exist: {e}")
    
    # Seed with test data
    print("\n🌱 Seeding test data...")
    
    with db.session_scope() as session:
        # Create test user
        print("\n👤 Creating test user...")
        user = create_user(
            session,
            email="test@example.com",
            full_name="Test User",
            password_hash=hash_password("password123"),  # Default test password
            phone="+1234567890",
            default_optimization_goal=OptimizationGoalEnum.CASH_BACK
        )
        print(f"   ✅ Created user: {user.email}")
        print(f"   🔑 USER_ID: {user.user_id}")
        print(f"   🔐 Default Password: password123")
        
        # Create test credit cards
        print(f"\n💳 Creating credit cards...")
        
        chase = create_credit_card(
            session,
            user_id=user.user_id,
            card_name="Chase Sapphire Reserve",
            issuer=CardIssuerEnum.CHASE,
            cash_back_rate={"dining": 0.03, "travel": 0.03, "other": 0.01},
            points_multiplier={"dining": 3.0, "travel": 3.0, "other": 1.0},
            annual_fee=550.0,
            benefits=["Airport Lounge Access", "Travel Insurance", "$300 Travel Credit"],
            last_four_digits="4123",
            credit_limit=20000.0
        )
        print(f"   ✅ {chase.card_name}")
        
        citi = create_credit_card(
            session,
            user_id=user.user_id,
            card_name="Citi Double Cash",
            issuer=CardIssuerEnum.CITI,
            cash_back_rate={"dining": 0.02, "travel": 0.02, "groceries": 0.02, "gas": 0.02, "other": 0.02},
            points_multiplier={"dining": 0.0, "travel": 0.0, "other": 0.0},
            annual_fee=0.0,
            benefits=["2% Cash Back on Everything"],
            last_four_digits="8765",
            credit_limit=15000.0
        )
        print(f"   ✅ {citi.card_name}")
        
        amex = create_credit_card(
            session,
            user_id=user.user_id,
            card_name="American Express Gold",
            issuer=CardIssuerEnum.AMEX,
            cash_back_rate={"dining": 0.04, "groceries": 0.04, "other": 0.01},
            points_multiplier={"dining": 4.0, "groceries": 4.0, "other": 1.0},
            annual_fee=250.0,
            benefits=["Dining Credits", "Uber Credits", "No Foreign Fees"],
            last_four_digits="1005",
            credit_limit=25000.0
        )
        print(f"   ✅ {amex.card_name}")
        
        session.commit()
        
        print("\n" + "="*60)
        print("✨ DATABASE READY!")
        print("="*60)
        print(f"\n📊 Test Account:")
        print(f"   Email: {user.email}")
        print(f"   User ID: {user.user_id}")
        print(f"   Cards: 3 (Chase, Citi, Amex)")
        print(f"\n🔗 API Base URL: http://localhost:8000/api/v1")
        print(f"   Test endpoint: GET /api/v1/users/{user.user_id}/cards")
        print("="*60 + "\n")


if __name__ == "__main__":
    init_and_seed_database()
