from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()



from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
import uvicorn
from datetime import datetime
from agents import agentic_system


app = FastAPI(title="Agentic Wallet API", version="1.0.0")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums and Models
class OptimizationGoal(str, Enum):
    CASH_BACK = "cash_back"
    TRAVEL_POINTS = "travel_points"
    SPECIFIC_DISCOUNTS = "specific_discounts"
    BALANCED = "balanced"

class Category(str, Enum):
    DINING = "dining"
    TRAVEL = "travel"
    GROCERIES = "groceries"
    GAS = "gas"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    OTHER = "other"

class TransactionRequest(BaseModel):
    user_id: str
    merchant: str
    amount: float = Field(gt=0)
    category: Category
    optimization_goal: OptimizationGoal
    location: Optional[str] = None
    timestamp: Optional[datetime] = None

class CreditCard(BaseModel):
    card_id: str
    card_name: str
    issuer: str
    cash_back_rate: Dict[str, float]  # category -> rate
    points_multiplier: Dict[str, float]
    annual_fee: float
    benefits: List[str]

class CardRecommendation(BaseModel):
    card_id: str
    card_name: str
    expected_value: float
    cash_back_earned: float
    points_earned: float
    applicable_benefits: List[str]
    explanation: str
    confidence_score: float

class RecommendationResponse(BaseModel):
    recommended_card: CardRecommendation
    alternative_cards: List[CardRecommendation]
    optimization_summary: str
    total_savings: float

# Mock database (replace with PostgreSQL)
MOCK_USER_CARDS = {
    "user123": [
        CreditCard(
            card_id="card1",
            card_name="Chase Sapphire Reserve",
            issuer="Chase",
            cash_back_rate={"dining": 0.03, "travel": 0.03, "other": 0.01},
            points_multiplier={"dining": 3.0, "travel": 3.0, "other": 1.0},
            annual_fee=550.0,
            benefits=["Airport Lounge Access", "Travel Insurance", "$300 Travel Credit"]
        ),
        CreditCard(
            card_id="card2",
            card_name="Citi Double Cash",
            issuer="Citi",
            cash_back_rate={"dining": 0.02, "travel": 0.02, "groceries": 0.02, "other": 0.02},
            points_multiplier={"dining": 0.0, "travel": 0.0, "other": 0.0},
            annual_fee=0.0,
            benefits=["No Annual Fee", "Extended Warranty"]
        ),
        CreditCard(
            card_id="card3",
            card_name="American Express Gold",
            issuer="Amex",
            cash_back_rate={"dining": 0.04, "groceries": 0.04, "other": 0.01},
            points_multiplier={"dining": 4.0, "groceries": 4.0, "other": 1.0},
            annual_fee=250.0,
            benefits=["Dining Credits", "Uber Credits", "Travel Insurance"]
        )
    ]
}

# Agent Classes
class UserProfileAgent:
    """Fetches user's credit cards from database"""
    
    def get_user_cards(self, user_id: str) -> List[CreditCard]:
        if user_id not in MOCK_USER_CARDS:
            raise HTTPException(status_code=404, detail="User not found")
        return MOCK_USER_CARDS[user_id]

class OfferIntelligenceAgent:
    """Queries offers and benefits"""
    
    def get_applicable_offers(self, merchant: str, category: Category) -> Dict:
        # Mock offer data (replace with real API calls)
        offers = {
            "dining": ["10% off at select restaurants", "Double points on weekends"],
            "travel": ["5x points on flights", "No foreign transaction fees"],
            "groceries": ["Extra 2% cash back at supermarkets"],
        }
        return {
            "merchant_offers": offers.get(category.value, []),
            "seasonal_promotions": []
        }

