"""
Structured logging configuration for the Credit Card Rewards Maximizer.

This module provides:
- JSON-formatted logs for easy parsing and aggregation
- Correlation ID support for request tracing
- Configurable log levels via environment variables
- AWS CloudWatch compatible format
"""

import logging
import sys
import os
from datetime import datetime
from typing import Any
from contextvars import ContextVar
from pythonjsonlogger import jsonlogger

# Context variable for correlation ID (thread-safe)
correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='-')

# Log level from environment
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter that adds:
    - Correlation ID for request tracing
    - Timestamp in ISO format
    - Service name for multi-service environments
    - AWS CloudWatch compatible fields
    """

    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict) -> None:
        super().add_fields(log_record, record, message_dict)

        # Standard fields
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['service'] = 'credit-card-rewards-backend'

        # Correlation ID for request tracing
        log_record['correlation_id'] = correlation_id_var.get()

        # Source location
        log_record['source'] = {
            'file': record.filename,
            'line': record.lineno,
            'function': record.funcName
        }

        # Exception info if present
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)

        # Remove redundant fields
        for field in ['message', 'asctime', 'created', 'msecs', 'relativeCreated',
                      'levelno', 'pathname', 'module', 'funcName', 'lineno', 'filename']:
            log_record.pop(field, None)


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger with JSON formatting.

    Args:
        name: Logger name (typically __name__ of the calling module)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    # Console handler with JSON formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    # JSON formatter for structured logging
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    logger.propagate = False

    return logger


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID for the current context."""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> str:
    """Get the correlation ID for the current context."""
    return correlation_id_var.get()


class LogContext:
    """
    Context manager for adding extra fields to log records.

    Usage:
        with LogContext(user_id=123, action='purchase'):
            logger.info("Processing transaction")
    """

    def __init__(self, **kwargs: Any):
        self.extra = kwargs
        self.old_factory = None

    def __enter__(self):
        self.old_factory = logging.getLogRecordFactory()
        extra = self.extra

        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in extra.items():
                setattr(record, key, value)
            return record

        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self.old_factory)
        return False


# Pre-configured loggers for common components
def get_api_logger() -> logging.Logger:
    """Get logger for API endpoints."""
    return get_logger('api')


def get_db_logger() -> logging.Logger:
    """Get logger for database operations."""
    return get_logger('database')


def get_ai_logger() -> logging.Logger:
    """Get logger for AI/ML operations."""
    return get_logger('ai')


def get_auth_logger() -> logging.Logger:
    """Get logger for authentication operations."""
    return get_logger('auth')
