# agents.py - Agentic AI System
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
import os
import json
import time
from typing import Dict, List, Optional, Tuple
from models import OptimizationGoalEnum, CategoryEnum
from groq import RateLimitError

# Import observability components
from logging_config import get_ai_logger
from metrics import track_ai_request, track_recommendation

logger = get_ai_logger()


class RateLimitHandler:
    """
    Intelligent rate limit handler for Groq API.
    Differentiates between recoverable and non-recoverable rate limits.
    """
    
    @staticmethod
    def parse_rate_limit_error(error_message: str) -> Dict:
        """
        Parse Groq rate limit error to determine type and wait time.
        
        Returns:
            Dict with keys: 'type', 'is_recoverable', 'wait_seconds', 'message'
        """
        error_lower = error_message.lower()
        
        # Check for daily token limit (non-recoverable)
        if 'tokens per day' in error_lower or 'tpd' in error_lower:
            return {
                'type': 'daily_token_limit',
                'is_recoverable': False,
                'wait_seconds': None,
                'message': 'Daily token limit reached. Service unavailable until reset.'
            }
        
        # Check for requests per minute (recoverable)
        if 'requests per minute' in error_lower or 'rpm' in error_lower:
            # Try to extract wait time from error message
            wait_seconds = 60  # Default to 60 seconds
            
            # Look for "try again in Xm Ys" pattern
            import re
            time_match = re.search(r'try again in (\d+)m(\d+)', error_message)
            if time_match:
                minutes = int(time_match.group(1))
                seconds = int(time_match.group(2).split('.')[0])
                wait_seconds = minutes * 60 + seconds
            
            return {
                'type': 'requests_per_minute',
                'is_recoverable': True,
                'wait_seconds': wait_seconds,
                'message': f'Rate limit: too many requests. Retrying in {wait_seconds}s.'
            }
        
        # Unknown rate limit type - treat as recoverable with short wait
        return {
            'type': 'unknown',
            'is_recoverable': True,
            'wait_seconds': 30,
            'message': 'Rate limit encountered. Retrying in 30s.'
        }
    
    @staticmethod
    def should_retry(error_info: Dict, attempt: int, max_retries: int = 3) -> bool:
        """
        Determine if we should retry based on error type and attempt count.
        """
        if not error_info['is_recoverable']:
            return False
        
        if attempt >= max_retries:
            return False
        
        return True
    
    @staticmethod
    def wait_with_backoff(error_info: Dict, attempt: int):
        """
        Wait with exponential backoff for recoverable errors.
        """
        base_wait = error_info.get('wait_seconds', 60)
        # Exponential backoff: base_wait * (1.5 ^ attempt)
        wait_time = base_wait * (1.5 ** attempt)
        
        logger.warning(f"Rate limit hit (attempt {attempt + 1}). Waiting {wait_time:.1f}s...")
        time.sleep(wait_time)

class AgenticRecommendationSystem:
    """
    True Agentic AI system using Llama 3 via Groq
    Multiple agents work together to make intelligent recommendations
    """
    
    def __init__(self):
        # Initialize Groq LLM with Llama 3 (lazy initialization)
        self.llm = None
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # Only initialize if API key is present
        if self.groq_api_key:
            try:
                self.llm = ChatGroq(
                    api_key=self.groq_api_key,
                    model_name="llama-3.3-70b-versatile",  # Using Llama 3 70B
                    temperature=0.7,
                    max_tokens=1000
                )
                logger.info("Groq AI initialized successfully", extra={
                    'event': 'ai_init',
                    'model': 'llama-3.3-70b-versatile',
                    'status': 'success'
                })
            except Exception as e:
                logger.error("Could not initialize Groq AI", extra={
                    'event': 'ai_init',
                    'status': 'failed',
                    'error': str(e)
                })
                self.llm = None
        else:
            logger.error("GROQ_API_KEY not found in environment", extra={
                'event': 'ai_init',
                'status': 'failed',
                'error': 'missing_api_key'
            })
        
        # Only create prompt and chain if LLM is available
        self.recommendation_prompt = None
        self.recommendation_chain = None
        
        if self.llm:
            # Define the main recommendation prompt
            self.recommendation_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert financial advisor specializing in credit card rewards optimization.
                You analyze credit cards and make intelligent recommendations based on user goals.
                
                Your job is to:
                1. Analyze each card's rewards structure
                2. Consider the user's optimization goal
                3. Factor in applicable benefits and offers
                4. Provide a clear, actionable recommendation
                5. Explain your reasoning in 2-3 sentences
                
                Be conversational, helpful, and confident in your recommendation."""),
                
                ("user", """Transaction Details:
