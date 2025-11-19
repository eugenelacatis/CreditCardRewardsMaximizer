"""
FastAPI middleware for observability.

This module provides:
- Request/response logging with timing
- Correlation ID injection and propagation
- Error tracking and categorization
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from logging_config import get_api_logger, set_correlation_id, get_correlation_id
from metrics import (
    HTTP_REQUEST_DURATION,
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_SIZE,
    HTTP_RESPONSE_SIZE,
    ACTIVE_REQUESTS
)

logger = get_api_logger()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds observability features to all requests:
    - Correlation ID generation/propagation
    - Request/response logging
    - Timing metrics
    - Error tracking
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract correlation ID
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
        set_correlation_id(correlation_id)

        # Track active requests
        ACTIVE_REQUESTS.inc()

        # Record start time
        start_time = time.time()

        # Extract request details
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else 'unknown'
        user_agent = request.headers.get('User-Agent', 'unknown')

        # Get request size
        request_size = int(request.headers.get('Content-Length', 0))
        HTTP_REQUEST_SIZE.labels(method=method, path=path).observe(request_size)

        # Log request
        logger.info(
            "Request started",
            extra={
                'event': 'request_start',
                'method': method,
                'path': path,
                'client_ip': client_ip,
                'user_agent': user_agent,
                'request_size': request_size
            }
        )

        # Process request
        status_code = 500
        response_size = 0
        error_message = None

        try:
            response = await call_next(request)
            status_code = response.status_code

            # Get response size
            response_size = int(response.headers.get('Content-Length', 0))

            # Add correlation ID to response headers
            response.headers['X-Correlation-ID'] = correlation_id

            return response

        except Exception as e:
            error_message = str(e)
            logger.error(
                "Request failed with exception",
                extra={
                    'event': 'request_error',
                    'method': method,
                    'path': path,
                    'error': error_message,
                    'error_type': type(e).__name__
                },
                exc_info=True
            )
            raise

        finally:
            # Calculate duration
            duration = time.time() - start_time

            # Record metrics
            ACTIVE_REQUESTS.dec()
            HTTP_REQUEST_DURATION.labels(
                method=method,
                path=self._normalize_path(path),
                status_code=status_code
            ).observe(duration)
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                path=self._normalize_path(path),
                status_code=status_code
            ).inc()
            HTTP_RESPONSE_SIZE.labels(
                method=method,
                path=self._normalize_path(path)
            ).observe(response_size)

            # Determine log level based on status code
            log_extra = {
                'event': 'request_complete',
                'method': method,
                'path': path,
                'status_code': status_code,
                'duration_ms': round(duration * 1000, 2),
                'response_size': response_size
            }

            if error_message:
                log_extra['error'] = error_message

            if status_code >= 500:
                logger.error("Request completed with server error", extra=log_extra)
            elif status_code >= 400:
                logger.warning("Request completed with client error", extra=log_extra)
            else:
                logger.info("Request completed successfully", extra=log_extra)

    def _normalize_path(self, path: str) -> str:
        """
        Normalize path for metrics to avoid high cardinality.
        Replace dynamic path parameters with placeholders.
        """
        parts = path.split('/')
        normalized = []

        for part in parts:
            # Replace numeric IDs with placeholder
            if part.isdigit():
                normalized.append('{id}')
            # Replace UUIDs with placeholder
            elif len(part) == 36 and part.count('-') == 4:
                normalized.append('{uuid}')
            else:
                normalized.append(part)

        return '/'.join(normalized)


class ErrorTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware specifically for tracking and categorizing errors.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # Log with full context
            logger.error(
                "Unhandled exception",
                extra={
                    'event': 'unhandled_exception',
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'path': request.url.path,
                    'method': request.method
                },
                exc_info=True
            )
            raise
