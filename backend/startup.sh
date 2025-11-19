#!/bin/bash
# Smart startup script for Docker
# Initializes database only if needed, then starts the API

echo "🚀 Starting backend..."

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL..."
while ! pg_isready -h postgres -p 5432 -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL is ready!"

# Check if database is already initialized by checking if users table exists
echo "🔍 Checking if database is initialized..."
TABLES_EXIST=$(python3 -c "
from database import db
from sqlalchemy import inspect
try:
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print('yes' if 'users' in tables else 'no')
except:
    print('no')
")

if [ "$TABLES_EXIST" = "no" ]; then
    echo "📋 Database not initialized. Running init_db.py..."
    python3 init_db.py
else
    echo "✅ Database already initialized."
    echo "🌱 Ensuring seed data is loaded (will skip existing records)..."
    # Run seeding scripts to ensure card_library.json and merchants.json are loaded
    # These scripts are idempotent and will skip existing records
    python3 -c "
from scripts.seed_merchants import seed_merchants
from database import db
from crud import create_credit_cards_from_library
from models import User

# Ensure merchants are loaded
print('🏪 Checking merchants...')
try:
    seed_merchants()
except Exception as e:
    print(f'⚠️  Warning: {e}')

# Ensure card library is loaded for test user
print('💳 Checking card library...')
try:
    with db.session_scope() as session:
        test_user = session.query(User).filter(User.email == 'test@example.com').first()
        if test_user:
            create_credit_cards_from_library(session, test_user.user_id)
            session.commit()
        else:
            print('⚠️  Test user not found. Cards will be loaded on next init.')
except Exception as e:
    print(f'⚠️  Warning: {e}')
"
fi

# Start the FastAPI application
echo "🎯 Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
