"""
Database Configuration and Connection Management
Handles PostgreSQL connection pooling and session management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import os
import time
from typing import Generator

from models import Base
from logging_config import get_db_logger
from metrics import (
    DB_CONNECTION_POOL_SIZE,
    DB_CONNECTION_POOL_CHECKED_OUT,
    DB_CONNECTION_POOL_OVERFLOW,
    track_db_query
)

logger = get_db_logger()


class DatabaseConfig:
    """Database configuration settings"""
    
    def __init__(self):
        # Get database URL from environment variable
        self.DATABASE_URL = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:password@localhost:5432/agentic_wallet"
        )
        
        # Connection pool settings
        self.POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
        self.MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))
        
        # Echo SQL queries (for debugging)
        self.ECHO_SQL = os.getenv("DB_ECHO_SQL", "False").lower() == "true"


class Database:
    """Database manager - handles connections and sessions"""
    
    def __init__(self):
        self.config = DatabaseConfig()
        self.engine = None
        self.SessionLocal = None
        self._initialize_engine()
    
    def _initialize_engine(self):
        """Initialize database engine with connection pooling"""
        self.engine = create_engine(
            self.config.DATABASE_URL,
            poolclass=QueuePool,
            pool_size=self.config.POOL_SIZE,
            max_overflow=self.config.MAX_OVERFLOW,
            pool_timeout=self.config.POOL_TIMEOUT,
            pool_recycle=self.config.POOL_RECYCLE,
            echo=self.config.ECHO_SQL,
            future=True
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

        # Set up connection pool metrics
        self._setup_pool_metrics()

        # Set up query timing
        self._setup_query_timing()

    def _setup_pool_metrics(self):
        """Set up event listeners for connection pool metrics"""
        @event.listens_for(self.engine, "checkout")
        def on_checkout(dbapi_conn, connection_record, connection_proxy):
            pool = self.engine.pool
            DB_CONNECTION_POOL_SIZE.set(pool.size())
            DB_CONNECTION_POOL_CHECKED_OUT.set(pool.checkedout())
            DB_CONNECTION_POOL_OVERFLOW.set(pool.overflow())

        @event.listens_for(self.engine, "checkin")
        def on_checkin(dbapi_conn, connection_record):
            pool = self.engine.pool
            DB_CONNECTION_POOL_SIZE.set(pool.size())
            DB_CONNECTION_POOL_CHECKED_OUT.set(pool.checkedout())
            DB_CONNECTION_POOL_OVERFLOW.set(pool.overflow())

    def _setup_query_timing(self):
        """Set up event listeners for query timing"""
        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(time.time())

        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total = time.time() - conn.info['query_start_time'].pop()
            # Extract operation type and table from statement
            statement_lower = statement.lower().strip()
            if statement_lower.startswith('select'):
                operation = 'select'
            elif statement_lower.startswith('insert'):
                operation = 'insert'
            elif statement_lower.startswith('update'):
                operation = 'update'
            elif statement_lower.startswith('delete'):
                operation = 'delete'
            else:
                operation = 'other'

            # Simple table extraction (basic approach)
            table = 'unknown'
            if 'from ' in statement_lower:
                parts = statement_lower.split('from ')
                if len(parts) > 1:
                    table = parts[1].split()[0].strip('"')
            elif 'into ' in statement_lower:
                parts = statement_lower.split('into ')
                if len(parts) > 1:
                    table = parts[1].split()[0].strip('"')
            elif 'update ' in statement_lower:
                parts = statement_lower.split('update ')
                if len(parts) > 1:
                    table = parts[1].split()[0].strip('"')

            track_db_query(operation, table, total)
    
    def create_tables(self):
        """Create all tables in the database"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("All database tables created successfully", extra={'event': 'tables_created'})

    def drop_tables(self):
        """Drop all tables (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)
        logger.warning("All database tables dropped", extra={'event': 'tables_dropped'})
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """
        Provide a transactional scope for database operations
        Usage:
            with db.session_scope() as session:
                session.add(user)
                session.commit()
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def health_check(self) -> bool:
        """Check if database connection is healthy"""
        try:
            from sqlalchemy import text
            with self.session_scope() as session:
                session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error("Database health check failed", extra={
                'event': 'health_check_failed',
                'error': str(e)
            })
            return False

    def close(self):
        """Close all database connections"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connections closed", extra={'event': 'connections_closed'})


# Global database instance
db = Database()


# Dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency to get database session
    Usage in FastAPI:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    session = db.get_session()
    try:
        yield session
    finally:
        session.close()


# Initialize database tables (call this on startup)
def init_db():
    """Initialize database - create all tables"""
    logger.info("Initializing database", extra={'event': 'db_init_start'})
    db.create_tables()
    logger.info("Database initialization complete", extra={'event': 'db_init_complete'})


# Reset database (use with caution!)
def reset_db():
    """Drop and recreate all tables - USE WITH CAUTION!"""
    logger.warning("Resetting database - all data will be lost", extra={'event': 'db_reset_start'})
    db.drop_tables()
    db.create_tables()
    logger.info("Database reset complete", extra={'event': 'db_reset_complete'})
