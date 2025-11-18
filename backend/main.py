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
    get_user_analytics,
    # New UserCreditCard CRUD operations
    add_user_credit_card, get_user_credit_cards, get_user_credit_card,
    update_user_credit_card, delete_user_credit_card, deactivate_user_credit_card,
    get_user_cards_with_details
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

# Import auth utilities
from auth import hash_password, verify_password, generate_user_id

# Import location service
from location_service import location_service

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
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[Category] = None
    optimization_goal: Optional[OptimizationGoal] = None
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


class RecommendedCardSimple(BaseModel):
    card_id: str
    card_name: str
    reason: str
    estimated_value: str
    explanation: Optional[str] = None


class SimpleRecommendationResponse(BaseModel):
    recommended_card: RecommendedCardSimple
    alternatives: List[RecommendedCardSimple] = Field(default_factory=list)


class CreateTransactionRequest(BaseModel):
    """Request body for creating a transaction"""
    user_id: str
    merchant: str
    amount: float = Field(..., gt=0)
    category: Category
    card_used_id: str  # The card the user actually used
    recommended_card_id: Optional[str] = None
    optimization_goal: Optional[OptimizationGoal] = OptimizationGoal.CASH_BACK
    location: Optional[str] = None
    cash_back_earned: Optional[float] = 0.0
    points_earned: Optional[float] = 0.0
    total_value_earned: Optional[float] = 0.0
    optimal_value: Optional[float] = None
    recommendation_explanation: Optional[str] = None
    confidence_score: Optional[float] = None


class CreateTransactionResponse(BaseModel):
    """Response for created transaction"""
    transaction_id: str
    user_id: str
    merchant: str
    amount: float
    category: str
    card_used: str
    card_used_id: str
    rewards_earned: float
    date: str
    message: str


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


# ============================================================================
# USER CREDIT CARD SCHEMAS (User's owned cards)
# ============================================================================

class UserCreditCardCreate(BaseModel):
    """Schema for adding a card from library to user's wallet"""
    card_id: str = Field(..., description="Card ID from the card library")
    nickname: Optional[str] = Field(None, max_length=255, description="Custom nickname for the card")
    last_four_digits: Optional[str] = Field(None, max_length=4, min_length=4, description="Last 4 digits of actual card")
    credit_limit: Optional[float] = Field(None, ge=0, description="User's credit limit")


class UserCreditCardUpdate(BaseModel):
    """Schema for updating user's credit card details"""
    nickname: Optional[str] = Field(None, max_length=255)
    last_four_digits: Optional[str] = Field(None, max_length=4, min_length=4)
    credit_limit: Optional[float] = Field(None, ge=0)
    current_balance: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class UserCreditCardResponse(BaseModel):
    """Schema for user credit card response with full details"""
    # User-specific fields
    user_card_id: int
    nickname: Optional[str]
    last_four_digits: Optional[str]
    credit_limit: Optional[float]
    current_balance: float
    is_active: bool
    activation_date: datetime

    # Card library fields
    card_id: str
    card_name: str
    issuer: str
    annual_fee: float
    cash_back_rate: Dict[str, float]
    points_multiplier: Dict[str, float]
    benefits: List[str]

    class Config:
        from_attributes = True


class SignupRequest(BaseModel):
    """Schema for user signup"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    full_name: str = Field(..., min_length=1, description="User's full name")
    phone: Optional[str] = Field(None, description="Phone number")
    optimization_goal: Optional[OptimizationGoal] = Field(OptimizationGoal.BALANCED, description="Default optimization goal")


class SigninRequest(BaseModel):
    """Schema for user signin"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    """Schema for authentication response"""
    user_id: str
    email: str
    full_name: str
    message: str


class LocationRequest(BaseModel):
    """Schema for location-based requests"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    radius: Optional[int] = Field(default=2000, ge=100, le=5000, description="Search radius in meters")


