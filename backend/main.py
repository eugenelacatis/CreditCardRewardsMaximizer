"""
Updated FastAPI main.py with PostgreSQL Integration
Replaces mock database with real PostgreSQL operations
"""

from dotenv import load_dotenv
import os
import logging

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
from sqlalchemy.orm import Session

# Configure logging
logger = logging.getLogger(__name__)

# Import database and CRUD operations
from database import get_db, init_db, db as database
from crud import (
    get_user, get_user_cards, create_transaction,
    get_user_transactions, get_recent_transactions,
    calculate_transaction_stats, create_transaction_feedback,
    get_user_behavior, update_user_behavior, create_automation_rule,
    get_user_automation_rules, get_or_create_merchant, create_credit_card, update_card, deactivate_card, get_card,
    get_user_analytics
)
from models import (
    User as UserModel, CreditCard as CreditCardModel,
    OptimizationGoalEnum, CategoryEnum
)

# Import AI agents
from agents import agentic_system
from agentic_enhancements import (
    behavior_agent, proactive_agent, context_agent,
    planning_agent, learning_agent, automation_agent,
    get_agentic_recommendation
)

app = FastAPI(
    title="Agentic Wallet API",
    version="2.0.0",
    description="AI-Powered Credit Card Rewards Optimizer with PostgreSQL"
)

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# PYDANTIC MODELS (API Request/Response Schemas)
# ============================================================================

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
    cash_back_rate: Dict[str, float]
    points_multiplier: Dict[str, float]
    annual_fee: float
    benefits: List[str]
    is_active: bool
    
    class Config:
        from_attributes = True


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


class UserStats(BaseModel):
    total_transactions: int
    total_spent: float
    total_rewards: float
    total_potential_rewards: float
    missed_value: float
    optimization_rate: float

class CreditCardCreate(BaseModel):
    """Schema for creating a new credit card"""
    card_name: str = Field(..., min_length=1, max_length=100)
    issuer: str = Field(..., description="Card issuer (Chase, Amex, Citi, etc.)")
    cash_back_rate: Dict[str, float] = Field(default_factory=dict)
    points_multiplier: Dict[str, float] = Field(default_factory=dict)
    annual_fee: float = Field(default=0.0, ge=0)
    benefits: Optional[List[str]] = Field(default_factory=list)
    last_four_digits: Optional[str] = Field(None, max_length=4)
    credit_limit: Optional[float] = Field(None, ge=0)


class CreditCardUpdateRequest(BaseModel):
    """Schema for updating a credit card"""
    card_name: Optional[str] = None
    cash_back_rate: Optional[Dict[str, float]] = None
    points_multiplier: Optional[Dict[str, float]] = None
    annual_fee: Optional[float] = Field(None, ge=0)
    benefits: Optional[List[str]] = None
    credit_limit: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    
    
# ============================================================================
# STARTUP EVENT - Initialize Database
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting Agentic Wallet API...")
    
    # Check database connection
    if database.health_check():
        print("✅ Database connection healthy")
    else:
        print("❌ Database connection failed!")
        raise Exception("Database connection failed")
    
    print("✨ API ready to accept requests")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    database.close()
    print("👋 Shutting down API...")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_healthy = database.health_check()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.utcnow()
    }


