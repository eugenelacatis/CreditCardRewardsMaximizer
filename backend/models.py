"""
SQLAlchemy Models for Credit Card Rewards Maximizer
PostgreSQL Database Schema
"""

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Boolean, 
    ForeignKey, JSON, Enum as SQLEnum, Text, Index, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


# Enums
class OptimizationGoalEnum(str, enum.Enum):
    CASH_BACK = "cash_back"
    TRAVEL_POINTS = "travel_points"
    SPECIFIC_DISCOUNTS = "specific_discounts"
    BALANCED = "balanced"


class CategoryEnum(str, enum.Enum):
    DINING = "dining"
    TRAVEL = "travel"
    GROCERIES = "groceries"
    GAS = "gas"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    OTHER = "other"


class CardIssuerEnum(str, enum.Enum):
    CHASE = "Chase"
    AMEX = "American Express"
    CITI = "Citi"
    CAPITAL_ONE = "Capital One"
    DISCOVER = "Discover"
    WELLS_FARGO = "Wells Fargo"
    BANK_OF_AMERICA = "Bank of America"
    OTHER = "Other"


# Models
class User(Base):
    """User account information"""
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # Hashed password
    full_name = Column(String(255))
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Preferences
    default_optimization_goal = Column(
        SQLEnum(OptimizationGoalEnum),
        default=OptimizationGoalEnum.BALANCED
    )
    monthly_spending_limit = Column(Float)
    notification_enabled = Column(Boolean, default=True)
    
    # Relationships
    credit_cards = relationship("CreditCard", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    automation_rules = relationship("AutomationRule", back_populates="user", cascade="all, delete-orphan")
    user_behavior = relationship("UserBehavior", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_created_at', 'created_at'),
    )


class CreditCard(Base):
    """Credit card details for users"""
    __tablename__ = "credit_cards"
    
    card_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    
    # Card Information
    card_name = Column(String(255), nullable=False)
    issuer = Column(SQLEnum(CardIssuerEnum), nullable=False)
    last_four_digits = Column(String(4))
    
    # Rewards Structure (stored as JSON for flexibility)
    cash_back_rate = Column(JSON, nullable=False)  # {"dining": 0.03, "travel": 0.03, "other": 0.01}
    points_multiplier = Column(JSON, nullable=False)  # {"dining": 3.0, "travel": 3.0, "other": 1.0}
    
    # Card Details
    annual_fee = Column(Float, default=0.0)
    benefits = Column(JSON)  # Array of benefit strings
    sign_up_bonus = Column(Float)
    foreign_transaction_fee = Column(Float)
    
    # Card Status
    is_active = Column(Boolean, default=True)
    activation_date = Column(DateTime)
    expiration_date = Column(DateTime)
    credit_limit = Column(Float)
    current_balance = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="credit_cards")
    transactions = relationship("Transaction", back_populates="card")
    card_benefits = relationship("CardBenefit", back_populates="card", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_card_user_id', 'user_id'),
        Index('idx_card_issuer', 'issuer'),
        Index('idx_card_is_active', 'is_active'),
        CheckConstraint('annual_fee >= 0', name='check_annual_fee_positive'),
        CheckConstraint('credit_limit >= 0', name='check_credit_limit_positive'),
    )


class CardBenefit(Base):
    """Specific benefits and offers for credit cards"""
    __tablename__ = "card_benefits"
    
    benefit_id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(String(50), ForeignKey('credit_cards.card_id', ondelete='CASCADE'), nullable=False)
    
    # Benefit Details
    benefit_type = Column(String(100))  # "travel_credit", "lounge_access", "insurance", etc.
    benefit_name = Column(String(255), nullable=False)
    benefit_description = Column(Text)
    benefit_value = Column(Float)  # Estimated dollar value
    
    # Applicability
    category = Column(SQLEnum(CategoryEnum))
    merchant_specific = Column(String(255))  # Specific merchant if applicable
    
    # Validity
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    card = relationship("CreditCard", back_populates="card_benefits")
    
    # Indexes
    __table_args__ = (
        Index('idx_benefit_card_id', 'card_id'),
        Index('idx_benefit_category', 'category'),
        Index('idx_benefit_is_active', 'is_active'),
    )


class Transaction(Base):
    """Transaction history and recommendations"""
    __tablename__ = "transactions"
    
    transaction_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    card_id = Column(String(50), ForeignKey('credit_cards.card_id', ondelete='SET NULL'))
    
    # Transaction Details
    merchant = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(SQLEnum(CategoryEnum), nullable=False)
    location = Column(String(255))
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Optimization
    optimization_goal = Column(SQLEnum(OptimizationGoalEnum), nullable=False)
    recommended_card_id = Column(String(50))  # AI recommendation
    used_recommended_card = Column(Boolean)  # Did user follow recommendation?
    
    # Rewards Earned
    cash_back_earned = Column(Float, default=0.0)
    points_earned = Column(Float, default=0.0)
    total_value_earned = Column(Float, default=0.0)
    
    # What could have been earned with optimal card
    optimal_cash_back = Column(Float)
    optimal_points = Column(Float)
    optimal_value = Column(Float)
    missed_value = Column(Float)  # Difference between optimal and actual
    
    # AI Recommendation Details
    recommendation_explanation = Column(Text)
    confidence_score = Column(Float)
    alternative_cards = Column(JSON)  # Store alternative recommendations
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    card = relationship("CreditCard", back_populates="transactions")
    feedback = relationship("TransactionFeedback", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_transaction_user_id', 'user_id'),
        Index('idx_transaction_date', 'transaction_date'),
        Index('idx_transaction_category', 'category'),
        Index('idx_transaction_merchant', 'merchant'),
        Index('idx_transaction_card_id', 'card_id'),
        CheckConstraint('amount > 0', name='check_amount_positive'),
        CheckConstraint('confidence_score >= 0 AND confidence_score <= 1', name='check_confidence_range'),
    )