class NearbyPlace(BaseModel):
    """Schema for a nearby place"""
    place_id: str
    name: str
    category: str
    place_types: List[str]
    address: str
    latitude: float
    longitude: float
    rating: Optional[float]
    price_level: Optional[int]
    is_open: Optional[bool]
    distance_meters: float
    distance_formatted: str


class LocationBasedRecommendationRequest(BaseModel):
    """Schema for location-based card recommendation"""
    user_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius: Optional[int] = Field(default=2000, ge=100, le=5000)


class PlaceRecommendation(BaseModel):
    """Schema for a place with card recommendation"""
    place: NearbyPlace
    recommended_card: RecommendedCardSimple
    expected_reward: float
    reward_explanation: str


class LocationBasedRecommendationResponse(BaseModel):
    """Schema for location-based recommendation response"""
    user_location: Dict[str, float]
    places_analyzed: int
    top_recommendations: List[PlaceRecommendation]
    timestamp: datetime


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


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/v1/auth/signup", response_model=AuthResponse, status_code=201)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user account
    """
    try:
        # Check if user already exists
        existing_user = db.query(UserModel).filter(UserModel.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Generate user ID and hash password
        user_id = generate_user_id()
        password_hash = hash_password(request.password)

        # Create new user
        new_user = UserModel(
            user_id=user_id,
            email=request.email,
            password_hash=password_hash,
            full_name=request.full_name,
            phone=request.phone,
            default_optimization_goal=OptimizationGoalEnum[request.optimization_goal.value.upper()]
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Initialize user behavior record
        from crud import create_user_behavior
        create_user_behavior(db, user_id)

        logger.info(f"New user created: {user_id} - {request.email}")

        return AuthResponse(
            user_id=new_user.user_id,
            email=new_user.email,
            full_name=new_user.full_name,
            message="Account created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signup: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating account: {str(e)}"
        )


@app.post("/api/v1/auth/signin", response_model=AuthResponse)
async def signin(request: SigninRequest, db: Session = Depends(get_db)):
    """
    Sign in an existing user
    """
    try:
        # Find user by email
        user = db.query(UserModel).filter(UserModel.email == request.email).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Account is inactive. Please contact support."
            )

        logger.info(f"User signed in: {user.user_id} - {user.email}")

        return AuthResponse(
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            message="Signed in successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signin: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error signing in: {str(e)}"
        )


@app.post("/api/v1/recommend", response_model=SimpleRecommendationResponse)
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
        
        # Prepare transaction data for AI with sensible defaults
        amount = request.amount or 0.0
        category_value = (
            request.category.value if request.category else Category.OTHER.value
        )
        goal_value = (
            request.optimization_goal.value
            if request.optimization_goal
            else OptimizationGoal.BALANCED.value
        )

        transaction_data = {
            "merchant": request.merchant,
            "amount": amount,
            "category": category_value,
            "optimization_goal": goal_value
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
        
        # Map detailed AI result to simplified response shape
        def summarize_card(card_dict: Dict, txn_amount: float, category: str) -> RecommendedCardSimple:
            reason = card_dict.get("explanation", "")

            if txn_amount and txn_amount > 0:
                points_earned = float(card_dict.get("points_earned", 0) or 0)
                cash_back_earned = float(card_dict.get("cash_back_earned", 0) or 0)

                if points_earned > 0:
                    points_per_dollar = points_earned / txn_amount
                    estimated_value = f"{points_per_dollar:.1f} points per $1"
                elif cash_back_earned > 0:
                    cash_back_rate = cash_back_earned / txn_amount
                    estimated_value = f"{cash_back_rate * 100:.1f}% cash back"
                else:
                    estimated_value = f"Optimized for {category}"
            else:
                estimated_value = f"Optimized for {category}"

            return RecommendedCardSimple(
                card_name=card_dict["card_name"],
                reason=reason,
                estimated_value=estimated_value,
            )

        best_card = result["recommended_card"]
        alternative_cards = result.get("alternative_cards", [])

        simple_best = summarize_card(best_card, amount, category_value)
        simple_alternatives = [
            summarize_card(alt, amount, category_value) for alt in alternative_cards
        ]

        return SimpleRecommendationResponse(
            recommended_card=simple_best,
            alternatives=simple_alternatives,
        )
        
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
        
        # Calculate recommended card name from card_id
        def get_card_name(card_id):
            if not card_id:
                return None
            card = db.query(CreditCardModel).filter(CreditCardModel.card_id == card_id).first()
            return card.card_name if card else None

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
                    "card_used_id": t.card_id,
                    "card_recommended": get_card_name(t.recommended_card_id),
                    "card_recommended_id": t.recommended_card_id,
                    "used_recommended_card": t.used_recommended_card,
                    "rewards_earned": t.total_value_earned or 0,
                    "optimal_value": t.optimal_value or 0,
                    "missed_value": (t.optimal_value or 0) - (t.total_value_earned or 0) if t.optimal_value and t.total_value_earned else 0,
                    "date": t.transaction_date.isoformat(),
                    "optimal": t.used_recommended_card if t.used_recommended_card is not None else True
                }
                for t in transactions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/transactions", response_model=CreateTransactionResponse)
async def create_new_transaction(
    request: CreateTransactionRequest,
    db: Session = Depends(get_db)
):
    """Create a new transaction record"""
    try:
        # Verify user exists
        user = get_user(db, request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify card exists and get card name
        card = db.query(CreditCardModel).filter(
            CreditCardModel.card_id == request.card_used_id
        ).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")

        # Convert Pydantic enum to SQLAlchemy enum
        category_enum = CategoryEnum(request.category.value)
        optimization_goal_enum = OptimizationGoalEnum(
            request.optimization_goal.value if request.optimization_goal else "cash_back"
        )

        # Calculate missed value if optimal_value is provided
        missed_value = None
        if request.optimal_value is not None and request.total_value_earned is not None:
            missed_value = request.optimal_value - request.total_value_earned

        # Create the transaction
        transaction = create_transaction(
            db=db,
            user_id=request.user_id,
            merchant=request.merchant,
            amount=request.amount,
            category=category_enum,
            optimization_goal=optimization_goal_enum,
            card_id=request.card_used_id,
            recommended_card_id=request.recommended_card_id,
            location=request.location,
            cash_back_earned=request.cash_back_earned or 0.0,
            points_earned=request.points_earned or 0.0,
            total_value_earned=request.total_value_earned or 0.0,
            optimal_value=request.optimal_value,
            optimal_cash_back=request.optimal_value,  # Simplified
            optimal_points=0.0,
            missed_value=missed_value,
            recommendation_explanation=request.recommendation_explanation,
            confidence_score=request.confidence_score
        )

        return CreateTransactionResponse(
            transaction_id=transaction.transaction_id,
            user_id=transaction.user_id,
            merchant=transaction.merchant,
            amount=transaction.amount,
            category=transaction.category.value,
            card_used=card.card_name,
            card_used_id=transaction.card_id,
            rewards_earned=transaction.total_value_earned or 0.0,
            date=transaction.transaction_date.isoformat(),
            message="Transaction created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/users/{user_id}/profile")
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Get user profile information"""
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "default_optimization_goal": user.default_optimization_goal.value if user.default_optimization_goal else None,
            "created_at": user.created_at.isoformat(),
            "is_active": user.is_active
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
# USER CREDIT CARD ENDPOINTS (User's owned cards from library)
# ============================================================================

