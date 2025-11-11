"""
Smoke tests to verify test infrastructure is working
"""

import pytest


def test_imports():
    """Verify all required modules can be imported"""
    import main
    import agents
    import database
    import models
    import crud
    assert True


def test_test_client(test_client):
    """Verify test client can make requests"""
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_test_user_fixture(test_user):
    """Verify test user fixture creates user with cards"""
    assert test_user is not None
    assert test_user.user_id is not None
    assert test_user.email is not None
    assert len(test_user.credit_cards) == 3
    
    # Verify card names
    card_names = [card.card_name for card in test_user.credit_cards]
    assert "Chase Sapphire Reserve" in card_names
    assert "Citi Double Cash" in card_names
    assert "American Express Gold" in card_names


def test_sample_transaction_data(sample_transaction_data):
    """Verify sample transaction data fixture"""
    assert sample_transaction_data["merchant"] == "Chipotle"
    assert sample_transaction_data["amount"] == 50.0
    assert sample_transaction_data["category"] == "dining"
    assert sample_transaction_data["optimization_goal"] == "cash_back"
