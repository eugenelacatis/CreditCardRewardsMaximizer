"""
Database Migration Script
Adds:
1. is_library_card column to credit_cards table
2. user_credit_cards junction table (if not exists)

Run this ONCE before deploying your updated models.py
"""

from database import db
from sqlalchemy import text

def run_migration():
    """Run all necessary migrations"""
    
    print("=" * 70)
    print("DATABASE MIGRATION")
    print("=" * 70)
    
    with db.session_scope() as session:
        try:
            # =====================================================
            # STEP 1: Add is_library_card column to credit_cards
            # =====================================================
            print("\n📋 Step 1: Checking is_library_card column...")
            
            check_column_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='credit_cards' 
                AND column_name='is_library_card'
            """)
            
            result = session.execute(check_column_sql).fetchone()
            
            if not result:
                print("   Adding is_library_card column to credit_cards...")
                add_column_sql = text("""
                    ALTER TABLE credit_cards 
                    ADD COLUMN is_library_card BOOLEAN DEFAULT FALSE NOT NULL
                """)
                session.execute(add_column_sql)
                
                # Add index for library cards
                add_index_sql = text("""
                    CREATE INDEX IF NOT EXISTS idx_card_is_library 
                    ON credit_cards(is_library_card)
                """)
                session.execute(add_index_sql)
                
                session.commit()
                print("   ✅ Added is_library_card column and index")
            else:
                print("   ✅ is_library_card column already exists")
            
            # =====================================================
            # STEP 2: Create user_credit_cards table
            # =====================================================
            print("\n📋 Step 2: Checking user_credit_cards table...")
            
            check_table_sql = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='user_credit_cards'
            """)
            
            result = session.execute(check_table_sql).fetchone()
            
            if not result:
                print("   Creating user_credit_cards table...")
                create_table_sql = text("""
                    CREATE TABLE user_credit_cards (
                        user_card_id SERIAL PRIMARY KEY,
                        user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                        card_id VARCHAR(50) NOT NULL REFERENCES credit_cards(card_id) ON DELETE CASCADE,
                        
                        nickname VARCHAR(255),
                        last_four_digits VARCHAR(4),
                        credit_limit FLOAT,
                        current_balance FLOAT DEFAULT 0.0,
                        
                        is_active BOOLEAN DEFAULT TRUE,
                        activation_date TIMESTAMP DEFAULT NOW(),
                        
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        
                        CONSTRAINT check_user_card_credit_limit_positive CHECK (credit_limit >= 0)
                    )
                """)
                session.execute(create_table_sql)
                
                # Add indexes
                print("   Adding indexes to user_credit_cards...")
                indexes_sql = [
                    "CREATE INDEX idx_user_card_user_id ON user_credit_cards(user_id)",
                    "CREATE INDEX idx_user_card_card_id ON user_credit_cards(card_id)",
                    "CREATE INDEX idx_user_card_is_active ON user_credit_cards(is_active)",
                    "CREATE UNIQUE INDEX idx_user_card_unique ON user_credit_cards(user_id, card_id)"
                ]
                
                for idx_sql in indexes_sql:
                    session.execute(text(idx_sql))
                
                session.commit()
                print("   ✅ Created user_credit_cards table with indexes")
            else:
                print("   ✅ user_credit_cards table already exists")
            
            # =====================================================
            # STEP 3: Migrate existing user cards (OPTIONAL)
            # =====================================================
            print("\n📋 Step 3: Checking for existing user cards to migrate...")
            
            # Check if there are any cards that should be migrated to user_credit_cards
            check_user_cards_sql = text("""
                SELECT COUNT(*) 
                FROM credit_cards 
                WHERE user_id IS NOT NULL 
                AND is_library_card = FALSE
            """)
            
            count_result = session.execute(check_user_cards_sql).fetchone()
            cards_to_migrate = count_result[0] if count_result else 0
            
            if cards_to_migrate > 0:
                print(f"   Found {cards_to_migrate} user cards to migrate...")
                migrate_sql = text("""
                    INSERT INTO user_credit_cards (
                        user_id, card_id, last_four_digits, credit_limit, 
                        current_balance, is_active, activation_date
                    )
                    SELECT 
                        user_id, 
                        card_id, 
                        last_four_digits,
                        credit_limit,
                        current_balance,
                        is_active,
                        activation_date
                    FROM credit_cards
                    WHERE user_id IS NOT NULL 
                    AND is_library_card = FALSE
                    ON CONFLICT (user_id, card_id) DO NOTHING
                """)
                session.execute(migrate_sql)
                session.commit()
                print(f"   ✅ Migrated {cards_to_migrate} cards to user_credit_cards")
            else:
                print("   ✅ No cards to migrate")
            
            print("\n" + "=" * 70)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 70)
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            session.rollback()
            raise

def verify_migration():
    """Verify that migration was successful"""
    print("\n🔍 Verifying migration...")
    
    with db.session_scope() as session:
        try:
            # Check is_library_card column
            check1 = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='credit_cards' 
                AND column_name='is_library_card'
            """)
            result1 = session.execute(check1).fetchone()
            
            # Check user_credit_cards table
            check2 = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='user_credit_cards'
            """)
            result2 = session.execute(check2).fetchone()
            
            if result1 and result2:
                print("✅ All schema changes verified successfully!")
                return True
            else:
                print("⚠️  Some schema changes may not have been applied")
                return False
                
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("CREDIT CARD REWARDS MAXIMIZER - DATABASE MIGRATION")
    print("=" * 70)
    
    # Check database connection
    print("\n🔌 Checking database connection...")
    if not db.health_check():
        print("❌ Database connection failed. Please check your connection.")
        print("   Make sure PostgreSQL is running and DATABASE_URL is correct.")
        exit(1)
    print("✅ Database connection OK")
    
    # Run migration
    try:
        run_migration()
        
        # Verify migration
        if verify_migration():
            print("\n🎉 Migration complete! You can now use your updated models.")
            print("\nNext steps:")
            print("1. Replace your crud.py, models.py, and main.py with the updated versions")
            print("2. Restart your backend: docker-compose restart backend")
            print("3. Test the add → remove → add flow with cards")
        else:
            print("\n⚠️  Migration completed but verification had issues.")
            print("   Please check the output above for details.")
            
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        print("\nIf you see constraint errors, you may need to:")
        print("1. Backup your data")
        print("2. Drop affected tables")
        print("3. Run this migration again")
        exit(1)
