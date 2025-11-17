"""
Fix Database Schema - Adds missing password_hash column or recreates tables
Run this if you get "column users.password_hash does not exist" error
"""

from database import db
from sqlalchemy import inspect, text
from models import Base

def check_and_fix_schema():
    """Check if password_hash column exists, if not, recreate tables"""
    
    print("\n" + "="*60)
    print("🔧 FIXING DATABASE SCHEMA")
    print("="*60)
    
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'users' not in tables:
            print("\n📋 Users table doesn't exist. Creating all tables...")
            db.create_tables()
            print("✅ Tables created!")
            return
        
        # Check if password_hash column exists
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'password_hash' in columns:
            print("\n✅ Schema is correct - password_hash column exists!")
            return
        
        print("\n⚠️  Schema mismatch detected!")
        print(f"   Existing columns: {', '.join(columns)}")
        print("   Missing: password_hash")
        print("\n🔄 Recreating tables to fix schema...")
        print("   (This will delete all existing data!)")
        
        # Drop and recreate tables
        db.drop_tables()
        db.create_tables()
        
        print("\n✅ Schema fixed! Tables recreated with correct structure.")
        print("   Note: All existing data has been deleted.")
        print("   Run init_db.py to seed test data if needed.")
        
    except Exception as e:
        print(f"\n❌ Error fixing schema: {e}")
        raise


if __name__ == "__main__":
    check_and_fix_schema()

