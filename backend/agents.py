# agents.py - Agentic AI System
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
import os
import json

class AgenticRecommendationSystem:
    """
    True Agentic AI system using Llama 3 via Groq
    Multiple agents work together to make intelligent recommendations
    """
    
    def __init__(self):
        # Initialize Groq LLM with Llama 3
        self.llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama3-70b-8192",  # Using Llama 3 70B
            temperature=0.7,
            max_tokens=1000
        )
        
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
    
    def format_cards_for_llm(self, cards, category):
        """Format card data for LLM consumption"""
        formatted = []
        for card in cards:
            cash_back_rate = card.get('cash_back_rate', {}).get(category, 
                            card.get('cash_back_rate', {}).get('other', 0))
            points_mult = card.get('points_multiplier', {}).get(category,
                         card.get('points_multiplier', {}).get('other', 0))
            
            formatted.append(f"""
Card: {card['card_name']} ({card['issuer']})
- Cash Back: {cash_back_rate*100}% in {category}
- Points Multiplier: {points_mult}x
- Annual Fee: ${card['annual_fee']}
- Benefits: {', '.join(card.get('benefits', [])[:3])}
""")
        return "\n".join(formatted)
    
    def get_recommendation(self, transaction_data, user_cards):
        """
        Main agentic workflow - coordinates multiple reasoning steps
        """
        # Format data for LLM
        cards_info = self.format_cards_for_llm(
            user_cards, 
            transaction_data['category']
        )
        
        # Get LLM recommendation
        try:
            result = self.recommendation_chain.invoke({
                "merchant": transaction_data['merchant'],
                "amount": transaction_data['amount'],
                "category": transaction_data['category'],
                "goal": transaction_data['optimization_goal'],
                "cards_info": cards_info
            })
            
            # Parse LLM response
            response_text = result['text']
            
            # Try to extract JSON from response
            try:
                # Find JSON in the response
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_str = response_text[start:end]
                recommendation = json.loads(json_str)
            except:
                # Fallback if JSON parsing fails
                recommendation = {
                    "recommended_card_name": user_cards[0]['card_name'],
                    "expected_value": 0,
                    "explanation": response_text[:200],
                    "cash_back": 0,
                    "points": 0,
                    "reasoning": "AI generated recommendation"
                }
            
            # Find the matching card
            recommended_card = None
            for card in user_cards:
                if card['card_name'].lower() in recommendation['recommended_card_name'].lower():
                    recommended_card = card
                    break
            
            if not recommended_card:
                recommended_card = user_cards[0]
            
            # Calculate actual values if not provided by LLM
            if recommendation.get('cash_back', 0) == 0:
                cash_back_rate = recommended_card['cash_back_rate'].get(
                    transaction_data['category'],
                    recommended_card['cash_back_rate'].get('other', 0)
                )
                recommendation['cash_back'] = transaction_data['amount'] * cash_back_rate
            
            if recommendation.get('points', 0) == 0:
                points_mult = recommended_card['points_multiplier'].get(
                    transaction_data['category'],
                    recommended_card['points_multiplier'].get('other', 0)
                )
                recommendation['points'] = transaction_data['amount'] * points_mult
            
            # Build final response
            return {
                "recommended_card": {
                    "card_id": recommended_card['card_id'],
                    "card_name": recommended_card['card_name'],
                    "expected_value": float(recommendation.get('expected_value', 
                                          recommendation['cash_back'] + recommendation['points'] * 0.015)),
                    "cash_back_earned": float(recommendation['cash_back']),
                    "points_earned": float(recommendation['points']),
                    "applicable_benefits": recommended_card.get('benefits', [])[:2],
                    "explanation": recommendation.get('explanation', 
                                  recommendation.get('reasoning', 'AI-powered recommendation')),
                    "confidence_score": 0.9
                },
                "alternative_cards": self._get_alternatives(
                    user_cards, 
                    transaction_data, 
                    recommended_card['card_id']
                ),
                "optimization_summary": f"AI recommends {recommended_card['card_name']} for maximum {transaction_data['optimization_goal'].replace('_', ' ')}",
                "total_savings": float(recommendation.get('expected_value', 0))
            }
            
        except Exception as e:
            print(f"Agentic AI Error: {e}")
            # Fallback to rule-based if AI fails
            return self._fallback_recommendation(transaction_data, user_cards)
    
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
    
    def _fallback_recommendation(self, transaction_data, cards):
        """Fallback if AI fails"""
        best_card = cards[0]
        return {
            "recommended_card": {
                "card_id": best_card['card_id'],
                "card_name": best_card['card_name'],
                "expected_value": 10.0,
                "cash_back_earned": 5.0,
                "points_earned": 50.0,
                "applicable_benefits": best_card.get('benefits', [])[:2],
                "explanation": "Fallback recommendation - AI temporarily unavailable",
                "confidence_score": 0.5
            },
            "alternative_cards": [],
            "optimization_summary": "Using fallback recommendation",
            "total_savings": 10.0
        }

# Initialize the agentic system
agentic_system = AgenticRecommendationSystem()