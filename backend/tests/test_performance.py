"""
Performance Tests
Measure response times and ensure < 2 second target
"""

import pytest
import time


class TestPerformance:
    """Test API performance metrics"""
    
    def test_recommendation_response_time(self, test_client, test_user):
        """
        Scenario: Measure recommendation endpoint response time
        Target: < 2 seconds end-to-end
        """
        start_time = time.time()
        
        response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Whole Foods",
            "amount": 150.0,
            "category": "groceries",
            "optimization_goal": "cash_back"
        })
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0, f"Response took {response_time:.2f}s (target: < 2s)"
        
        print(f"\n✓ Recommendation response time: {response_time:.3f}s")
    
    
    def test_get_cards_response_time(self, test_client, test_user):
        """
        Scenario: Measure get cards endpoint response time
        Target: < 0.5 seconds
        """
        start_time = time.time()
        
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 0.5, f"Response took {response_time:.2f}s (target: < 0.5s)"
        
        print(f"\n✓ Get cards response time: {response_time:.3f}s")
    
    
    def test_transaction_history_response_time(self, test_client, test_user):
        """
        Scenario: Measure transaction history endpoint response time
        Target: < 1 second
        """
        # Create some transactions first
        for i in range(5):
            test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": f"Store {i}",
                "amount": 50.0,
                "category": "shopping",
                "optimization_goal": "cash_back"
            })
        
        start_time = time.time()
        
        response = test_client.get(
            f"/api/v1/users/{test_user.user_id}/transactions?limit=50"
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0, f"Response took {response_time:.2f}s (target: < 1s)"
        
        print(f"\n✓ Transaction history response time: {response_time:.3f}s")
    
    
    def test_stats_calculation_response_time(self, test_client, test_user):
        """
        Scenario: Measure stats calculation response time
        Target: < 1 second
        """
        start_time = time.time()
        
        response = test_client.get(f"/api/v1/users/{test_user.user_id}/stats")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0, f"Response took {response_time:.2f}s (target: < 1s)"
        
        print(f"\n✓ Stats calculation response time: {response_time:.3f}s")
    
    
    def test_multiple_sequential_requests(self, test_client, test_user):
        """
        Scenario: Measure performance of 10 sequential recommendations
        Target: Average < 2 seconds per request
        """
        response_times = []
        
        for i in range(10):
            start_time = time.time()
            
            response = test_client.post("/api/v1/recommend", json={
                "user_id": test_user.user_id,
                "merchant": f"Merchant {i}",
                "amount": 50.0 + (i * 10),
                "category": "dining",
                "optimization_goal": "cash_back"
            })
            
            end_time = time.time()
            response_time = end_time - start_time
            response_times.append(response_time)
            
            assert response.status_code == 200
        
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        min_response_time = min(response_times)
        
        assert avg_response_time < 2.0, f"Average response time {avg_response_time:.2f}s (target: < 2s)"
        
        print(f"\n✓ Sequential requests performance:")
        print(f"  Average: {avg_response_time:.3f}s")
        print(f"  Min: {min_response_time:.3f}s")
        print(f"  Max: {max_response_time:.3f}s")
    
    
    def test_health_check_response_time(self, test_client):
        """
        Scenario: Measure health check response time
        Target: < 0.2 seconds
        """
        start_time = time.time()
        
        response = test_client.get("/health")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 0.2, f"Response took {response_time:.2f}s (target: < 0.2s)"
        
        print(f"\n✓ Health check response time: {response_time:.3f}s")


class TestPerformanceMetrics:
    """Detailed performance metrics and bottleneck identification"""
    
    def test_identify_slow_operations(self, test_client, test_user):
        """
        Scenario: Identify which part of recommendation is slowest
        """
        import time
        
        # Measure database query time (get cards)
        db_start = time.time()
        cards_response = test_client.get(f"/api/v1/users/{test_user.user_id}/cards")
        db_time = time.time() - db_start
        
        # Measure full recommendation time
        rec_start = time.time()
        rec_response = test_client.post("/api/v1/recommend", json={
            "user_id": test_user.user_id,
            "merchant": "Test",
            "amount": 100.0,
            "category": "dining",
            "optimization_goal": "cash_back"
        })
        rec_time = time.time() - rec_start
        
        # Estimate AI processing time (rec_time - db_time)
        ai_time = rec_time - db_time
        
        print(f"\n✓ Performance breakdown:")
        print(f"  Database query: {db_time:.3f}s ({db_time/rec_time*100:.1f}%)")
        print(f"  AI processing: {ai_time:.3f}s ({ai_time/rec_time*100:.1f}%)")
        print(f"  Total: {rec_time:.3f}s")
        
        assert cards_response.status_code == 200
        assert rec_response.status_code == 200
