"""
Edge Cases and Error Handling Tests
Tests invalid inputs, error conditions, and boundary cases
"""

import pytest


class TestEdgeCases:
    """Test error handling and edge cases"""
    
    def test_user_not_found(self, test_client):
        """
        Scenario: Request recommendation for non-existent user
        Expected: Returns 404 error
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": "nonexistent_user_id",
            "merchant": "Test",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    
    def test_user_with_no_cards(self, test_client, test_db):
        """
        Scenario: User has no credit cards
        Expected: Returns helpful error message
        """
        from crud import create_user
        from models import OptimizationGoalEnum
        
        # Create user without cards
        user_no_cards = create_user(
            test_db,
            email="nocards@example.com",
            full_name="No Cards User",
            default_optimization_goal=OptimizationGoalEnum.CASH_BACK
        )
        test_db.commit()
        
        response = test_client.post("/api/v1/recommend", json={
            "user_id": user_no_cards.user_id,
            "merchant": "Test",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 404
        assert "no active credit cards" in response.json()["detail"].lower()
    
    
    def test_negative_amount(self, test_client, test_user):
        """
        Scenario: Transaction with negative amount
        Expected: Returns validation error
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": -50.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 422  # Validation error
    
    
    def test_zero_amount(self, test_client, test_user):
        """
        Scenario: Transaction with $0 amount
        Expected: Returns validation error (amount must be > 0)
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 0.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        # Should fail validation
        assert response.status_code == 422
    
    
    def test_invalid_category(self, test_client, test_user):
        """
        Scenario: Invalid category name
        Expected: Returns validation error
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 100.0,
            "category": "invalid_category",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 422  # Validation error
    
    
    def test_invalid_optimization_goal(self, test_client, test_user):
        """
        Scenario: Invalid optimization goal
        Expected: Returns validation error
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "invalid_goal"
        })
        
        assert response.status_code == 422  # Validation error
    
    
    def test_missing_required_fields(self, test_client, test_user):
        """
        Scenario: Missing required fields in request
        Expected: Returns validation error
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "amount": 100.0
            # Missing merchant, category, optimization_goal
        })
        
        assert response.status_code == 422
    
    
    def test_very_large_amount(self, test_client, test_user):
        """
        Scenario: Extremely large transaction amount
        Expected: Handles large numbers correctly
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Luxury Store",
            "amount": 999999.99,
            "category": "shopping",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should calculate correctly even for large amounts
        assert data["recommended_card"]["expected_value"] > 1000
    
    
    def test_special_characters_in_merchant(self, test_client, test_user):
        """
        Scenario: Merchant name with special characters
        Expected: Handles special characters correctly
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "McDonald's & Co. (Test) #123",
            "amount": 50.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
    
    
    def test_empty_merchant_name(self, test_client, test_user):
        """
        Scenario: Empty merchant name
        Expected: Accepts empty string (no validation on merchant)
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "",
            "amount": 50.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        # Currently accepts empty merchant
        assert response.status_code == 200
    
    
    def test_concurrent_requests(self, test_client, test_user):
        """
        Scenario: Multiple simultaneous requests for same user
        Expected: Most requests succeed (some may fail due to DB contention)
        """
        import concurrent.futures
        
        def make_request():
            return test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": "Test",
                "amount": 50.0,
                "category": "dining",
                "optimization_goal": "cash_back"
            })
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in futures]
        
        # At least some should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 3  # At least 3 out of 5 should work
    
    
    def test_health_check(self, test_client):
        """
        Scenario: Health check endpoint
        Expected: Returns healthy status
        """
        response = test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data
    
    
    def test_malformed_json(self, test_client):
        """
        Scenario: Send malformed JSON
        Expected: Returns 422 validation error
        """
        response = test_client.post(
            "/api/v1/recommend",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    
    def test_decimal_precision(self, test_client, test_user):
        """
        Scenario: Amount with many decimal places
        Expected: Handles decimal precision correctly
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 99.999999,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify calculations are reasonable
        assert data["recommended_card"]["expected_value"] > 0
        assert data["recommended_card"]["expected_value"] < 100


class TestTransactionHistory:
    """Test transaction history edge cases"""
    
    def test_empty_transaction_history(self, test_client, test_db):
        """
        Scenario: User with no transactions
        Expected: Returns empty list
        """
        from crud import create_user
        from models import OptimizationGoalEnum
        
        new_user = create_user(
            test_db,
            email="newuser@example.com",
            full_name="New User",
            default_optimization_goal=OptimizationGoalEnum.BALANCED
        )
        test_db.commit()
        
        response = test_client.get(
            f"/api/v1/users/{new_user.user_id}/transactions"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_transactions"] == 0
        assert len(data["transactions"]) == 0
    
    
    def test_transaction_limit(self, test_client, test_user):
        """
        Scenario: Request limited number of transactions
        Expected: Returns only requested number
        """
        # Make several transactions
        for i in range(5):
            test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": f"Store {i}",
                "amount": 50.0,
                "category": "shopping",
                "optimization_goal": "cash_back"
            })
        
        # Request only 2 transactions
        response = test_client.get(
            f"/api/v1/users/{test_user.user_id}/transactions?limit=2"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["transactions"]) <= 2


class TestStatistics:
    """Test statistics calculation edge cases"""
    
    def test_stats_with_no_transactions(self, test_client, test_db):
        """
        Scenario: User stats with no transactions
        Expected: Returns zeros
        """
        from crud import create_user
        from models import OptimizationGoalEnum
        
        new_user = create_user(
            test_db,
            email="statsuser@example.com",
            full_name="Stats User",
            default_optimization_goal=OptimizationGoalEnum.CASH_BACK
        )
        test_db.commit()
        
        response = test_client.get(f"/api/v1/users/{new_user.user_id}/stats")
        
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_transactions"] == 0
        assert stats["total_spent"] == 0.0
        assert stats["total_rewards"] == 0.0