@app.post("/api/v1/recommend", response_model=RecommendationResponse)
async def get_card_recommendation(
    request: TransactionRequest,
    db: Session = Depends(get_db)
):
    """Get AI-powered credit card recommendation using PostgreSQL data"""
    try:
        # Get user from database
        user = get_user(db, request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's active credit cards from database
        user_cards = get_user_cards(db, request.user_id, active_only=True)
        if not user_cards:
            raise HTTPException(
                status_code=404,
                detail="No active credit cards found for user"
            )
        
        # Convert SQLAlchemy models to dictionaries for AI agent
        user_cards_dict = [
            {
                "card_id": card.card_id,
                "card_name": card.card_name,
                "issuer": card.issuer.value,
                "cash_back_rate": card.cash_back_rate,
                "points_multiplier": card.points_multiplier,
                "annual_fee": card.annual_fee,
                "benefits": card.benefits or []
            }
            for card in user_cards
        ]
        
        # Prepare transaction data for AI
        transaction_data = {
            "merchant": request.merchant,
            "amount": request.amount,
            "category": request.category,
            "optimization_goal": request.optimization_goal
        }
        
        # Get AI recommendation - will raise RuntimeError if Groq unavailable
        try:
            result = agentic_system.get_recommendation(
                transaction_data,
                user_cards_dict
            )
        except RuntimeError as e:
            # AI service unavailable - notify user clearly
            logger.error(f"AI service error: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"AI recommendation service unavailable: {str(e)}"
            )
        
        # Store transaction in database
        recommended_card_id = result["recommended_card"]["card_id"]
        transaction = create_transaction(
            db,
            user_id=request.user_id,
            merchant=request.merchant,
            amount=request.amount,
            category=CategoryEnum(request.category),
            optimization_goal=OptimizationGoalEnum(request.optimization_goal),
            recommended_card_id=recommended_card_id,
            location=request.location,
            recommendation_explanation=result["recommended_card"]["explanation"],
            confidence_score=result["recommended_card"]["confidence_score"],
            alternative_cards=[
                {
                    "card_id": alt["card_id"],
                    "expected_value": alt["expected_value"]
                }
                for alt in result["alternative_cards"]
            ],
            cash_back_earned=result["recommended_card"]["cash_back_earned"],
            points_earned=result["recommended_card"]["points_earned"],
            total_value_earned=result["recommended_card"]["expected_value"],
            optimal_value=result["recommended_card"]["expected_value"]
        )
        
        # Get or create merchant
        get_or_create_merchant(db, request.merchant, CategoryEnum(request.category))
        
        return RecommendationResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in recommendation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@app.get("/api/v1/users/{user_id}/cards", response_model=List[CreditCard])
async def get_user_credit_cards(user_id: str, db: Session = Depends(get_db)):
    """Get all active credit cards for a user"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cards = get_user_cards(db, user_id, active_only=True)
        return cards
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/transactions")
async def get_user_transaction_history(
    user_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get transaction history for a user"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        transactions = get_user_transactions(db, user_id, limit=limit)
        
        return {
            "user_id": user_id,
            "total_transactions": len(transactions),
            "transactions": [
                {
                    "transaction_id": t.transaction_id,
                    "merchant": t.merchant,
                    "amount": t.amount,
                    "category": t.category.value,
                    "card_used": t.card.card_name if t.card else None,
                    "rewards_earned": t.total_value_earned,
                    "date": t.transaction_date.isoformat()
                }
                for t in transactions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/stats", response_model=UserStats)
async def get_user_statistics(user_id: str, db: Session = Depends(get_db)):
    """Get user statistics and optimization metrics"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        stats = calculate_transaction_stats(db, user_id)
        return UserStats(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/analytics")
async def get_user_analytics_endpoint(
    user_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics for a user
    
    Returns detailed insights including:
    - Total savings and rewards over time period
    - Best performing credit card
    - Category-wise spending breakdown
    - Weekly trends
    - Top merchants
    - Optimization insights and recommendations
    
    Args:
        user_id: User's unique identifier
        days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate days parameter
        if days < 1 or days > 365:
            raise HTTPException(
                status_code=400,
                detail="Days parameter must be between 1 and 365"
            )
        
        analytics = get_user_analytics(db, user_id, days=days)
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/behavior")
async def get_user_behavior_profile(user_id: str, db: Session = Depends(get_db)):
    """Get learned user preferences and patterns"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get or create behavior profile
        behavior = get_user_behavior(db, user_id)
        
        # Update behavior with recent transactions
        recent_txns = get_recent_transactions(db, user_id, days=90)
        if recent_txns:
            behavior = update_user_behavior(db, user_id, recent_txns)
        
        if not behavior:
            return {
                "user_id": user_id,
                "status": "No behavior data available yet"
            }
        
        return {
            "user_id": user_id,
            "preferred_goal": behavior.preferred_goal.value if behavior.preferred_goal else None,
            "common_categories": behavior.common_categories,
            "favorite_merchants": behavior.favorite_merchants,
            "avg_transaction_amount": behavior.avg_transaction_amount,
            "total_transactions": behavior.total_transactions,
            "total_rewards_earned": behavior.total_rewards_earned,
            "optimization_score": behavior.optimization_score,
            "most_used_card_id": behavior.most_used_card_id,
            "last_updated": behavior.last_updated.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/opportunities")
async def get_missed_opportunities(user_id: str, db: Session = Depends(get_db)):
    """Get proactive suggestions for missed optimizations"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get recent transactions
        recent_transactions = get_recent_transactions(db, user_id, days=30, limit=20)
        
        # Convert to format expected by proactive agent
        transaction_dicts = [
            {
                "merchant": t.merchant,
                "amount": t.amount,
                "card_used": t.card.card_name if t.card else "Unknown",
                "recommended_card": t.recommended_card_id or "Unknown",
                "optimal_value": t.optimal_value or 0,
                "actual_value": t.total_value_earned or 0,
                "timestamp": t.transaction_date.isoformat()
            }
            for t in recent_transactions
        ]
        
        opportunities = proactive_agent.detect_optimization_opportunities(
            user_id,
            transaction_dicts
        )
        
        return {
            "user_id": user_id,
            "opportunities": opportunities,
            "total_missed_value": sum(
                opp.get("missed_value", 0) for opp in opportunities
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/feedback")
async def record_user_feedback(
    transaction_id: str,
    accepted: bool,
    card_used: str,
    rating: Optional[int] = None,
    feedback_text: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Record user feedback for learning"""
    try:
        # Create feedback in database
        feedback = create_transaction_feedback(
            db,
            transaction_id=transaction_id,
            accepted_recommendation=accepted,
            satisfaction_rating=rating,
            feedback_text=feedback_text,
            actual_card_used=card_used
        )
        
        # Also record in learning agent
        learning_agent.record_feedback(
            transaction_id,
            {
                "accepted": accepted,
                "card_used": card_used,
                "rating": rating
            }
        )
        
        adjustments = learning_agent.adjust_recommendation_weights()
        
        return {
            "status": "recorded",
            "feedback_id": feedback.feedback_id,
            "learning_status": adjustments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/users/{user_id}/rules")
async def create_automation_rule_endpoint(
    user_id: str,
    rule_name: str,
    condition_type: str,
    condition_value: Dict,
    action_card_id: str,
    rule_description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create an automation rule"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        rule = create_automation_rule(
            db,
            user_id=user_id,
            rule_name=rule_name,
            condition_type=condition_type,
            condition_value=condition_value,
            action_card_id=action_card_id,
            rule_description=rule_description
        )
        
        return {
            "status": "created",
            "rule_id": rule.rule_id,
            "rule_name": rule.rule_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/rules")
async def get_automation_rules_endpoint(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get automation rules for a user"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        rules = get_user_automation_rules(db, user_id, active_only=True)
        
        return {
            "user_id": user_id,
            "rules": [
                {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.rule_name,
                    "condition_type": rule.condition_type,
                    "condition_value": rule.condition_value,
                    "action_card_id": rule.action_card_id,
                    "times_triggered": rule.times_triggered,
                    "is_active": rule.is_active
                }
                for rule in rules
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CARD CRUD ENDPOINTS
# ============================================================================

@app.get("/api/v1/categories", response_model=List[str])
async def get_categories():
    """Get list of all available spending categories"""
    return [category.value for category in CategoryEnum]


@app.get("/api/v1/optimization-goals", response_model=List[str])
async def get_optimization_goals():
    """Get list of all available optimization goals"""
    return [goal.value for goal in OptimizationGoalEnum]


@app.post("/api/v1/cards", response_model=CreditCard, status_code=201)
async def add_credit_card(
    card: CreditCardCreate,
    user_id: str,
    db: Session = Depends(get_db)
):
    """Add a new credit card for a user"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        from models import CardIssuerEnum
        try:
            issuer_enum = CardIssuerEnum(card.issuer)
        except ValueError:
            issuer_enum = CardIssuerEnum.OTHER
        
        new_card = create_credit_card(
            db,
            user_id=user_id,
            card_name=card.card_name,
            issuer=issuer_enum,
            cash_back_rate=card.cash_back_rate,
            points_multiplier=card.points_multiplier,
            annual_fee=card.annual_fee,
            benefits=card.benefits,
            last_four_digits=card.last_four_digits,
            credit_limit=card.credit_limit
        )
        
        return CreditCard(
            card_id=new_card.card_id,
            card_name=new_card.card_name,
            issuer=new_card.issuer.value,
            cash_back_rate=new_card.cash_back_rate,
            points_multiplier=new_card.points_multiplier,
            annual_fee=new_card.annual_fee,
            benefits=new_card.benefits or [],
            is_active=new_card.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating card: {str(e)}")


@app.put("/api/v1/cards/{card_id}", response_model=CreditCard)
async def update_credit_card(
    card_id: str,
    card_update: CreditCardUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update an existing credit card"""
    try:
        existing_card = get_card(db, card_id)
        if not existing_card:
            raise HTTPException(status_code=404, detail="Card not found")
        
        update_data = card_update.dict(exclude_unset=True)
        updated_card = update_card(db, card_id, **update_data)
        
        if not updated_card:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return CreditCard(
            card_id=updated_card.card_id,
            card_name=updated_card.card_name,
            issuer=updated_card.issuer.value,
            cash_back_rate=updated_card.cash_back_rate,
            points_multiplier=updated_card.points_multiplier,
            annual_fee=updated_card.annual_fee,
            benefits=updated_card.benefits or [],
            is_active=updated_card.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating card: {str(e)}")


@app.delete("/api/v1/cards/{card_id}", status_code=200)
async def delete_credit_card(
    card_id: str,
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a credit card"""
    try:
        success = deactivate_card(db, card_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return {
            "status": "success",
            "message": f"Card {card_id} has been deactivated",
            "card_id": card_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting card: {str(e)}")
        

# ============================================================================
# DATABASE MANAGEMENT ENDPOINTS (Development/Admin only)
# ============================================================================

@app.post("/api/v1/admin/init-db")
async def initialize_database():
    """Initialize database tables - ADMIN ONLY"""
    try:
        init_db()
        return {"status": "success", "message": "Database initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