class TransactionFeedback(Base):
    """User feedback on AI recommendations"""
    __tablename__ = "transaction_feedback"
    
    feedback_id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(50), ForeignKey('transactions.transaction_id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Feedback
    accepted_recommendation = Column(Boolean, nullable=False)
    satisfaction_rating = Column(Integer)  # 1-5 scale
    feedback_text = Column(Text)
    
    # Learning Data
    actual_card_used = Column(String(50))
    reason_for_different_card = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="feedback")
    
    # Indexes
    __table_args__ = (
        Index('idx_feedback_transaction_id', 'transaction_id'),
        Index('idx_feedback_accepted', 'accepted_recommendation'),
        CheckConstraint('satisfaction_rating >= 1 AND satisfaction_rating <= 5', name='check_rating_range'),
    )


class UserBehavior(Base):
    """Learned user preferences and spending patterns"""
    __tablename__ = "user_behavior"
    
    behavior_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Learned Preferences
    preferred_goal = Column(SQLEnum(OptimizationGoalEnum))
    common_categories = Column(JSON)  # Array of frequently used categories
    favorite_merchants = Column(JSON)  # Array of frequently visited merchants
    
    # Spending Patterns
    avg_transaction_amount = Column(Float)
    total_transactions = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    monthly_avg_spend = Column(Float)
    
    # Timing Patterns
    preferred_shopping_hours = Column(JSON)  # Array of hours user shops most
    weekend_vs_weekday_ratio = Column(Float)
    
    # Card Usage Patterns
    most_used_card_id = Column(String(50))
    card_usage_distribution = Column(JSON)  # {"card_id": usage_percentage}
    
    # Optimization Metrics
    recommendation_acceptance_rate = Column(Float, default=0.0)
    total_rewards_earned = Column(Float, default=0.0)
    total_potential_rewards = Column(Float, default=0.0)
    optimization_score = Column(Float)  # How well user is optimizing (0-100)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    learning_data_points = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="user_behavior")
    
    # Indexes
    __table_args__ = (
        Index('idx_behavior_user_id', 'user_id'),
    )


class AutomationRule(Base):
    """User-defined automation rules for card selection"""
    __tablename__ = "automation_rules"
    
    rule_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    
    # Rule Details
    rule_name = Column(String(255), nullable=False)
    rule_description = Column(Text)
    
    # Conditions (JSON for flexibility)
    condition_type = Column(String(50))  # "merchant", "category", "amount_range", "combined"
    condition_value = Column(JSON)  # Stores the actual condition logic
    
    # Action
    action_card_id = Column(String(50), nullable=False)
    
    # Rule Status
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # For rule ordering
    
    # Usage Statistics
    times_triggered = Column(Integer, default=0)
    last_triggered = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="automation_rules")
    
    # Indexes
    __table_args__ = (
        Index('idx_rule_user_id', 'user_id'),
        Index('idx_rule_is_active', 'is_active'),
        Index('idx_rule_priority', 'priority'),
    )


class Merchant(Base):
    """Merchant information and category mappings"""
    __tablename__ = "merchants"
    
    merchant_id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_name = Column(String(255), unique=True, nullable=False)
    
    # Category Information
    primary_category = Column(SQLEnum(CategoryEnum), nullable=False)
    secondary_categories = Column(JSON)  # Array of other applicable categories
    
    # Merchant Details
    website = Column(String(255))
    logo_url = Column(String(500))
    
    # Special Offers
    has_special_offers = Column(Boolean, default=False)
    special_offers = Column(JSON)  # Array of current offers
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_merchant_name', 'merchant_name'),
        Index('idx_merchant_category', 'primary_category'),
    )


class Offer(Base):
    """Special offers and promotions"""
    __tablename__ = "offers"
    
    offer_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Offer Details
    offer_name = Column(String(255), nullable=False)
    offer_description = Column(Text)
    offer_type = Column(String(50))  # "bonus_category", "statement_credit", "limited_time", etc.
    
    # Applicability
    card_id = Column(String(50), ForeignKey('credit_cards.card_id', ondelete='CASCADE'))
    category = Column(SQLEnum(CategoryEnum))
    merchant_id = Column(Integer, ForeignKey('merchants.merchant_id', ondelete='SET NULL'))
    
    # Offer Value
    bonus_multiplier = Column(Float)
    bonus_cash_back = Column(Float)
    minimum_spend = Column(Float)
    maximum_reward = Column(Float)
    
    # Validity
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_offer_card_id', 'card_id'),
        Index('idx_offer_is_active', 'is_active'),
        Index('idx_offer_dates', 'start_date', 'end_date'),
    )


class AIModelMetrics(Base):
    """Track AI model performance and learning"""
    __tablename__ = "ai_model_metrics"
    
    metric_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Model Version
    model_version = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    
    # Performance Metrics
    total_recommendations = Column(Integer, default=0)
    accepted_recommendations = Column(Integer, default=0)
    acceptance_rate = Column(Float)
    
    avg_confidence_score = Column(Float)
    avg_value_predicted = Column(Float)
    avg_value_actual = Column(Float)
    prediction_accuracy = Column(Float)
    
    # Time Period
    metric_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    time_period = Column(String(20))  # "daily", "weekly", "monthly"
    
    # Additional Data
    metrics_data = Column(JSON)  # Additional detailed metrics
    
    # Indexes
    __table_args__ = (
        Index('idx_metrics_date', 'metric_date'),
        Index('idx_metrics_version', 'model_version'),
    )