@app.get("/api/v1/users/{user_id}/wallet/cards", response_model=List[UserCreditCardResponse])
async def get_user_wallet_cards(
    user_id: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get all credit cards in user's wallet with full details.
    This combines user-specific data (nickname, last 4 digits) with card library data.
    """
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        cards_with_details = get_user_cards_with_details(db, user_id, active_only)
        return cards_with_details

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/users/{user_id}/wallet/cards", response_model=UserCreditCardResponse, status_code=201)
async def add_card_to_wallet(
    user_id: str,
    card_request: UserCreditCardCreate,
    db: Session = Depends(get_db)
):
    """
    Add a credit card from the library to user's wallet.
    This creates a user-card association with optional custom details.
    """
    try:
        user = get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Add the card to user's wallet
        user_card = add_user_credit_card(
            db,
            user_id=user_id,
            card_id=card_request.card_id,
            nickname=card_request.nickname,
            last_four_digits=card_request.last_four_digits,
            credit_limit=card_request.credit_limit
        )

        if not user_card:
            raise HTTPException(
                status_code=400,
                detail="Card already exists in wallet or card not found in library"
            )

        # Return full details
        card = user_card.credit_card
        return UserCreditCardResponse(
            user_card_id=user_card.user_card_id,
            nickname=user_card.nickname,
            last_four_digits=user_card.last_four_digits,
            credit_limit=user_card.credit_limit,
            current_balance=user_card.current_balance,
            is_active=user_card.is_active,
            activation_date=user_card.activation_date,
            card_id=card.card_id,
            card_name=card.card_name,
            issuer=card.issuer.value,
            annual_fee=card.annual_fee,
            cash_back_rate=card.cash_back_rate,
            points_multiplier=card.points_multiplier,
            benefits=card.benefits or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding card to wallet: {str(e)}")


@app.put("/api/v1/wallet/cards/{user_card_id}", response_model=UserCreditCardResponse)
async def update_wallet_card(
    user_card_id: int,
    card_update: UserCreditCardUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user-specific details of a credit card in their wallet.
    Can update nickname, last 4 digits, credit limit, balance, or active status.
    """
    try:
        update_data = card_update.dict(exclude_unset=True)
        updated_user_card = update_user_credit_card(db, user_card_id, **update_data)

        if not updated_user_card:
            raise HTTPException(status_code=404, detail="User card not found")

        # Return full details
        card = updated_user_card.credit_card
        return UserCreditCardResponse(
            user_card_id=updated_user_card.user_card_id,
            nickname=updated_user_card.nickname,
            last_four_digits=updated_user_card.last_four_digits,
            credit_limit=updated_user_card.credit_limit,
            current_balance=updated_user_card.current_balance,
            is_active=updated_user_card.is_active,
            activation_date=updated_user_card.activation_date,
            card_id=card.card_id,
            card_name=card.card_name,
            issuer=card.issuer.value,
            annual_fee=card.annual_fee,
            cash_back_rate=card.cash_back_rate,
            points_multiplier=card.points_multiplier,
            benefits=card.benefits or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating wallet card: {str(e)}")


@app.delete("/api/v1/wallet/cards/{user_card_id}", status_code=200)
async def remove_card_from_wallet(
    user_card_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db)
):
    """
    Remove a credit card from user's wallet.
    If permanent=False (default), the card is deactivated (soft delete).
    If permanent=True, the card is completely removed from the wallet.
    """
    try:
        if permanent:
            success = delete_user_credit_card(db, user_card_id)
            message = f"Card {user_card_id} permanently removed from wallet"
        else:
            success = deactivate_user_credit_card(db, user_card_id)
            message = f"Card {user_card_id} deactivated in wallet"

        if not success:
            raise HTTPException(status_code=404, detail="User card not found")

        return {
            "status": "success",
            "message": message,
            "user_card_id": user_card_id,
            "permanent": permanent
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing card from wallet: {str(e)}")


@app.get("/api/v1/wallet/cards/{user_card_id}", response_model=UserCreditCardResponse)
async def get_wallet_card_details(
    user_card_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific card in user's wallet"""
    try:
        user_card = get_user_credit_card(db, user_card_id)
        if not user_card:
            raise HTTPException(status_code=404, detail="User card not found")

        card = user_card.credit_card
        return UserCreditCardResponse(
            user_card_id=user_card.user_card_id,
            nickname=user_card.nickname,
            last_four_digits=user_card.last_four_digits,
            credit_limit=user_card.credit_limit,
            current_balance=user_card.current_balance,
            is_active=user_card.is_active,
            activation_date=user_card.activation_date,
            card_id=card.card_id,
            card_name=card.card_name,
            issuer=card.issuer.value,
            annual_fee=card.annual_fee,
            cash_back_rate=card.cash_back_rate,
            points_multiplier=card.points_multiplier,
            benefits=card.benefits or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CARD LIBRARY ENDPOINTS (Browse available cards)
# ============================================================================

@app.get("/api/v1/cards/library", response_model=List[CreditCard])
async def get_card_library(
    issuer: Optional[str] = None,
    min_fee: Optional[float] = None,
    max_fee: Optional[float] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get available credit cards from the library.
    Users can browse and add these cards to their wallet.
    """
    try:
        from sqlalchemy import and_

        query = db.query(CreditCardModel)

        # Apply filters
        filters = []
        if issuer:
            from models import CardIssuerEnum
            try:
                issuer_enum = CardIssuerEnum(issuer)
                filters.append(CreditCardModel.issuer == issuer_enum)
            except ValueError:
                pass

        if min_fee is not None:
            filters.append(CreditCardModel.annual_fee >= min_fee)

        if max_fee is not None:
            filters.append(CreditCardModel.annual_fee <= max_fee)

        if filters:
            query = query.filter(and_(*filters))

        cards = query.limit(limit).all()

        return [
            CreditCard(
                card_id=card.card_id,
                card_name=card.card_name,
                issuer=card.issuer.value,
                cash_back_rate=card.cash_back_rate,
                points_multiplier=card.points_multiplier,
                annual_fee=card.annual_fee,
                benefits=card.benefits or [],
                is_active=card.is_active
            )
            for card in cards
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LOCATION-BASED RECOMMENDATION ENDPOINTS
# ============================================================================

@app.post("/api/v1/location/nearby-places", response_model=List[NearbyPlace])
async def get_nearby_places(request: LocationRequest):
    """
    Get nearby places based on user's location

    Returns list of nearby merchants and places sorted by distance
    """
    try:
        logger.info(f"Fetching nearby places for location: ({request.latitude}, {request.longitude})")

        places = location_service.get_nearby_places(
            latitude=request.latitude,
            longitude=request.longitude,
            radius=request.radius
        )

        # Format response
        formatted_places = []
        for place in places:
            formatted_places.append(NearbyPlace(
                place_id=place['place_id'],
                name=place['name'],
                category=place['category'],
                place_types=place['place_types'],
                address=place['address'],
                latitude=place['latitude'],
                longitude=place['longitude'],
                rating=place.get('rating'),
                price_level=place.get('price_level'),
                is_open=place.get('is_open'),
                distance_meters=place['distance_meters'],
                distance_formatted=location_service.format_distance(place['distance_meters'])
            ))

        logger.info(f"Found {len(formatted_places)} nearby places")
        return formatted_places

    except Exception as e:
        logger.error(f"Error getting nearby places: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching nearby places: {str(e)}"
        )


@app.post("/api/v1/location/recommendations", response_model=LocationBasedRecommendationResponse)
async def get_location_based_recommendations(
    request: LocationBasedRecommendationRequest,
    db: Session = Depends(get_db)
):
    """
    Get credit card recommendations for nearby places

    Analyzes nearby merchants and recommends the best card for each location
    Returns top 5 places with card recommendations
    """
    try:
        logger.info(f"Getting location-based recommendations for user {request.user_id}")

        # Get user and their cards
        user = get_user(db, request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get user's credit cards with full library details (including benefits)
        user_cards_with_details = get_user_cards_with_details(db, request.user_id, active_only=True)
        if not user_cards_with_details:
            raise HTTPException(
                status_code=400,
                detail="User has no credit cards. Please add cards first."
            )

        # Convert to dictionaries for AI agent - includes all benefits and card details
        user_cards_dict = [
            {
                "card_id": card["card_id"],
                "card_name": card["card_name"],
                "issuer": card["issuer"],
                "cash_back_rate": card["cash_back_rate"],
                "points_multiplier": card["points_multiplier"],
                "annual_fee": card["annual_fee"],
                "benefits": card["benefits"] or []
            }
            for card in user_cards_with_details
        ]

        # Get nearby places
        nearby_places = location_service.get_nearby_places(
            latitude=request.latitude,
            longitude=request.longitude,
            radius=request.radius
        )

        if not nearby_places:
            return LocationBasedRecommendationResponse(
                user_location={'latitude': request.latitude, 'longitude': request.longitude},
                places_analyzed=0,
                top_recommendations=[],
                timestamp=datetime.utcnow()
            )

        # Get recommendations for each place
        place_recommendations = []

        for place in nearby_places[:10]:  # Analyze top 10 closest places
            try:
                # Prepare transaction data for the agentic system
                # Get user's optimization goal (default to balanced if not set)
                opt_goal = user.default_optimization_goal
                if opt_goal and hasattr(opt_goal, 'value'):
                    opt_goal_value = opt_goal.value
                else:
                    opt_goal_value = 'balanced'

                transaction_data = {
                    'merchant': place['name'],
                    'amount': 50.0,  # Use average transaction amount
                    'category': place['category'],
                    'optimization_goal': opt_goal_value,
                    'location': place['address']
                }

                # Use the agentic system to recommend best card for this place
                recommendation = agentic_system.get_recommendation(
                    transaction_data=transaction_data,
                    user_cards=user_cards_dict
                )

                # Skip if there was an error
                if 'error' in recommendation:
                    logger.warning(f"Recommendation error for {place['name']}: {recommendation.get('message')}")
                    continue

                # Calculate reward for this place (expected_value is inside recommended_card)
                rec_card = recommendation.get('recommended_card', {})
                expected_reward = rec_card.get('expected_value', 0)

                # Skip if no valid reward
                if expected_reward <= 0:
                    continue

                place_recommendations.append({
                    'place': place,
                    'recommendation': recommendation,
                    'expected_reward': expected_reward,
                    'score': expected_reward / (place['distance_meters'] / 100)  # Score: reward per 100m
                })

            except Exception as e:
                logger.warning(f"Error getting recommendation for {place['name']}: {e}")
                continue

        # Sort by score (best reward/distance ratio) and take top 5
        place_recommendations.sort(key=lambda x: x['score'], reverse=True)
        top_5 = place_recommendations[:5]

        # Format response
        formatted_recommendations = []
        for item in top_5:
            place = item['place']
            rec = item['recommendation']
            rec_card = rec.get('recommended_card', {})

            formatted_recommendations.append(PlaceRecommendation(
                place=NearbyPlace(
                    place_id=place['place_id'],
                    name=place['name'],
                    category=place['category'],
                    place_types=place['place_types'],
                    address=place['address'],
                    latitude=place['latitude'],
                    longitude=place['longitude'],
                    rating=place.get('rating'),
                    price_level=place.get('price_level'),
                    is_open=place.get('is_open'),
                    distance_meters=place['distance_meters'],
                    distance_formatted=location_service.format_distance(place['distance_meters'])
                ),
                recommended_card=RecommendedCardSimple(
                    card_id=rec_card.get('card_id', ''),
                    card_name=rec_card.get('card_name', 'Unknown'),
                    reason=rec_card.get('explanation', 'Best rewards for this category'),
                    estimated_value=f"${rec_card.get('expected_value', 0):.2f}",
                    explanation=rec_card.get('explanation', 'Best rewards for this category')
                ),
                expected_reward=item['expected_reward'],
                reward_explanation=f"Earn ${item['expected_reward']:.2f} in rewards at {place['name']}"
            ))

        logger.info(f"Returning {len(formatted_recommendations)} location-based recommendations")

        return LocationBasedRecommendationResponse(
            user_location={'latitude': request.latitude, 'longitude': request.longitude},
            places_analyzed=len(nearby_places),
            top_recommendations=formatted_recommendations,
            timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in location-based recommendations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating location-based recommendations: {str(e)}"
        )



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
