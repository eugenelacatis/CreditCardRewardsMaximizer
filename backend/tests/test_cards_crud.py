"""
Integration Tests for Card CRUD Operations
Tests card management endpoints (Create, Read, Update, Delete)
"""

import pytest


class TestCardCRUD:
    """Test credit card CRUD operations"""
    
    def test_get_user_cards(self, test_client, test_user):
        """
        Scenario: Get all cards for a user
        Expected: Returns 3 test cards
        """
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3
        card_names = [card["card_name"] for card in data]
        assert "Chase Sapphire Reserve" in card_names
        assert "Citi Double Cash" in card_names
        assert "American Express Gold" in card_names
    
    
    def test_add_new_card(self, test_client, test_user):
        """
        Scenario: Add a new credit card
        Expected: Card is created and returned
        """
        new_card = {
            "card_name": "Discover It",
            "issuer": "Discover",
            "cash_back_rate": {
                "gas": 0.05,
                "groceries": 0.05,
                "other": 0.01
            },
            "points_multiplier": {
                "gas": 0.0,
                "groceries": 0.0,
                "other": 0.0
            },
            "annual_fee": 0.0,
            "benefits": ["5% Rotating Categories", "Cashback Match"],
            "last_four_digits": "9876",
            "credit_limit": 10000.0
        }
        
        response = test_client.post(
            f"/api/v1/cards?user_id={test_user.user_id}",
            json=new_card
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["card_name"] == "Discover It"
        assert data["issuer"] == "Discover"
        assert data["annual_fee"] == 0.0
        assert data["is_active"] is True
        
        # Verify card was added to database
        cards_response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        assert cards_response.status_code == 200
        cards = cards_response.json()
        assert len(cards) == 4  # Original 3 + new one
    
    
    def test_update_card(self, test_client, test_user):
        """
        Scenario: Update an existing card's details
        Expected: Card is updated successfully
        """
        # Get a card to update
        cards_response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        cards = cards_response.json()
        card_to_update = cards[0]
        
        # Update the card
        update_data = {
            "annual_fee": 95.0,
            "benefits": ["Updated Benefit 1", "Updated Benefit 2"]
        }
        
        response = test_client.put(
            f"/api/v1/cards/{card_to_update['card_id']}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["annual_fee"] == 95.0
        assert "Updated Benefit 1" in data["benefits"]
        assert "Updated Benefit 2" in data["benefits"]
    
    
    def test_delete_card(self, test_client, test_user):
        """
        Scenario: Delete (deactivate) a credit card
        Expected: Card is deactivated
        """
        # Get a card to delete
        cards_response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        cards = cards_response.json()
        card_to_delete = cards[0]
        
        # Delete the card
        response = test_client.delete(f"/api/v1/cards/{card_to_delete['card_id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert card_to_delete['card_id'] in data["message"]
        
        # Verify card is no longer in active cards list
        cards_response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        active_cards = cards_response.json()
        assert len(active_cards) == 2  # One card deactivated
    
    
    def test_get_categories(self, test_client):
        """
        Scenario: Get list of available categories
        Expected: Returns all category options
        """
        response = test_client.get("/api/v1/categories")
        
        assert response.status_code == 200
        categories = response.json()
        
        assert "dining" in categories
        assert "travel" in categories
        assert "groceries" in categories
        assert "gas" in categories
        assert "other" in categories
    
    
    def test_get_optimization_goals(self, test_client):
        """
        Scenario: Get list of optimization goals
        Expected: Returns all goal options
        """
        response = test_client.get("/api/v1/optimization-goals")
        
        assert response.status_code == 200
        goals = response.json()
        
        assert "cash_back" in goals
        assert "travel_points" in goals
        assert "balanced" in goals
        assert "specific_discounts" in goals
    
    
    def test_add_card_validation(self, test_client, test_user):
        """
        Scenario: Try to add card with missing required fields
        Expected: Returns validation error
        """
        invalid_card = {
            "card_name": "Invalid Card"
            # Missing required fields
        }
        
        response = test_client.post(
            f"/api/v1/cards?user_id={test_user.user_id}",
            json=invalid_card
        )
        
        assert response.status_code == 422  # Validation error
    
    
    def test_update_nonexistent_card(self, test_client):
        """
        Scenario: Try to update a card that doesn't exist
        Expected: Returns 404 error
        """
        response = test_client.put(
            "/api/v1/cards/nonexistent_card_id",
            json={"annual_fee": 100.0}
        )
        
        assert response.status_code == 404
    
    
    def test_delete_nonexistent_card(self, test_client):
        """
        Scenario: Try to delete a card that doesn't exist
        Expected: Returns 404 error
        """
        response = test_client.delete("/api/v1/cards/nonexistent_card_id")
        
        assert response.status_code == 404
