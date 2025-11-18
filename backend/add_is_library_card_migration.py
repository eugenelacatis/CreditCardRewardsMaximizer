"""
Migration: Add is_library_card field to credit_cards table
Run this with: python migrations/add_is_library_card.py
"""

from sqlalchemy import text
from database import SessionLocal, engine

def upgrade():
    """Add is_library_card column"""
    db = SessionLocal()
    try:
        print("Adding is_library_card column...")
        db.execute(text("""
            ALTER TABLE credit_cards 
            ADD COLUMN IF NOT EXISTS is_library_card BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        
        print("Creating index on is_library_card...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_card_is_library 
            ON credit_cards(is_library_card);
        """))
        
        db.commit()
        print("✓ Migration completed successfully!")
        print("✓ Added is_library_card column and index")
    except Exception as e:
        db.rollback()
        print(f"✗ Migration failed: {str(e)}")
        raise
    finally:
        db.close()


def downgrade():
    """Remove is_library_card column"""
    db = SessionLocal()
    try:
        print("Removing index...")
        db.execute(text("""
            DROP INDEX IF EXISTS idx_card_is_library;
        """))
        
        print("Removing is_library_card column...")
        db.execute(text("""
            ALTER TABLE credit_cards 
            DROP COLUMN IF EXISTS is_library_card;
        """))
        
        db.commit()
        print("✓ Rollback completed successfully!")
        print("✓ Removed is_library_card column and index")
    except Exception as e:
        db.rollback()
        print(f"✗ Rollback failed: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        print("Running downgrade migration...")
        downgrade()
    else:
        print("Running upgrade migration...")
        upgrade()
