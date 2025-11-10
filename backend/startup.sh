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
    echo "✅ Database already initialized. Skipping init."
fi

# Start the FastAPI application
echo "🎯 Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
