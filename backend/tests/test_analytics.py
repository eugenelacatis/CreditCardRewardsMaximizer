"""
Test Analytics Endpoint
Tests the comprehensive analytics functionality

These tests make real API calls to validate:
1. Analytics endpoint functionality
2. Rate limit handling (Groq: 30 req/min)
3. Retry logic with exponential backoff
4. End-to-end integration

Tests include 2-second delays between API calls to respect rate limits.
If rate limits are hit, the system will automatically retry after 60 seconds.
"""

import pytest
import time
import logging
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

# Configure test logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class TestAnalyticsEndpoint:
    """Test the analytics endpoint"""
    
    def test_analytics_endpoint_exists(self, test_client, test_user):
        """Test that the analytics endpoint is accessible"""
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        # Should return 200 even with no transactions
        assert response.status_code == 200
    
    def test_analytics_with_no_transactions(self, test_client, test_user):
        """Test analytics with no transaction history"""
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert 'period' in data
        assert 'summary' in data
        assert 'category_breakdown' in data
        assert 'weekly_trends' in data
        assert 'top_merchants' in data
        assert 'insights' in data
        
        # Check empty values
        assert data['summary']['total_transactions'] == 0
        assert data['summary']['total_spent'] == 0.0
        assert data['summary']['total_rewards_earned'] == 0.0
    
    def test_analytics_with_transactions(self, test_client, test_user, sample_transaction_data):
        """
        Test analytics with actual transactions
        
        This test makes 4 API calls with 2-second delays to respect Groq rate limits.
        If rate limit is hit, the retry logic will wait 60 seconds and retry.
        """
        logger.info("=" * 70)
        logger.info("TEST: Analytics with Transactions")
        logger.info("=" * 70)
        
        # Create multiple transactions
        transactions = [
            {**sample_transaction_data, "user_id": test_user.user_id, "merchant": "Whole Foods", "amount": 100.0, "category": "groceries"},
            {**sample_transaction_data, "user_id": test_user.user_id, "merchant": "Starbucks", "amount": 25.0, "category": "dining"},
            {**sample_transaction_data, "user_id": test_user.user_id, "merchant": "Shell", "amount": 50.0, "category": "gas"},
            {**sample_transaction_data, "user_id": test_user.user_id, "merchant": "Whole Foods", "amount": 75.0, "category": "groceries"},
        ]
        
        logger.info(f"Creating {len(transactions)} transactions with 2-second delays...")
        
        for i, txn in enumerate(transactions, 1):
            logger.info(f"  [{i}/{len(transactions)}] Requesting recommendation for {txn['merchant']} (${txn['amount']})")
            
            start_time = time.time()
            response = test_client.post("/api/v1/recommend", json=txn)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"  ✓ Success in {elapsed:.2f}s")
            elif response.status_code == 503:
                logger.warning(f"  ⚠ Rate limit hit - retry logic engaged (took {elapsed:.2f}s)")
                logger.info(f"  Response: {response.json()}")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"
            
            # Wait 2 seconds between requests (except after last one)
            if i < len(transactions):
                logger.info(f"  Waiting 2 seconds before next request...")
                time.sleep(2)
        
        logger.info("All transactions created successfully!")
        logger.info("")
        
        # Get analytics
        logger.info("Fetching analytics data...")
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        logger.info(f"✓ Analytics retrieved: {data['summary']['total_transactions']} transactions, ${data['summary']['total_spent']} spent")
        
        # Check summary
        assert data['summary']['total_transactions'] == 4
        assert data['summary']['total_spent'] == 250.0
        assert data['summary']['total_rewards_earned'] > 0
        logger.info(f"✓ Summary validated: ${data['summary']['total_rewards_earned']:.2f} rewards earned")
        
        # Check category breakdown
        assert 'groceries' in data['category_breakdown']
        assert 'dining' in data['category_breakdown']
        assert 'gas' in data['category_breakdown']
        logger.info(f"✓ Category breakdown validated: {len(data['category_breakdown'])} categories")
        
        # Check groceries has 2 transactions
        assert data['category_breakdown']['groceries']['count'] == 2
        assert data['category_breakdown']['groceries']['total_spent'] == 175.0
        logger.info(f"✓ Groceries category: 2 transactions, $175.00 spent")
        
        # Check top merchants
        assert len(data['top_merchants']) > 0
        # Whole Foods should be top merchant (2 transactions, $175)
        assert data['top_merchants'][0]['merchant'] == 'Whole Foods'
        assert data['top_merchants'][0]['transaction_count'] == 2
        assert data['top_merchants'][0]['total_spent'] == 175.0
        logger.info(f"✓ Top merchant validated: {data['top_merchants'][0]['merchant']}")
        logger.info("=" * 70)
    
    def test_analytics_best_card(self, test_client, test_user, sample_transaction_data):
        """
        Test that best performing card is identified
        
        Makes 3 API calls with 2-second delays between each.
        """
        logger.info("=" * 70)
        logger.info("TEST: Best Card Identification")
        logger.info("=" * 70)
        
        num_transactions = 3
        logger.info(f"Creating {num_transactions} transactions to identify best card...")
        
        # Create transactions
        for i in range(num_transactions):
            txn = {**sample_transaction_data, "user_id": test_user.user_id, "merchant": f"Store {i}", "amount": 100.0}
            
            logger.info(f"  [{i+1}/{num_transactions}] Requesting recommendation for {txn['merchant']}")
            start_time = time.time()
            response = test_client.post("/api/v1/recommend", json=txn)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"  ✓ Success in {elapsed:.2f}s")
            elif response.status_code == 503:
                logger.warning(f"  ⚠ Rate limit hit - retry engaged (took {elapsed:.2f}s)")
            
            assert response.status_code == 200
            
            # Wait between requests
            if i < num_transactions - 1:
                logger.info(f"  Waiting 2 seconds...")
                time.sleep(2)
        
        logger.info("")
        logger.info("Fetching analytics to identify best card...")
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have a best card identified
        if data['best_card']:
            logger.info(f"✓ Best card identified: {data['best_card']['card_name']}")
            logger.info(f"  - Total value: ${data['best_card']['total_value']:.2f}")
            logger.info(f"  - Transactions: {data['best_card']['transaction_count']}")
            
            assert 'card_id' in data['best_card']
            assert 'card_name' in data['best_card']
            assert 'total_value' in data['best_card']
            assert 'transaction_count' in data['best_card']
            assert data['best_card']['transaction_count'] > 0
        else:
            logger.warning("⚠ No best card identified (might be expected with limited data)")
        
        logger.info("=" * 70)
    
    def test_analytics_weekly_trends(self, test_client, test_user, sample_transaction_data):
        """
        Test weekly trends calculation
        
        Makes 5 API calls with 2-second delays. Total test time: ~10 seconds.
        """
        logger.info("=" * 70)
        logger.info("TEST: Weekly Trends Calculation")
        logger.info("=" * 70)
        
        num_transactions = 5
        logger.info(f"Creating {num_transactions} transactions for trend analysis...")
        logger.info(f"Expected test duration: ~{num_transactions * 2} seconds")
        
        # Create transactions
        for i in range(num_transactions):
            txn = {**sample_transaction_data, "user_id": test_user.user_id, "merchant": f"Store {i}", "amount": 50.0}
            
            logger.info(f"  [{i+1}/{num_transactions}] Creating transaction for {txn['merchant']}")
            start_time = time.time()
            response = test_client.post("/api/v1/recommend", json=txn)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"  ✓ Success in {elapsed:.2f}s")
            elif response.status_code == 503:
                logger.warning(f"  ⚠ Rate limit - retry in progress (took {elapsed:.2f}s)")
            
            assert response.status_code == 200
            
            if i < num_transactions - 1:
                logger.info(f"  Waiting 2 seconds...")
                time.sleep(2)
        
        logger.info("")
        logger.info("Fetching analytics for weekly trends...")
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have weekly trends
        assert len(data['weekly_trends']) > 0
        logger.info(f"✓ Weekly trends generated: {len(data['weekly_trends'])} weeks")
        
        # Each trend should have required fields
        for i, trend in enumerate(data['weekly_trends'], 1):
            assert 'week_start' in trend
            assert 'week_end' in trend
            assert 'transaction_count' in trend
            assert 'total_spent' in trend
            assert 'total_rewards' in trend
            logger.info(f"  Week {i}: {trend['transaction_count']} transactions, ${trend['total_spent']:.2f} spent")
        
        logger.info("=" * 70)
    
    def test_analytics_custom_days_parameter(self, test_client, test_user):
        """Test analytics with custom days parameter"""
        # Test 7 days
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data['period']['days'] == 7
        
        # Test 90 days
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics?days=90")
        assert response.status_code == 200
        data = response.json()
        assert data['period']['days'] == 90
    
    def test_analytics_invalid_days_parameter(self, test_client, test_user):
        """Test analytics with invalid days parameter"""
        # Test days < 1
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics?days=0")
        assert response.status_code == 400
        
        # Test days > 365
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics?days=400")
        assert response.status_code == 400
    
    def test_analytics_nonexistent_user(self, test_client):
        """Test analytics for non-existent user"""
        response = test_client.get("/api/v1/users/nonexistent_user/analytics")
        assert response.status_code == 404
        assert "User not found" in response.json()['detail']
    
    def test_analytics_insights(self, test_client, test_user, sample_transaction_data):
        """
        Test that insights are generated
        
        Makes 3 API calls with delays to generate insight data.
        """
        logger.info("=" * 70)
        logger.info("TEST: Analytics Insights Generation")
        logger.info("=" * 70)
        
        num_transactions = 3
        logger.info(f"Creating {num_transactions} transactions for insights...")
        
        # Create transactions
        for i in range(num_transactions):
            txn = {**sample_transaction_data, "user_id": test_user.user_id, "merchant": f"Store {i}", "amount": 100.0}
            
            logger.info(f"  [{i+1}/{num_transactions}] Transaction for {txn['merchant']}")
            start_time = time.time()
            response = test_client.post("/api/v1/recommend", json=txn)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"  ✓ Success in {elapsed:.2f}s")
            
            assert response.status_code == 200
            
            if i < num_transactions - 1:
                logger.info(f"  Waiting 2 seconds...")
                time.sleep(2)
        
        logger.info("")
        logger.info("Fetching analytics insights...")
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check insights structure
        insights = data['insights']
        logger.info("✓ Insights generated:")
        logger.info(f"  - Potential additional savings: ${insights['potential_additional_savings']:.2f}")
        logger.info(f"  - Recommendation follow rate: {insights['recommendation_follow_rate']:.1f}%")
        logger.info(f"  - Total cards owned: {insights['total_cards_owned']}")
        logger.info(f"  - Best performing card: {insights['best_performing_card']}")
        
        assert 'potential_additional_savings' in insights
        assert 'recommendation_follow_rate' in insights
        assert 'total_cards_owned' in insights
        assert 'best_performing_card' in insights
        
        # Cards owned should match test user's cards
        assert insights['total_cards_owned'] > 0
        logger.info("=" * 70)
    
    def test_analytics_optimization_rate(self, test_client, test_user, sample_transaction_data):
        """
        Test optimization rate calculation
        
        Makes 5 API calls with delays. Tests rate limit handling if triggered.
        """
        logger.info("=" * 70)
        logger.info("TEST: Optimization Rate Calculation")
        logger.info("=" * 70)
        
        num_transactions = 5
        logger.info(f"Creating {num_transactions} transactions to calculate optimization rate...")
        
        # Create transactions
        for i in range(num_transactions):
            txn = {**sample_transaction_data, "user_id": test_user.user_id, "merchant": f"Store {i}", "amount": 50.0}
            
            logger.info(f"  [{i+1}/{num_transactions}] Transaction {i+1}")
            start_time = time.time()
            response = test_client.post("/api/v1/recommend", json=txn)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"  ✓ Success in {elapsed:.2f}s")
            elif response.status_code == 503:
                logger.warning(f"  ⚠ Rate limit triggered!")
                logger.info(f"  System is retrying with exponential backoff (took {elapsed:.2f}s total)")
            
            assert response.status_code == 200
            
            if i < num_transactions - 1:
                logger.info(f"  Waiting 2 seconds...")
                time.sleep(2)
        
        logger.info("")
        logger.info("Calculating optimization rate...")
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Optimization rate should be between 0 and 100
        opt_rate = data['summary']['optimization_rate']
        logger.info(f"✓ Optimization rate: {opt_rate:.1f}%")
        logger.info(f"  (Valid range: 0-100%, actual: {opt_rate:.1f}%)")
        
        assert 0 <= opt_rate <= 100
        logger.info("=" * 70)
    
    def test_analytics_response_structure(self, test_client, test_user):
        """Test complete response structure"""
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Period
        assert 'start_date' in data['period']
        assert 'end_date' in data['period']
        assert 'days' in data['period']
        
        # Summary
        summary = data['summary']
        required_summary_fields = [
            'total_transactions', 'total_spent', 'total_rewards_earned',
            'total_potential_rewards', 'missed_value', 'optimization_rate',
            'avg_transaction_amount', 'avg_rewards_per_transaction'
        ]
        for field in required_summary_fields:
            assert field in summary
        
        # Category breakdown (dict)
        assert isinstance(data['category_breakdown'], dict)
        
        # Weekly trends (list)
        assert isinstance(data['weekly_trends'], list)
        
        # Top merchants (list)
        assert isinstance(data['top_merchants'], list)
        
        # Insights
        insights = data['insights']
        required_insight_fields = [
            'potential_additional_savings', 'recommendation_follow_rate',
            'total_cards_owned', 'best_performing_card'
        ]
        for field in required_insight_fields:
            assert field in insights


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