Merchant: {merchant}
Amount: ${amount}
Category: {category}
User's Goal: {goal}

Available Credit Cards:
{cards_info}

Based on this information, which card should the user use and why?
Provide your response as JSON with this structure:
{{
    "recommended_card_name": "card name",
    "expected_value": calculated_value_as_float,
    "explanation": "2-3 sentence explanation",
    "cash_back": cash_back_amount,
    "points": points_earned,
    "reasoning": "why this is the best choice"
}}""")
            ])
            
            # Create the chain
            self.recommendation_chain = LLMChain(
                llm=self.llm,
                prompt=self.recommendation_prompt
            )
    
    def format_cards_for_llm(self, cards: List[Dict], category: str) -> str:
        """Format card data for LLM consumption"""
        formatted = []
        # Normalize category to enum value
        category_key = category.lower() if isinstance(category, str) else category
        
        for card in cards:
            cash_back_rate = card.get('cash_back_rate', {}).get(category_key, 
                            card.get('cash_back_rate', {}).get('other', 0))
            points_mult = card.get('points_multiplier', {}).get(category_key,
                         card.get('points_multiplier', {}).get('other', 0))
            
            formatted.append(f"""
Card: {card['card_name']} ({card['issuer']})
- Cash Back: {cash_back_rate*100}% in {category}
- Points Multiplier: {points_mult}x
- Annual Fee: ${card['annual_fee']}
- Benefits: {', '.join(card.get('benefits', [])[:3])}
""")
        return "\n".join(formatted)
    
    def calculate_card_value(
        self, 
        card: Dict, 
        amount: float, 
        category: str, 
        goal: str
    ) -> Tuple[float, Dict]:
        """
        Calculate weighted value for a card based on optimization goal
        
        Args:
            card: Card dictionary with rewards structure
            amount: Transaction amount
            category: Transaction category
            goal: Optimization goal (cash_back, travel_points, balanced, specific_discounts)
            
        Returns:
            Tuple of (total_value, breakdown_dict)
        """
        category_key = category.lower() if isinstance(category, str) else category
        
        # Get rewards for this category
        cash_back_rate = card.get('cash_back_rate', {}).get(category_key, 
                        card.get('cash_back_rate', {}).get('other', 0))
        points_mult = card.get('points_multiplier', {}).get(category_key,
                     card.get('points_multiplier', {}).get('other', 0))
        
        # Calculate raw values
        cash_back = amount * cash_back_rate
        points = amount * points_mult
        points_value = points * 0.015  # 1 point = $0.015
        benefits_count = len(card.get('benefits', []))
        benefits_value = benefits_count * 2.0  # Each benefit worth ~$2
        
        # Define weights based on optimization goal
        if goal == "cash_back":
            weights = {"cash": 1.0, "points": 0.1, "benefits": 0.5}
        elif goal == "travel_points":
            weights = {"cash": 0.1, "points": 1.0, "benefits": 0.5}
        elif goal == "specific_discounts":
            weights = {"cash": 0.3, "points": 0.3, "benefits": 2.5}  # 2.5x for benefits
        elif goal == "balanced":
            weights = {"cash": 0.5, "points": 0.5, "benefits": 0.5}
        else:
            # Default to balanced
            weights = {"cash": 0.5, "points": 0.5, "benefits": 0.5}
            logger.warning(f"Unknown optimization goal: {goal}, using balanced weights")
        
        # Calculate weighted total value
        total_value = (
            weights["cash"] * cash_back +
            weights["points"] * points_value +
            weights["benefits"] * benefits_value
        )
        
        # Return value and breakdown for explanation
        breakdown = {
            "cash_back": cash_back,
            "points": points,
            "points_value": points_value,
            "benefits_count": benefits_count,
            "benefits_value": benefits_value,
            "weights": weights,
            "total_value": total_value
        }
        
        return total_value, breakdown
    
    def get_recommendation(self, transaction_data: Dict, user_cards: List[Dict]) -> Dict:
        """
        Main agentic workflow - coordinates multiple reasoning steps
        
        Args:
            transaction_data: Dict with keys: merchant, amount, category, optimization_goal
            user_cards: List of card dictionaries
            
        Returns:
            Dict with recommendation details
        """
        # Input validation
        start_time = time.time()
        logger.info("Processing recommendation request", extra={
            'event': 'recommendation_start',
            'merchant': transaction_data.get('merchant', 'Unknown'),
            'amount': transaction_data.get('amount', 0),
            'category': transaction_data.get('category', 'unknown'),
            'goal': transaction_data.get('optimization_goal', 'balanced')
        })
        
        # Validate user has cards
        if not user_cards or len(user_cards) == 0:
            logger.warning("No cards available for recommendation")
            return {
                "error": "No cards available",
                "message": "Please add at least one credit card to get recommendations.",
                "recommended_card": None
            }
        
        # Validate amount
        amount = transaction_data.get('amount', 0)
        if amount < 0:
            logger.error(f"Invalid negative amount: {amount}")
            return {
                "error": "Invalid amount",
                "message": "Transaction amount cannot be negative.",
                "recommended_card": None
            }
        
        if amount == 0:
            logger.info("Zero amount transaction")
            return {
                "recommended_card": {
                    "card_name": "Any card",
                    "explanation": "No rewards earned on $0 transactions. Any card works.",
                    "expected_value": 0,
                    "cash_back_earned": 0,
                    "points_earned": 0
                },
                "optimization_summary": "No rewards for $0 transaction"
            }
        
        # Validate and normalize category
        category = transaction_data.get('category', 'other').lower()
        valid_categories = [e.value for e in CategoryEnum]
        if category not in valid_categories:
            logger.warning(f"Invalid category '{category}', defaulting to 'other'")
            transaction_data['category'] = 'other'
        
        # Calculate weighted scores for all cards
        logger.info("Calculating weighted scores for all cards")
        card_scores = []
        for card in user_cards:
            value, breakdown = self.calculate_card_value(
                card,
                transaction_data['amount'],
                transaction_data['category'],
                transaction_data['optimization_goal']
            )
            card_scores.append({
                "card": card,
                "value": value,
                "breakdown": breakdown
            })
        
        # Sort by value (descending)
        card_scores.sort(key=lambda x: x['value'], reverse=True)
        logger.info(f"Top card by calculation: {card_scores[0]['card']['card_name']} (${card_scores[0]['value']:.2f})")
        
        # If no LLM available, raise error - NO FALLBACK
        if not self.llm:
            logger.error("Groq AI not available - cannot provide recommendations")
            raise RuntimeError("AI service unavailable. Please ensure GROQ_API_KEY is configured and the service is operational.")
        
        # Get top 3 cards for AI analysis
        top_cards = card_scores[:3]
        
        # Format top cards for LLM with their calculated scores
        cards_info_with_scores = []
        for i, item in enumerate(top_cards, 1):
            card = item['card']
            breakdown = item['breakdown']
            cards_info_with_scores.append(f"""
