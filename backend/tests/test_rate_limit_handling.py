"""
Test Rate Limit Handling Logic
Tests the intelligent retry mechanism for Groq API rate limits
"""

import pytest
from unittest.mock import Mock, patch
from agents import RateLimitHandler, AgenticRecommendationSystem
from groq import RateLimitError


class TestRateLimitHandler:
    """Test the RateLimitHandler class"""
    
    def test_parse_daily_token_limit(self):
        """Test parsing of daily token limit error (non-recoverable)"""
        error_msg = (
            "Rate limit reached for model `llama-3.3-70b-versatile` "
            "on tokens per day (TPD): Limit 100000, Used 99912, Requested 480. "
            "Please try again in 5m38.688s."
        )
        
        result = RateLimitHandler.parse_rate_limit_error(error_msg)
        
        assert result['type'] == 'daily_token_limit'
        assert result['is_recoverable'] is False
        assert result['wait_seconds'] is None
        assert 'Daily token limit' in result['message']
    
    def test_parse_requests_per_minute_limit(self):
        """Test parsing of requests per minute error (recoverable)"""
        error_msg = (
            "Rate limit reached for requests per minute (RPM): "
            "Limit 30, Used 30. Please try again in 1m15s."
        )
        
        result = RateLimitHandler.parse_rate_limit_error(error_msg)
        
        assert result['type'] == 'requests_per_minute'
        assert result['is_recoverable'] is True
        assert result['wait_seconds'] == 75  # 1m15s = 75 seconds
        assert 'too many requests' in result['message']
    
    def test_parse_unknown_rate_limit(self):
        """Test parsing of unknown rate limit error"""
        error_msg = "Some unknown rate limit error"
        
        result = RateLimitHandler.parse_rate_limit_error(error_msg)
        
        assert result['type'] == 'unknown'
        assert result['is_recoverable'] is True
        assert result['wait_seconds'] == 30
    
    def test_should_retry_recoverable(self):
        """Test retry decision for recoverable errors"""
        error_info = {
            'is_recoverable': True,
            'wait_seconds': 60
        }
        
        # Should retry on first attempt
        assert RateLimitHandler.should_retry(error_info, attempt=0, max_retries=3) is True
        
        # Should retry on second attempt
        assert RateLimitHandler.should_retry(error_info, attempt=1, max_retries=3) is True
        
        # Should NOT retry after max attempts
        assert RateLimitHandler.should_retry(error_info, attempt=3, max_retries=3) is False
    
    def test_should_retry_non_recoverable(self):
        """Test retry decision for non-recoverable errors"""
        error_info = {
            'is_recoverable': False,
            'wait_seconds': None
        }
        
        # Should NEVER retry non-recoverable errors
        assert RateLimitHandler.should_retry(error_info, attempt=0, max_retries=3) is False
        assert RateLimitHandler.should_retry(error_info, attempt=1, max_retries=3) is False