class OptimizationAgent:
    """Core optimization logic with configurable weights"""
    
    def __init__(self):
        self.goal_weights = {
            OptimizationGoal.CASH_BACK: {"cash_back": 1.0, "points": 0.1, "benefits": 0.3},
            OptimizationGoal.TRAVEL_POINTS: {"cash_back": 0.1, "points": 1.0, "benefits": 0.5},
            OptimizationGoal.SPECIFIC_DISCOUNTS: {"cash_back": 0.3, "points": 0.3, "benefits": 1.0},
            OptimizationGoal.BALANCED: {"cash_back": 0.5, "points": 0.5, "benefits": 0.5}
        }
    
    def calculate_card_value(
        self, 
        card: CreditCard, 
        amount: float, 
        category: Category,
        goal: OptimizationGoal,
        offers: Dict
    ) -> CardRecommendation:
        weights = self.goal_weights[goal]
        
        # Calculate cash back
        cash_back = amount * card.cash_back_rate.get(category.value, card.cash_back_rate.get("other", 0))
        
        # Calculate points value (assuming 1 point = $0.01)
        points_multiplier = card.points_multiplier.get(category.value, card.points_multiplier.get("other", 0))
        points_earned = amount * points_multiplier
        points_value = points_earned * 0.015  # Typical point valuation
        
        # Calculate benefits value (simplified)
        benefits_value = len(card.benefits) * 2.0
        
        # Calculate total weighted value
        total_value = (
            weights["cash_back"] * cash_back +
            weights["points"] * points_value +
            weights["benefits"] * benefits_value
        )
        
        # Generate explanation
        explanation = self._generate_explanation(
            card, cash_back, points_earned, category, goal
        )
        
        return CardRecommendation(
            card_id=card.card_id,
            card_name=card.card_name,
            expected_value=round(total_value, 2),
            cash_back_earned=round(cash_back, 2),
            points_earned=round(points_earned, 2),
            applicable_benefits=card.benefits[:2],
            explanation=explanation,
            confidence_score=0.85
        )
    
    def _generate_explanation(
        self, 
        card: CreditCard, 
        cash_back: float, 
        points: float, 
        category: Category,
        goal: OptimizationGoal
    ) -> str:
        if goal == OptimizationGoal.CASH_BACK:
            return f"{card.card_name} offers ${cash_back:.2f} cash back for this transaction in the {category.value} category."
        elif goal == OptimizationGoal.TRAVEL_POINTS:
            return f"{card.card_name} earns {points:.0f} points, ideal for travel redemption with enhanced value."
        else:
            return f"{card.card_name} provides balanced rewards with ${cash_back:.2f} cash back and {points:.0f} points."

class CoordinatorAgent:
    """Orchestrates all agents and synthesizes recommendations"""
    
    def __init__(self):
        self.user_profile_agent = UserProfileAgent()
        self.offer_agent = OfferIntelligenceAgent()
        self.optimization_agent = OptimizationAgent()
    
    def get_recommendation(self, request: TransactionRequest) -> RecommendationResponse:
        # Step 1: Get user cards
        cards = self.user_profile_agent.get_user_cards(request.user_id)
        
        # Step 2: Get applicable offers
        offers = self.offer_agent.get_applicable_offers(request.merchant, request.category)
        
        # Step 3: Calculate value for each card
        recommendations = []
        for card in cards:
            rec = self.optimization_agent.calculate_card_value(
                card, request.amount, request.category, request.optimization_goal, offers
            )
            recommendations.append(rec)
        
        # Step 4: Sort by value
        recommendations.sort(key=lambda x: x.expected_value, reverse=True)
        
        # Step 5: Generate summary
        best_card = recommendations[0]
        summary = f"For your ${request.amount:.2f} {request.category.value} purchase, use {best_card.card_name} to optimize {request.optimization_goal.value.replace('_', ' ')}."
        
        return RecommendationResponse(
            recommended_card=best_card,
            alternative_cards=recommendations[1:],
            optimization_summary=summary,
            total_savings=best_card.expected_value
        )

# Initialize coordinator
coordinator = CoordinatorAgent()

# API Endpoints


@app.post("/api/v1/recommend", response_model=RecommendationResponse)
async def get_card_recommendation(request: TransactionRequest):
    """Get AI-powered credit card recommendation"""
    try:
        # Convert request to dict
        transaction_data = {
            "merchant": request.merchant,
            "amount": request.amount,
            "category": request.category,
            "optimization_goal": request.optimization_goal
        }
        
        # Get user cards
        user_cards = MOCK_USER_CARDS.get(request.user_id, [])
        user_cards_dict = [card.dict() for card in user_cards]
        
        # Use agentic AI system
        result = agentic_system.get_recommendation(transaction_data, user_cards_dict)
        
        return RecommendationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# @app.post("/api/v1/recommend", response_model=RecommendationResponse)
# async def get_card_recommendation(request: TransactionRequest):
#     """Get optimized credit card recommendation"""
#     try:
#         return coordinator.get_recommendation(request)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/users/{user_id}/cards", response_model=List[CreditCard])
async def get_user_cards(user_id: str):
    """Get all credit cards for a user"""
    agent = UserProfileAgent()
    return agent.get_user_cards(user_id)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)