Rank #{i}: {card['card_name']} ({card['issuer']})
- Calculated Value: ${item['value']:.2f}
- Cash Back: ${breakdown['cash_back']:.2f} ({breakdown['cash_back']/transaction_data['amount']*100:.1f}%)
- Points: {breakdown['points']:.0f} points (${breakdown['points_value']:.2f} value)
- Benefits: {breakdown['benefits_count']} ({', '.join(card.get('benefits', [])[:3])})
- Annual Fee: ${card['annual_fee']}
""")
        
        cards_info = "\n".join(cards_info_with_scores)
        
        # Get LLM recommendation with intelligent retry logic
        logger.info("Requesting AI explanation for top recommendation")
        result = self._invoke_llm_with_retry({
            "merchant": transaction_data['merchant'],
            "amount": transaction_data['amount'],
            "category": transaction_data['category'],
            "goal": transaction_data['optimization_goal'],
            "cards_info": cards_info
        })
        
        # Use top card from calculation (AI just provides explanation)
        best_card_data = card_scores[0]
        best_card = best_card_data['card']
        best_breakdown = best_card_data['breakdown']
        
        # Parse AI explanation
        response_text = result['text']
        ai_explanation = response_text.strip()
        
        # Build enhanced explanation with comparisons
        enhanced_explanation = self._build_enhanced_explanation(
            card_scores[:3],  # Top 3 cards
            transaction_data,
            ai_explanation
        )
        
        # Track metrics
        duration = time.time() - start_time
        track_ai_request(
            model='llama-3.3-70b-versatile',
            operation='recommendation',
            duration=duration,
            success=True
        )
        track_recommendation(success=True, savings=best_card_data['value'])

        logger.info("Recommendation complete", extra={
            'event': 'recommendation_complete',
            'card_name': best_card['card_name'],
            'expected_value': round(best_card_data['value'], 2),
            'duration_ms': round(duration * 1000, 2)
        })

        # Build final response
        return {
            "recommended_card": {
                "card_id": best_card['card_id'],
                "card_name": best_card['card_name'],
                "expected_value": round(best_card_data['value'], 2),
                "cash_back_earned": round(best_breakdown['cash_back'], 2),
                "points_earned": round(best_breakdown['points'], 2),
                "applicable_benefits": best_card.get('benefits', [])[:2],
                "explanation": enhanced_explanation,
                "confidence_score": 0.95  # Higher confidence with calculation
            },
            "alternative_cards": self._build_alternatives_from_scores(card_scores[1:3]),
            "optimization_summary": f"Best choice for {transaction_data['optimization_goal'].replace('_', ' ')}: {best_card['card_name']} (${best_card_data['value']:.2f} value)",
            "total_savings": round(best_card_data['value'], 2)
        }
    
    def _invoke_llm_with_retry(self, input_data: Dict, max_retries: int = 3) -> Dict:
        """
        Invoke LLM with intelligent retry logic for rate limits.
        
        Args:
            input_data: Input data for the LLM chain
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            LLM response dictionary
            
        Raises:
            RuntimeError: For non-recoverable errors or max retries exceeded
        """
        rate_limit_handler = RateLimitHandler()
        
        for attempt in range(max_retries + 1):
            try:
                result = self.recommendation_chain.invoke(input_data)
                
                # Success - log if this was a retry
                if attempt > 0:
                    logger.info(f"Successfully recovered after {attempt} retry attempt(s)")
                
                return result
                
            except RateLimitError as e:
                error_message = str(e)
                logger.warning(f"Rate limit error on attempt {attempt + 1}: {error_message}")
                
                # Parse the error to determine if recoverable
                error_info = rate_limit_handler.parse_rate_limit_error(error_message)
                
                # Check if we should retry
                if not rate_limit_handler.should_retry(error_info, attempt, max_retries):
                    if not error_info['is_recoverable']:
                        # Non-recoverable error (daily token limit)
                        logger.error(f"Non-recoverable rate limit: {error_info['message']}")
                        raise RuntimeError(
                            f"AI service unavailable: {error_info['message']} "
                            "Please try again later or contact support."
                        )
                    else:
                        # Max retries exceeded
                        logger.error(f"Max retries ({max_retries}) exceeded for rate limit")
                        raise RuntimeError(
                            f"AI service temporarily unavailable after {max_retries} retry attempts. "
                            "Please try again in a few minutes."
                        )
                
                # Recoverable error - wait and retry
                logger.info(f"Recoverable rate limit: {error_info['message']}")
                rate_limit_handler.wait_with_backoff(error_info, attempt)
                
            except Exception as e:
                # Non-rate-limit error - propagate immediately
                logger.error(f"Non-rate-limit error in LLM invocation: {e}")
                raise RuntimeError(f"AI service error: {str(e)}")
        
        # Should never reach here, but just in case
        raise RuntimeError("Unexpected error in LLM retry logic")
    
    def _build_enhanced_explanation(
        self, 
        top_cards: List[Dict], 
        transaction_data: Dict, 
        ai_explanation: str
    ) -> str:
        """
        Build enhanced explanation with card comparisons
        Format: "Chase Sapphire earns 3x points (900 points = $13.50) vs. Citi 2% ($20)"
        """
        if len(top_cards) == 0:
            return ai_explanation
        
        best = top_cards[0]
        best_card = best['card']
        best_breakdown = best['breakdown']
        
        # Build comparison string
        comparison_parts = []
        comparison_parts.append(
            f"{best_card['card_name']} earns ${best_breakdown['cash_back']:.2f} cash back"
        )
        
        if best_breakdown['points'] > 0:
            comparison_parts.append(
                f"{best_breakdown['points']:.0f} points (${best_breakdown['points_value']:.2f} value)"
            )
        
        # Add comparisons with alternatives
        if len(top_cards) > 1:
            comparisons = []
            for alt in top_cards[1:]:
                alt_card = alt['card']
                alt_breakdown = alt['breakdown']
                
                if alt_breakdown['cash_back'] > 0:
                    comparisons.append(
                        f"{alt_card['card_name']} ${alt_breakdown['cash_back']:.2f} cash back"
                    )
                if alt_breakdown['points'] > 0:
                    comparisons.append(
                        f"{alt_breakdown['points']:.0f} points"
                    )
            
            if comparisons:
                comparison_parts.append(f"vs. {' and '.join(comparisons[:2])}")
        
        enhanced = " ".join(comparison_parts) + ". "
        
        # Add AI explanation if available and meaningful
        if ai_explanation and len(ai_explanation) > 20:
            enhanced += ai_explanation[:300]  # Limit AI explanation length
        
        return enhanced
    
    def _build_alternatives_from_scores(self, card_scores: List[Dict]) -> List[Dict]:
        """Build alternative cards list from calculated scores"""
        alternatives = []
        for item in card_scores:
            card = item['card']
            breakdown = item['breakdown']
            alternatives.append({
                "card_id": card['card_id'],
                "card_name": card['card_name'],
                "expected_value": round(item['value'], 2),
                "cash_back_earned": round(breakdown['cash_back'], 2),
                "points_earned": round(breakdown['points'], 2),
                "applicable_benefits": card.get('benefits', [])[:2],
                "explanation": f"Alternative earning ${item['value']:.2f} total value",
                "confidence_score": 0.85
            })
        return alternatives
    
    def _fallback_recommendation_with_scores(
        self, 
        transaction_data: Dict, 
        card_scores: List[Dict]
    ) -> Dict:
        """Fallback recommendation using pre-calculated scores"""
        if not card_scores:
            return self._fallback_recommendation(transaction_data, [])
        
        best = card_scores[0]
        best_card = best['card']
        best_breakdown = best['breakdown']
        
        # Build explanation
        explanation = self._build_enhanced_explanation(
            card_scores[:3],
            transaction_data,
            f"Rule-based recommendation for {transaction_data['category']} purchases."
        )
        
        return {
            "recommended_card": {
                "card_id": best_card['card_id'],
                "card_name": best_card['card_name'],
                "expected_value": round(best['value'], 2),
                "cash_back_earned": round(best_breakdown['cash_back'], 2),
                "points_earned": round(best_breakdown['points'], 2),
                "applicable_benefits": best_card.get('benefits', [])[:2],
                "explanation": explanation,
                "confidence_score": 0.80
            },
            "alternative_cards": self._build_alternatives_from_scores(card_scores[1:3]),
            "optimization_summary": f"Best value for {transaction_data['optimization_goal'].replace('_', ' ')}: {best_card['card_name']}",
            "total_savings": round(best['value'], 2)
        }
    
    def _get_alternatives(self, cards, transaction_data, exclude_card_id):
        """Get alternative card recommendations"""
        alternatives = []
        for card in cards:
            if card['card_id'] == exclude_card_id:
                continue
            
            cash_back_rate = card['cash_back_rate'].get(
                transaction_data['category'],
                card['cash_back_rate'].get('other', 0)
            )
            points_mult = card['points_multiplier'].get(
                transaction_data['category'],
                card['points_multiplier'].get('other', 0)
            )
            
            cash_back = transaction_data['amount'] * cash_back_rate
            points = transaction_data['amount'] * points_mult
            value = cash_back + (points * 0.015)
            
            alternatives.append({
                "card_id": card['card_id'],
                "card_name": card['card_name'],
                "expected_value": round(value, 2),
                "cash_back_earned": round(cash_back, 2),
                "points_earned": round(points, 2),
                "applicable_benefits": card.get('benefits', [])[:2],
                "explanation": f"Alternative option earning ${value:.2f}",
                "confidence_score": 0.7
            })
        
        return sorted(alternatives, key=lambda x: x['expected_value'], reverse=True)[:2]
    
    def _fallback_recommendation(self, transaction_data: Dict, cards: List[Dict]) -> Dict:
        """Fallback rule-based recommendation when AI is unavailable"""
        # Calculate value for each card
        card_values = []
        category = transaction_data['category'].lower() if isinstance(transaction_data['category'], str) else transaction_data['category']
        amount = transaction_data['amount']
        
        for card in cards:
            cash_back_rate = card.get('cash_back_rate', {}).get(category, 
                            card.get('cash_back_rate', {}).get('other', 0))
            points_mult = card.get('points_multiplier', {}).get(category,
                         card.get('points_multiplier', {}).get('other', 0))
            
            cash_back = amount * cash_back_rate
            points = amount * points_mult
            value = cash_back + (points * 0.015)  # 1 point = $0.015
            
            card_values.append({
                "card": card,
                "cash_back": cash_back,
                "points": points,
                "value": value
            })
        
        # Sort by value
        card_values.sort(key=lambda x: x['value'], reverse=True)
        best = card_values[0]
        
        return {
            "recommended_card": {
                "card_id": best['card']['card_id'],
                "card_name": best['card']['card_name'],
                "expected_value": round(best['value'], 2),
                "cash_back_earned": round(best['cash_back'], 2),
                "points_earned": round(best['points'], 2),
                "applicable_benefits": best['card'].get('benefits', [])[:2],
                "explanation": f"Rule-based recommendation: {best['card']['card_name']} offers the best value for {category} purchases with ${best['value']:.2f} in rewards.",
                "confidence_score": 0.75
            },
            "alternative_cards": [
                {
                    "card_id": alt['card']['card_id'],
                    "card_name": alt['card']['card_name'],
                    "expected_value": round(alt['value'], 2),
                    "cash_back_earned": round(alt['cash_back'], 2),
                    "points_earned": round(alt['points'], 2),
                    "applicable_benefits": alt['card'].get('benefits', [])[:2],
                    "explanation": f"Alternative earning ${alt['value']:.2f}",
                    "confidence_score": 0.7
                }
                for alt in card_values[1:3]
            ],
            "optimization_summary": f"For ${amount:.2f} at {transaction_data.get('merchant', 'this merchant')}, use {best['card']['card_name']} (rule-based recommendation)",
            "total_savings": round(best['value'], 2)
        }

# Initialize the agentic system
agentic_system = AgenticRecommendationSystem()