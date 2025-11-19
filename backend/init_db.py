"""
Initialize Database - Creates tables and seeds test data
Combined init + seed for Docker startup
"""

from database import db
from crud import create_user, create_credit_cards_from_library
from models import Base, OptimizationGoalEnum
from auth import hash_password
from scripts.seed_merchants import seed_merchants


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

        # Load all credit cards from the card library
        print(f"\n💳 Loading credit cards from library...")
        library_cards = create_credit_cards_from_library(session, user.user_id)

        session.commit()

        # Seed merchants from merchants.json
        print(f"\n🏪 Seeding merchants from merchants.json...")
        try:
            seed_merchants()
        except Exception as e:
            print(f"⚠️  Warning: Could not seed merchants: {e}")
            print("   This is okay if merchants are already seeded or file is missing.")

        print("\n" + "="*60)
        print("✨ DATABASE READY!")
        print("="*60)
        print(f"\n📊 Test Account:")
        print(f"   Email: {user.email}")
        print(f"   User ID: {user.user_id}")
        print(f"   Cards: {len(library_cards)} cards from library")
        print(f"\n🔗 API Base URL: http://localhost:8000/api/v1")
        print(f"   Test endpoint: GET /api/v1/users/{user.user_id}/cards")
        print("="*60 + "\n")


if __name__ == "__main__":
    init_and_seed_database()