class TestRetryLogic:
    """Test the retry logic in AgenticRecommendationSystem"""
    
    @patch('time.sleep')
    def test_successful_first_attempt(self, mock_sleep):
        """Test successful API call on first attempt (no retry needed)"""
        # Setup
        system = AgenticRecommendationSystem()
        mock_chain = Mock()
        mock_chain.invoke.return_value = {'text': 'Success'}
        system.recommendation_chain = mock_chain
        
        # Execute
        result = system._invoke_llm_with_retry({'test': 'data'})
        
        # Verify
        assert result == {'text': 'Success'}
        assert mock_chain.invoke.call_count == 1
    
    @patch('time.sleep')  # Mock sleep to speed up test
    def test_retry_on_recoverable_error(self, mock_sleep):
        """Test retry logic for recoverable rate limit (requests/minute)"""
        # Setup
        system = AgenticRecommendationSystem()
        mock_chain = Mock()
        
        # Create a custom exception that inherits from RateLimitError
        class MockRPMError(RateLimitError):
            def __init__(self, message):
                self.message = message
            def __str__(self):
                return self.message
        
        # First call fails with recoverable error, second succeeds
        rpm_error = MockRPMError("Rate limit reached for requests per minute (RPM): Limit 30")
        mock_chain.invoke.side_effect = [rpm_error, {'text': 'Success after retry'}]
        system.recommendation_chain = mock_chain
        
        # Execute
        result = system._invoke_llm_with_retry({'test': 'data'})
        
        # Verify
        assert result == {'text': 'Success after retry'}
        assert mock_chain.invoke.call_count == 2
        assert mock_sleep.called  # Should have waited before retry
    
    @patch('time.sleep')
    def test_no_retry_on_daily_limit(self, mock_sleep):
        """Test that daily token limit errors are NOT retried"""
        # Setup
        system = AgenticRecommendationSystem()
        mock_chain = Mock()
        
        # Create a custom exception for daily token limit
        class MockDailyLimitError(RateLimitError):
            def __init__(self, message):
                self.message = message
            def __str__(self):
                return self.message
        
        daily_limit_error = MockDailyLimitError("Rate limit reached on tokens per day (TPD): Limit 100000, Used 99912")
        mock_chain.invoke.side_effect = daily_limit_error
        system.recommendation_chain = mock_chain
        
        # Execute & Verify
        with pytest.raises(RuntimeError) as exc_info:
            system._invoke_llm_with_retry({'test': 'data'})
        
        assert 'Daily token limit' in str(exc_info.value)
        assert mock_chain.invoke.call_count == 1  # Should NOT retry
    
    @patch('time.sleep')
    def test_max_retries_exceeded(self, mock_sleep):
        """Test that we stop after max retries"""
        # Setup
        system = AgenticRecommendationSystem()
        mock_chain = Mock()
        
        # Create a custom exception
        class MockRPMError(RateLimitError):
            def __init__(self, message):
                self.message = message
            def __str__(self):
                return self.message
        
        # Always fail with recoverable error
        rpm_error = MockRPMError("Rate limit reached for requests per minute (RPM): Limit 30")
        mock_chain.invoke.side_effect = rpm_error
        system.recommendation_chain = mock_chain
        
        # Execute & Verify
        with pytest.raises(RuntimeError) as exc_info:
            system._invoke_llm_with_retry({'test': 'data'}, max_retries=2)
        
        assert 'after 2 retry attempts' in str(exc_info.value)
        assert mock_chain.invoke.call_count == 3  # Initial + 2 retries
    
    @patch('time.sleep')
    def test_non_rate_limit_error_propagates(self, mock_sleep):
        """Test that non-rate-limit errors are propagated immediately"""
        # Setup
        system = AgenticRecommendationSystem()
        mock_chain = Mock()
        
        # Simulate a different error (not rate limit)
        mock_chain.invoke.side_effect = ValueError("Some other error")
        system.recommendation_chain = mock_chain
        
        # Execute & Verify
        with pytest.raises(RuntimeError) as exc_info:
            system._invoke_llm_with_retry({'test': 'data'})
        
        assert 'AI service error' in str(exc_info.value)
        assert mock_chain.invoke.call_count == 1  # Should NOT retry


class TestExponentialBackoff:
    """Test exponential backoff timing"""
    
    @patch('time.sleep')
    def test_backoff_increases_with_attempts(self, mock_sleep):
        """Test that wait time increases exponentially"""
        error_info = {
            'wait_seconds': 60,
            'is_recoverable': True
        }
        
        # First attempt: 60 * (1.5^0) = 60 seconds
        RateLimitHandler.wait_with_backoff(error_info, attempt=0)
        assert mock_sleep.call_args[0][0] == 60.0
        
        # Second attempt: 60 * (1.5^1) = 90 seconds
        RateLimitHandler.wait_with_backoff(error_info, attempt=1)
        assert mock_sleep.call_args[0][0] == 90.0
        
        # Third attempt: 60 * (1.5^2) = 135 seconds
        RateLimitHandler.wait_with_backoff(error_info, attempt=2)
        assert mock_sleep.call_args[0][0] == 135.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
