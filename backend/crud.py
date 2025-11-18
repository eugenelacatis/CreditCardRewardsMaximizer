"""
CRUD Operations for all database models
Centralized database operations for the Credit Card Rewards Maximizer
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import json
import os

from models import (
    User, CreditCard, UserCreditCard, CardBenefit, Transaction, TransactionFeedback,
    UserBehavior, AutomationRule, Merchant, Offer, AIModelMetrics,
    OptimizationGoalEnum, CategoryEnum, CardIssuerEnum
)


# ============================================================================
# USER OPERATIONS
# ============================================================================

def create_user(
    db: Session,
    email: str,
    full_name: str,
    password_hash: str,
    phone: Optional[str] = None,
    default_optimization_goal: OptimizationGoalEnum = OptimizationGoalEnum.BALANCED
) -> User:
    """Create a new user"""
    user = User(
        user_id=f"user_{uuid.uuid4().hex[:12]}",
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        phone=phone,
        default_optimization_goal=default_optimization_goal
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize user behavior
    create_user_behavior(db, user.user_id)

    return user


def get_user(db: Session, user_id: str) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.user_id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def update_user(db: Session, user_id: str, **kwargs) -> Optional[User]:
    """Update user information"""
    user = get_user(db, user_id)
    if not user:
        return None
    
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user


# ============================================================================
# CREDIT CARD OPERATIONS
# ============================================================================

def create_credit_card(
    db: Session,
    user_id: str,
    card_name: str,
    issuer: str,
    cash_back_rate: Dict,
    points_multiplier: Dict,
    annual_fee: float = 0.0,
    benefits: Optional[List[str]] = None,
    **kwargs
) -> CreditCard:
    """Create a new credit card for a user"""
    card = CreditCard(
        card_id=f"card_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        card_name=card_name,
        issuer=issuer,
        cash_back_rate=cash_back_rate,
        points_multiplier=points_multiplier,
        annual_fee=annual_fee,
        benefits=benefits or [],
        **kwargs
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def get_user_cards(
    db: Session, 
    user_id: str, 
    active_only: bool = True
) -> List[CreditCard]:
    """Get all credit cards for a user"""
    query = db.query(CreditCard).filter(CreditCard.user_id == user_id)
    if active_only:
        query = query.filter(CreditCard.is_active == True)
    return query.all()


def get_card(db: Session, card_id: str) -> Optional[CreditCard]:
    """Get a specific credit card"""
    return db.query(CreditCard).filter(CreditCard.card_id == card_id).first()


def update_card(db: Session, card_id: str, **kwargs) -> Optional[CreditCard]:
    """Update credit card information"""
    card = get_card(db, card_id)
    if not card:
        return None
    
    for key, value in kwargs.items():
        if hasattr(card, key):
            setattr(card, key, value)
    
    db.commit()
    db.refresh(card)
    return card


def deactivate_card(db: Session, card_id: str) -> bool:
    """Deactivate a credit card"""
    card = get_card(db, card_id)
    if not card:
        return False

    card.is_active = False
    db.commit()
    return True


def create_credit_cards_from_library(db: Session, user_id: str) -> List[CreditCard]:
    """
    Seed credit cards from the card_library.json file for a user.
    Reads all card data from seed_data/card_library.json and creates them in the database.

    Args:
        db: Database session
        user_id: User ID to associate cards with

    Returns:
        List of created CreditCard objects
    """
    # Determine the path to the seed data file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    library_path = os.path.join(current_dir, "seed_data", "card_library.json")

    if not os.path.exists(library_path):
        print(f"⚠️  Card library file not found at: {library_path}")
        return []

    # Read the JSON file
    try:
        with open(library_path, 'r') as f:
            cards_data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading card library: {e}")
        return []

    created_cards = []

    # Process each card in the library
    for card_data in cards_data:
        try:
            # Map issuer string to CardIssuerEnum
            issuer_name = card_data.get("issuer", "Other")
            try:
                issuer_enum = CardIssuerEnum(issuer_name)
            except ValueError:
                # If issuer not in enum, use OTHER
                issuer_enum = CardIssuerEnum.OTHER

            # Create the credit card
            card = create_credit_card(
                db=db,
                user_id=user_id,
                card_name=card_data["card_name"],
                issuer=issuer_enum,
                cash_back_rate=card_data["cash_back_rate"],
                points_multiplier=card_data["points_multiplier"],
                annual_fee=card_data.get("annual_fee", 0.0),
                benefits=card_data.get("benefits", [])
            )
            created_cards.append(card)

        except Exception as e:
            print(f"⚠️  Error creating card '{card_data.get('card_name', 'Unknown')}': {e}")
            continue

    print(f"✅ Created {len(created_cards)} cards from library")
    return created_cards

def get_library_cards(
    db: Session,
    issuer: Optional[str] = None,
    best_for: Optional[str] = None,
    annual_fee_max: Optional[float] = None,
    skip: int = 0,
    limit: int = 100
) -> List[CreditCard]:
    """
    Get library cards with optional filters
    
    Args:
        db: Database session
        issuer: Filter by card issuer (e.g., "Chase", "American Express")
        best_for: Filter by category (e.g., 'dining', 'travel', 'groceries')
        annual_fee_max: Maximum annual fee
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
    
    Returns:
        List of CreditCard objects from the library
    """
    query = db.query(CreditCard).filter(CreditCard.is_library_card == True)
    
    # Apply filters
    if issuer:
        query = query.filter(CreditCard.issuer == issuer)
    
    if best_for:
        # Filter cards where the specified category has higher rewards
        # Cards are considered good for a category if:
        # - Cash back rate > 1% OR
        # - Points multiplier > 1x
        # This uses PostgreSQL JSON operators
        from sqlalchemy import cast, text
        
        # Build condition for cash_back_rate
        cash_back_condition = text(
            f"(cash_back_rate->>'{best_for}')::float > 0.01"
        )
        
        # Build condition for points_multiplier
        points_condition = text(
            f"(points_multiplier->>'{best_for}')::float > 1.0"
        )
        
        query = query.filter(
            or_(
                cash_back_condition,
                points_condition
            )
        )
    
    if annual_fee_max is not None:
        query = query.filter(CreditCard.annual_fee <= annual_fee_max)
    
    # Apply pagination and return
    return query.offset(skip).limit(limit).all()


def copy_library_card_to_user(
    db: Session,
    user_id: str,
    library_card_id: str,
    last_four_digits: Optional[str] = None
) -> Optional[CreditCard]:
    """
    Copy a library card to a user's wallet
    
    This creates a new card record for the user based on a library card template.
    The new card is NOT a library card itself.
    
    Args:
        db: Database session
        user_id: User ID who is adding the card
        library_card_id: ID of the library card to copy
        last_four_digits: Optional last 4 digits of the user's physical card
    
    Returns:
        The newly created user card, or None if library card not found
    """
    # Get the library card
    library_card = db.query(CreditCard).filter(
        CreditCard.card_id == library_card_id,
        CreditCard.is_library_card == True
    ).first()
    
    if not library_card:
        return None
    
    # Create a new card for the user based on the library card
    user_card = CreditCard(
        card_id=f"card_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        card_name=library_card.card_name,
        issuer=library_card.issuer,
        last_four_digits=last_four_digits,
        cash_back_rate=library_card.cash_back_rate,
        points_multiplier=library_card.points_multiplier,
        annual_fee=library_card.annual_fee,
        benefits=library_card.benefits,
        sign_up_bonus=library_card.sign_up_bonus,
        foreign_transaction_fee=library_card.foreign_transaction_fee,
        is_library_card=False,  # This is a user's personal card, NOT a library card
        is_active=True,
        activation_date=datetime.utcnow()
    )
    
    db.add(user_card)
    db.commit()
    db.refresh(user_card)
    return user_card


def delete_card(db: Session, card_id: str, user_id: str) -> tuple[bool, Optional[str]]:
    """
    Delete a credit card (only if it's not a library card)
    
    This function includes safety checks to:
    1. Prevent deletion of library cards
    2. Verify the card belongs to the requesting user
    
    Args:
        db: Database session
        card_id: Card ID to delete
        user_id: User ID (for authorization check)
    
    Returns:
        Tuple of (success: bool, error_message: Optional[str])
        - (True, None) if deletion succeeded
        - (False, "error message") if deletion failed
    """
    # Import get_card if not already imported
    card = get_card(db, card_id)
    
    if not card:
        return False, "Card not found"
    
    # CRITICAL: Prevent deletion of library cards
    if card.is_library_card:
        return False, "Cannot delete library cards"
    
    # Verify the card belongs to the user
    if card.user_id != user_id:
        return False, "Unauthorized: Card does not belong to this user"
    
    # Delete the card
    db.delete(card)
    db.commit()
    return True, None


# Helper function to check if a card is a library card
def is_library_card(db: Session, card_id: str) -> bool:
    """
    Check if a card is a library card
    
    Args:
        db: Database session
        card_id: Card ID to check
    
    Returns:
        True if the card is a library card, False otherwise
    """
    card = get_card(db, card_id)
    return card.is_library_card if card else False
    
# ============================================================================
# USER CREDIT CARD OPERATIONS (User's owned cards from library)
# ============================================================================

def add_user_credit_card(
    db: Session,
    user_id: str,
    card_id: str,
    nickname: Optional[str] = None,
    last_four_digits: Optional[str] = None,
    credit_limit: Optional[float] = None
) -> Optional[UserCreditCard]:
    """
    Add a credit card from the library to a user's wallet.
    If the card was previously removed (inactive), it will be reactivated.

    Args:
        db: Database session
        user_id: User ID
        card_id: Credit card ID from the card library
        nickname: Optional custom name for the card
        last_four_digits: Last 4 digits of the user's actual card
        credit_limit: User's credit limit for this card

    Returns:
        UserCreditCard object or None if card not found in library
    """
    # Check if user already has this card
    existing = db.query(UserCreditCard).filter(
        and_(
            UserCreditCard.user_id == user_id,
            UserCreditCard.card_id == card_id
        )
    ).first()

    if existing:
        # If card exists but is inactive, reactivate it
        if not existing.is_active:
            print(f"✅ Reactivating previously removed card")
            existing.is_active = True
            existing.activation_date = datetime.utcnow()
            
            # Update optional fields if provided
            if nickname:
                existing.nickname = nickname
            if last_four_digits:
                existing.last_four_digits = last_four_digits
            if credit_limit:
                existing.credit_limit = credit_limit
            
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Card is already active
            print(f"⚠️  User already has this card in their active wallet")
            return None

    # Verify the card exists in the library
    card = get_card(db, card_id)
    if not card:
        print(f"⚠️  Card {card_id} not found in library")
        return None

    # Create user credit card
    user_card = UserCreditCard(
        user_id=user_id,
        card_id=card_id,
        nickname=nickname,
        last_four_digits=last_four_digits,
        credit_limit=credit_limit,
        is_active=True,
        activation_date=datetime.utcnow()
    )

    db.add(user_card)
    db.commit()
    db.refresh(user_card)
    return user_card


def get_user_credit_cards(
    db: Session,
    user_id: str,
    active_only: bool = True
) -> List[UserCreditCard]:
    """
    Get all credit cards owned by a user.

    Args:
        db: Database session
        user_id: User ID
        active_only: Only return active cards

    Returns:
        List of UserCreditCard objects with relationships loaded
    """
    query = db.query(UserCreditCard).filter(UserCreditCard.user_id == user_id)
    if active_only:
        query = query.filter(UserCreditCard.is_active == True)
    return query.all()


def get_user_credit_card(
    db: Session,
    user_card_id: int
) -> Optional[UserCreditCard]:
    """Get a specific user credit card by ID"""
    return db.query(UserCreditCard).filter(
        UserCreditCard.user_card_id == user_card_id
    ).first()


def get_user_credit_card_by_card_id(
    db: Session,
    user_id: str,
    card_id: str
) -> Optional[UserCreditCard]:
    """Get a user's credit card by the library card ID"""
    return db.query(UserCreditCard).filter(
        and_(
            UserCreditCard.user_id == user_id,
            UserCreditCard.card_id == card_id
        )
    ).first()


def update_user_credit_card(
    db: Session,
    user_card_id: int,
    **kwargs
) -> Optional[UserCreditCard]:
    """
    Update a user's credit card information.

    Args:
        db: Database session
        user_card_id: UserCreditCard ID
        **kwargs: Fields to update (nickname, last_four_digits, credit_limit, is_active, etc.)

    Returns:
        Updated UserCreditCard object or None if not found
    """
    user_card = get_user_credit_card(db, user_card_id)
    if not user_card:
        return None

    for key, value in kwargs.items():
        if hasattr(user_card, key):
            setattr(user_card, key, value)

    db.commit()
    db.refresh(user_card)
    return user_card


def delete_user_credit_card(
    db: Session,
    user_card_id: int
) -> bool:
    """
    Delete (remove) a credit card from user's wallet.

    Args:
        db: Database session
        user_card_id: UserCreditCard ID

    Returns:
        True if deleted, False if not found
    """
    user_card = get_user_credit_card(db, user_card_id)
    if not user_card:
        return False

    db.delete(user_card)
    db.commit()
    return True


def deactivate_user_credit_card(
    db: Session,
    user_card_id: int
) -> bool:
    """
    Deactivate a user's credit card (soft delete).

    Args:
        db: Database session
        user_card_id: UserCreditCard ID

    Returns:
        True if deactivated, False if not found
    """
    user_card = get_user_credit_card(db, user_card_id)
    if not user_card:
        return False

    user_card.is_active = False
    db.commit()
    return True


def get_user_cards_with_details(
    db: Session,
    user_id: str,
    active_only: bool = True
) -> List[Dict]:
    """
    Get user's credit cards with full card library details.

    Args:
        db: Database session
        user_id: User ID
        active_only: Only return active cards

    Returns:
        List of dictionaries with combined UserCreditCard and CreditCard data
    """
    user_cards = get_user_credit_cards(db, user_id, active_only)

    result = []
    for user_card in user_cards:
        card = user_card.credit_card
        result.append({
            # User-specific data
            "user_card_id": user_card.user_card_id,
            "nickname": user_card.nickname,
            "last_four_digits": user_card.last_four_digits,
            "credit_limit": user_card.credit_limit,
            "current_balance": user_card.current_balance,
            "is_active": user_card.is_active,
            "activation_date": user_card.activation_date,

            # Card library data
            "card_id": card.card_id,
            "card_name": card.card_name,
            "issuer": card.issuer.value,
            "annual_fee": card.annual_fee,
            "cash_back_rate": card.cash_back_rate,
            "points_multiplier": card.points_multiplier,
            "benefits": card.benefits,
        })

    return result


# ============================================================================
# TRANSACTION OPERATIONS
# ============================================================================

def create_transaction(
    db: Session,
    user_id: str,
    merchant: str,
    amount: float,
    category: CategoryEnum,
    optimization_goal: OptimizationGoalEnum,
    card_id: Optional[str] = None,
    recommended_card_id: Optional[str] = None,
    location: Optional[str] = None,
    **kwargs
) -> Transaction:
    """Create a new transaction"""
    transaction = Transaction(
        transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        card_id=card_id,
        merchant=merchant,
        amount=amount,
        category=category,
        optimization_goal=optimization_goal,
        recommended_card_id=recommended_card_id,
        location=location,
        **kwargs
    )
    
    # Determine if user followed recommendation
    if recommended_card_id and card_id:
        transaction.used_recommended_card = (card_id == recommended_card_id)
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def get_transaction(db: Session, transaction_id: str) -> Optional[Transaction]:
    """Get a specific transaction"""
    return db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()


def get_user_transactions(
    db: Session,
    user_id: str,
    limit: int = 100,
    category: Optional[CategoryEnum] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Transaction]:
    """Get transactions for a user with optional filters"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    
    if category:
        query = query.filter(Transaction.category == category)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    return query.order_by(desc(Transaction.transaction_date)).limit(limit).all()


def get_recent_transactions(
    db: Session,
    user_id: str,
    days: int = 30,
    limit: int = 50
) -> List[Transaction]:
    """Get recent transactions for a user"""
    start_date = datetime.utcnow() - timedelta(days=days)
    return get_user_transactions(db, user_id, limit=limit, start_date=start_date)


def calculate_transaction_stats(
    db: Session,
    user_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict:
    """Calculate transaction statistics for a user"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    transactions = query.all()
    
    if not transactions:
        return {
            "total_transactions": 0,
            "total_spent": 0.0,
            "total_rewards": 0.0,
            "total_potential_rewards": 0.0,
            "missed_value": 0.0,
            "optimization_rate": 0.0
        }
    
    total_spent = sum(t.amount for t in transactions)
    total_rewards = sum(t.total_value_earned for t in transactions if t.total_value_earned)
    total_potential = sum(t.optimal_value for t in transactions if t.optimal_value)
    missed_value = sum(t.missed_value for t in transactions if t.missed_value)
    
    followed_recommendations = sum(
        1 for t in transactions 
        if t.used_recommended_card is True
    )
    
    return {
        "total_transactions": len(transactions),
        "total_spent": round(total_spent, 2),
        "total_rewards": round(total_rewards, 2),
        "total_potential_rewards": round(total_potential, 2),
        "missed_value": round(missed_value, 2),
        "optimization_rate": round(
            (followed_recommendations / len(transactions) * 100) if transactions else 0.0,
            2
        )
    }


# ============================================================================
# TRANSACTION FEEDBACK OPERATIONS
# ============================================================================

def create_transaction_feedback(
    db: Session,
    transaction_id: str,
    accepted_recommendation: bool,
    satisfaction_rating: Optional[int] = None,
    feedback_text: Optional[str] = None,
    actual_card_used: Optional[str] = None,
    reason_for_different_card: Optional[str] = None
) -> TransactionFeedback:
    """Create feedback for a transaction"""
    feedback = TransactionFeedback(
        transaction_id=transaction_id,
        accepted_recommendation=accepted_recommendation,
        satisfaction_rating=satisfaction_rating,
        feedback_text=feedback_text,
        actual_card_used=actual_card_used,
        reason_for_different_card=reason_for_different_card
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def get_feedback_stats(db: Session, user_id: str) -> Dict:
    """Get feedback statistics for a user"""
    feedbacks = db.query(TransactionFeedback).join(Transaction).filter(
        Transaction.user_id == user_id
    ).all()
    
    if not feedbacks:
        return {
            "total_feedbacks": 0,
            "acceptance_rate": 0.0,
            "avg_satisfaction": 0.0
        }
    
    accepted = sum(1 for f in feedbacks if f.accepted_recommendation)
    ratings = [f.satisfaction_rating for f in feedbacks if f.satisfaction_rating]
    
    return {
        "total_feedbacks": len(feedbacks),
        "acceptance_rate": round((accepted / len(feedbacks)) * 100, 2),
        "avg_satisfaction": round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    }


# ============================================================================
# USER BEHAVIOR OPERATIONS
# ============================================================================

def create_user_behavior(db: Session, user_id: str) -> UserBehavior:
    """Create initial user behavior record"""
    behavior = UserBehavior(user_id=user_id)
    db.add(behavior)
    db.commit()
    db.refresh(behavior)
    return behavior


def get_user_behavior(db: Session, user_id: str) -> Optional[UserBehavior]:
    """Get user behavior profile"""
    return db.query(UserBehavior).filter(UserBehavior.user_id == user_id).first()


def update_user_behavior(
    db: Session,
    user_id: str,
    transactions: List[Transaction]
) -> Optional[UserBehavior]:
    """Update user behavior based on transaction history"""
    behavior = get_user_behavior(db, user_id)
    if not behavior:
        behavior = create_user_behavior(db, user_id)
    
    if not transactions:
        return behavior
    
    # Calculate patterns
    category_counts = {}
    goal_counts = {}
    card_usage = {}
    total_spent = 0.0
    total_rewards = 0.0
    total_potential = 0.0
    
    for txn in transactions:
        category_counts[txn.category.value] = category_counts.get(txn.category.value, 0) + 1
        goal_counts[txn.optimization_goal.value] = goal_counts.get(txn.optimization_goal.value, 0) + 1
        
        if txn.card_id:
            card_usage[txn.card_id] = card_usage.get(txn.card_id, 0) + 1
        
        total_spent += txn.amount
        if txn.total_value_earned:
            total_rewards += txn.total_value_earned
        if txn.optimal_value:
            total_potential += txn.optimal_value
    
    # Update behavior
    behavior.common_categories = sorted(
        category_counts.keys(),
        key=lambda x: category_counts[x],
        reverse=True
    )[:3]
    
    behavior.preferred_goal = max(goal_counts, key=goal_counts.get) if goal_counts else OptimizationGoalEnum.BALANCED
    
    behavior.avg_transaction_amount = round(total_spent / len(transactions), 2)
    behavior.total_transactions = len(transactions)
    behavior.total_spent = round(total_spent, 2)
    behavior.total_rewards_earned = round(total_rewards, 2)
    behavior.total_potential_rewards = round(total_potential, 2)
    
    # Calculate optimization score
    if total_potential > 0:
        behavior.optimization_score = round((total_rewards / total_potential) * 100, 2)
    
    # Card usage distribution
    total_uses = sum(card_usage.values())
    if total_uses > 0:
        behavior.card_usage_distribution = {
            card_id: round((count / total_uses) * 100, 2)
            for card_id, count in card_usage.items()
        }
        behavior.most_used_card_id = max(card_usage, key=card_usage.get)
    
    behavior.learning_data_points = len(transactions)
    behavior.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(behavior)
    return behavior


# ============================================================================
# AUTOMATION RULE OPERATIONS
# ============================================================================

def create_automation_rule(
    db: Session,
    user_id: str,
    rule_name: str,
    condition_type: str,
    condition_value: Dict,
    action_card_id: str,
    rule_description: Optional[str] = None,
    priority: int = 0
) -> AutomationRule:
    """Create an automation rule"""
    rule = AutomationRule(
        user_id=user_id,
        rule_name=rule_name,
        rule_description=rule_description,
        condition_type=condition_type,
        condition_value=condition_value,
        action_card_id=action_card_id,
        priority=priority
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def get_user_automation_rules(
    db: Session,
    user_id: str,
    active_only: bool = True
) -> List[AutomationRule]:
    """Get automation rules for a user"""
    query = db.query(AutomationRule).filter(AutomationRule.user_id == user_id)
    if active_only:
        query = query.filter(AutomationRule.is_active == True)
    return query.order_by(desc(AutomationRule.priority)).all()


def trigger_automation_rule(db: Session, rule_id: int) -> bool:
    """Mark an automation rule as triggered"""
    rule = db.query(AutomationRule).filter(AutomationRule.rule_id == rule_id).first()
    if not rule:
        return False
    
    rule.times_triggered += 1
    rule.last_triggered = datetime.utcnow()
    db.commit()
    return True


# ============================================================================
# MERCHANT OPERATIONS
# ============================================================================

def create_merchant(
    db: Session,
    merchant_name: str,
    primary_category: CategoryEnum,
    secondary_categories: Optional[List[str]] = None,
    **kwargs
) -> Merchant:
    """Create a merchant"""
    merchant = Merchant(
        merchant_name=merchant_name,
        primary_category=primary_category,
        secondary_categories=secondary_categories or [],
        **kwargs
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    return merchant


def get_merchant_by_name(db: Session, merchant_name: str) -> Optional[Merchant]:
    """Get merchant by name"""
    return db.query(Merchant).filter(
        Merchant.merchant_name.ilike(f"%{merchant_name}%")
    ).first()


def get_or_create_merchant(
    db: Session,
    merchant_name: str,
    category: CategoryEnum
) -> Merchant:
    """Get existing merchant or create new one"""
    merchant = get_merchant_by_name(db, merchant_name)
    if not merchant:
        merchant = create_merchant(db, merchant_name, category)
    return merchant


# ============================================================================
# OFFER OPERATIONS
# ============================================================================

def get_active_offers(
    db: Session,
    card_id: Optional[str] = None,
    category: Optional[CategoryEnum] = None
) -> List[Offer]:
    """Get active offers with optional filters"""
    now = datetime.utcnow()
    query = db.query(Offer).filter(
        and_(
            Offer.is_active == True,
            Offer.start_date <= now,
            Offer.end_date >= now
        )
    )
    
    if card_id:
        query = query.filter(Offer.card_id == card_id)
    
    if category:
        query = query.filter(Offer.category == category)
    
    return query.all()


# ============================================================================
# AI MODEL METRICS OPERATIONS
# ============================================================================

def create_ai_metrics(
    db: Session,
    model_version: str,
    model_name: str,
    metrics_data: Dict,
    time_period: str = "daily"
) -> AIModelMetrics:
    """Record AI model performance metrics"""
    metrics = AIModelMetrics(
        model_version=model_version,
        model_name=model_name,
        metrics_data=metrics_data,
        time_period=time_period,
        **metrics_data
    )
    db.add(metrics)
    db.commit()
    db.refresh(metrics)
    return metrics


def get_latest_ai_metrics(
    db: Session,
    model_version: Optional[str] = None
) -> Optional[AIModelMetrics]:
    """Get the latest AI model metrics"""
    query = db.query(AIModelMetrics)
    if model_version:
        query = query.filter(AIModelMetrics.model_version == model_version)
    return query.order_by(desc(AIModelMetrics.metric_date)).first()


# ============================================================================
# ANALYTICS OPERATIONS
# ============================================================================

def get_user_analytics(
    db: Session,
    user_id: str,
    days: int = 30
) -> Dict:
    """
    Get comprehensive analytics for a user including:
    - Total savings and rewards
    - Best performing card
    - Category breakdown
    - Monthly trends
    - Optimization insights
    """
    # Get date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get all transactions in period
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
    ).all()
    
    # Get user's cards
    cards = get_user_cards(db, user_id, active_only=True)
    
    # Calculate basic stats
    total_transactions = len(transactions)
    total_spent = sum(t.amount for t in transactions)
    total_rewards = sum(t.total_value_earned or 0 for t in transactions)
    total_potential = sum(t.optimal_value or 0 for t in transactions)
    missed_value = sum(t.missed_value or 0 for t in transactions)
    
    # Calculate best performing card
    card_performance = {}
    for txn in transactions:
        if txn.recommended_card_id:
            card_id = txn.recommended_card_id
            if card_id not in card_performance:
                card_performance[card_id] = {
                    'total_value': 0,
                    'transaction_count': 0,
                    'total_spent': 0
                }
            card_performance[card_id]['total_value'] += txn.total_value_earned or 0
            card_performance[card_id]['transaction_count'] += 1
            card_performance[card_id]['total_spent'] += txn.amount
    
    best_card = None
    best_card_value = 0
    if card_performance:
        best_card_id = max(card_performance, key=lambda k: card_performance[k]['total_value'])
        best_card_data = card_performance[best_card_id]
        best_card_obj = get_card(db, best_card_id)
        if best_card_obj:
            best_card = {
                'card_id': best_card_id,
                'card_name': best_card_obj.card_name,
                'total_value': round(best_card_data['total_value'], 2),
                'transaction_count': best_card_data['transaction_count'],
                'avg_value_per_transaction': round(
                    best_card_data['total_value'] / best_card_data['transaction_count'], 2
                )
            }
            best_card_value = best_card_data['total_value']
    
    # Category breakdown
    category_breakdown = {}
    for txn in transactions:
        category = txn.category.value if txn.category else 'other'
        if category not in category_breakdown:
            category_breakdown[category] = {
                'count': 0,
                'total_spent': 0,
                'total_rewards': 0
            }
        category_breakdown[category]['count'] += 1
        category_breakdown[category]['total_spent'] += txn.amount
        category_breakdown[category]['total_rewards'] += txn.total_value_earned or 0
    
    # Sort categories by spending
    category_breakdown = dict(
        sorted(
            category_breakdown.items(),
            key=lambda x: x[1]['total_spent'],
            reverse=True
        )
    )
    
    # Monthly trend (group by week for 30-day period)
    weekly_trends = []
    current_week_start = start_date
    while current_week_start < end_date:
        week_end = min(current_week_start + timedelta(days=7), end_date)
        week_txns = [
            t for t in transactions
            if current_week_start <= t.transaction_date < week_end
        ]
        weekly_trends.append({
            'week_start': current_week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'transaction_count': len(week_txns),
            'total_spent': round(sum(t.amount for t in week_txns), 2),
            'total_rewards': round(sum(t.total_value_earned or 0 for t in week_txns), 2)
        })
        current_week_start = week_end
    
    # Optimization insights
    followed_recommendations = sum(1 for t in transactions if t.used_recommended_card)
    optimization_rate = (followed_recommendations / total_transactions * 100) if total_transactions > 0 else 0
    
    # Calculate potential additional savings if user followed all recommendations
    potential_additional_savings = missed_value
    
    # Top merchants
    merchant_spending = {}
    for txn in transactions:
        merchant = txn.merchant
        if merchant not in merchant_spending:
            merchant_spending[merchant] = {
                'count': 0,
                'total_spent': 0,
                'total_rewards': 0
            }
        merchant_spending[merchant]['count'] += 1
        merchant_spending[merchant]['total_spent'] += txn.amount
        merchant_spending[merchant]['total_rewards'] += txn.total_value_earned or 0
    
    top_merchants = sorted(
        merchant_spending.items(),
        key=lambda x: x[1]['total_spent'],
        reverse=True
    )[:5]
    
    return {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'days': days
        },
        'summary': {
            'total_transactions': total_transactions,
            'total_spent': round(total_spent, 2),
            'total_rewards_earned': round(total_rewards, 2),
            'total_potential_rewards': round(total_potential, 2),
            'missed_value': round(missed_value, 2),
            'optimization_rate': round(optimization_rate, 2),
            'avg_transaction_amount': round(total_spent / total_transactions, 2) if total_transactions > 0 else 0,
            'avg_rewards_per_transaction': round(total_rewards / total_transactions, 2) if total_transactions > 0 else 0
        },
        'best_card': best_card,
        'category_breakdown': {
            cat: {
                'count': data['count'],
                'total_spent': round(data['total_spent'], 2),
                'total_rewards': round(data['total_rewards'], 2),
                'avg_rewards_rate': round(
                    (data['total_rewards'] / data['total_spent'] * 100) if data['total_spent'] > 0 else 0,
                    2
                )
            }
            for cat, data in category_breakdown.items()
        },
        'weekly_trends': weekly_trends,
        'top_merchants': [
            {
                'merchant': merchant,
                'transaction_count': data['count'],
                'total_spent': round(data['total_spent'], 2),
                'total_rewards': round(data['total_rewards'], 2)
            }
            for merchant, data in top_merchants
        ],
        'insights': {
            'potential_additional_savings': round(potential_additional_savings, 2),
            'recommendation_follow_rate': round(optimization_rate, 2),
            'total_cards_owned': len(cards),
            'best_performing_card': best_card['card_name'] if best_card else None
        }
    }
