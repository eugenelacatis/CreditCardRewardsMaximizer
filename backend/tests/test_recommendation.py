"""
Integration Tests for AI Recommendation Engine
Tests all optimization goals and categories with weighted calculations
"""

import pytest


class TestRecommendationEngine:
    """Test core recommendation functionality"""
    
    def test_cash_back_goal_dining(self, test_client, test_user):
        """
        Scenario: $100 dining purchase with cash_back goal
        Expected: Amex Gold (4% = $4.00) beats Citi (2% = $2.00) and Chase (3% = $3.00)
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Chipotle",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify recommended card
        assert data["recommended_card"]["card_name"] == "American Express Gold"
        assert data["recommended_card"]["cash_back_earned"] == 4.0
        assert data["recommended_card"]["expected_value"] >= 4.0  # At least cash back value
        
        # Verify alternatives exist
        assert len(data["alternative_cards"]) >= 1
        
        # Verify optimization summary
        assert "American Express Gold" in data["optimization_summary"]
    
    
    def test_travel_points_goal_travel(self, test_client, test_user):
        """
        Scenario: $500 travel purchase with travel_points goal
        Expected: Chase Sapphire (3x points) should win due to points weighting
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Delta Airlines",
            "amount": 500.0,
            "category": "travel",
            "optimization_goal": "travel_points"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Chase Sapphire has 3x travel points
        assert data["recommended_card"]["card_name"] == "Chase Sapphire Reserve"
        assert data["recommended_card"]["points_earned"] == 1500.0  # 500 * 3x
        
        # Verify points are valued higher than cash back for this goal
        assert data["recommended_card"]["expected_value"] > 15.0  # Points weighted higher
    
    
    def test_balanced_goal_groceries(self, test_client, test_user):
        """
        Scenario: $200 groceries with balanced goal
        Expected: Amex Gold (4% groceries) should win
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Whole Foods",
            "amount": 200.0,
            "category": "groceries",
            "optimization_goal": "balanced"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Amex Gold has 4% groceries
        assert data["recommended_card"]["card_name"] == "American Express Gold"
        assert data["recommended_card"]["cash_back_earned"] == 8.0  # 200 * 0.04
    
    
    def test_cash_back_goal_other_category(self, test_client, test_user):
        """
        Scenario: $150 shopping (other category) with cash_back goal
        Expected: Best cash back card for "other" category
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Amazon",
            "amount": 150.0,
            "category": "other",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify a card is recommended
        assert data["recommended_card"]["card_name"] is not None
        # Cash back should be positive
        assert data["recommended_card"]["cash_back_earned"] > 0
        # Expected value should be reasonable (at least 1% of amount)
        assert data["recommended_card"]["expected_value"] >= 1.5
    
    
    def test_specific_discounts_goal(self, test_client, test_user):
        """
        Scenario: $100 dining with specific_discounts goal
        Expected: Benefits should be weighted heavily (2.5x)
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Starbucks",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "specific_discounts"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should recommend card with most benefits
        # Amex Gold has 3 benefits, Chase has 3 benefits
        assert data["recommended_card"]["card_name"] in ["American Express Gold", "Chase Sapphire Reserve"]
        assert len(data["recommended_card"]["applicable_benefits"]) >= 2
    
    
    def test_all_optimization_goals(self, test_client, test_user):
        """
        Test that all optimization goals work without errors
        """
        goals = ["cash_back", "travel_points", "balanced", "specific_discounts"]
        
        for goal in goals:
            response = test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": "Test Merchant",
                "amount": 50.0,
                "category": "dining",
                "optimization_goal": goal
            })
            
            assert response.status_code == 200, f"Failed for goal: {goal}"
            data = response.json()
            assert "recommended_card" in data
            assert data["recommended_card"]["card_name"] is not None
    
    
    def test_all_categories(self, test_client, test_user):
        """
        Test that all categories work without errors
        """
        categories = ["dining", "travel", "groceries", "gas", "entertainment", "shopping", "other"]
        
        for category in categories:
            response = test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": "Test Merchant",
                "amount": 50.0,
                "category": category,
                "optimization_goal": "cash_back"
            })
            
            assert response.status_code == 200, f"Failed for category: {category}"
            data = response.json()
            assert "recommended_card" in data
    
    
    def test_large_transaction(self, test_client, test_user):
        """
        Scenario: Large $5000 transaction
        Expected: Should handle large amounts correctly
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Best Buy",
            "amount": 5000.0,
            "category": "shopping",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify calculations scale correctly
        assert data["recommended_card"]["expected_value"] > 50.0  # At least 1% of 5000
    
    
    def test_small_transaction(self, test_client, test_user):
        """
        Scenario: Small $5 transaction
        Expected: Should still provide recommendation
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Coffee Shop",
            "amount": 5.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["recommended_card"]["card_name"] is not None
        assert data["recommended_card"]["expected_value"] > 0
    
    
    def test_response_structure(self, test_client, test_user):
        """
        Verify the response has all required fields
        """
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "recommended_card" in data
        assert "alternative_cards" in data
        assert "optimization_summary" in data
        assert "total_savings" in data
        
        # Check recommended_card structure
        rec = data["recommended_card"]
        assert "card_id" in rec
        assert "card_name" in rec
        assert "expected_value" in rec
        assert "cash_back_earned" in rec
        assert "points_earned" in rec
        assert "applicable_benefits" in rec
        assert "explanation" in rec
        assert "confidence_score" in rec
        
        # Verify types
        assert isinstance(rec["expected_value"], (int, float))
        assert isinstance(rec["cash_back_earned"], (int, float))
        assert isinstance(rec["points_earned"], (int, float))
        assert isinstance(rec["applicable_benefits"], list)
        assert isinstance(rec["confidence_score"], (int, float))
