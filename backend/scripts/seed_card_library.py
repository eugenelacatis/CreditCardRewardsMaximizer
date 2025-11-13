import json
import os
from typing import Any, Dict

from database import db
from crud import create_user, create_credit_card, get_user_by_email
from models import CardIssuerEnum, OptimizationGoalEnum, CreditCard
from auth import hash_password


LIBRARY_USER_EMAIL = "card-library@example.com"
LIBRARY_USER_NAME = "Card Library"


def _map_issuer(issuer_name: str) -> CardIssuerEnum:
    normalized = issuer_name.strip().lower()
    if "chase" in normalized:
        return CardIssuerEnum.CHASE
    if "american express" in normalized or normalized == "amex":
        return CardIssuerEnum.AMEX
    if "citi" in normalized:
        return CardIssuerEnum.CITI
    if "capital one" in normalized:
        return CardIssuerEnum.CAPITAL_ONE
    if "discover" in normalized:
        return CardIssuerEnum.DISCOVER
    if "wells fargo" in normalized:
        return CardIssuerEnum.WELLS_FARGO
    if "bank of america" in normalized:
        return CardIssuerEnum.BANK_OF_AMERICA
    return CardIssuerEnum.OTHER


def load_card_library_from_json() -> Any:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "seed_data", "card_library.json")

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"card_library.json not found at {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def ensure_library_user(session) -> Any:
    user = get_user_by_email(session, LIBRARY_USER_EMAIL)
    if user:
        return user

    user = create_user(
        session,
        email=LIBRARY_USER_EMAIL,
        full_name=LIBRARY_USER_NAME,
        password_hash=hash_password("library_password"),
        phone=None,
        default_optimization_goal=OptimizationGoalEnum.BALANCED,
    )
    return user


def seed_card_library() -> None:
    print("\n" + "=" * 60)
    print("🌱 Seeding card library from JSON")
    print("=" * 60)

    cards_data = load_card_library_from_json()

    with db.session_scope() as session:
        user = ensure_library_user(session)
        print(f"Using library user: {user.email} (user_id={user.user_id})")

        created_count = 0
        skipped_count = 0

        for card in cards_data:
            try:
                issuer_enum = _map_issuer(card.get("issuer", "Other"))

                # Skip if this card already exists for the library user
                existing = (
                    session.query(CreditCard)
                    .filter(
                        CreditCard.user_id == user.user_id,
                        CreditCard.card_name == card["card_name"],
                        CreditCard.issuer == issuer_enum,
                    )
                    .first()
                )
                if existing:
                    skipped_count += 1
                    print(
                        f"   ⏭️  Skipping existing card: {card['card_name']} ({card.get('issuer')})"
                    )
                    continue

                create_credit_card(
                    session,
                    user_id=user.user_id,
                    card_name=card["card_name"],
                    issuer=issuer_enum,
                    cash_back_rate=card.get("cash_back_rate", {}),
                    points_multiplier=card.get("points_multiplier", {}),
                    annual_fee=card.get("annual_fee", 0.0),
                    benefits=card.get("benefits", []),
                )
                created_count += 1
                print(f"   ✅ Created library card: {card['card_name']} ({card.get('issuer')})")

            except Exception as exc:
                print(f"   ⚠️  Failed to create card '{card.get('card_name')}': {exc}")

        print("\n" + "=" * 60)
        print(
            f"✨ Card library seeding complete. Created: {created_count}, Skipped existing: {skipped_count}"
        )
        print("=" * 60 + "\n")


if __name__ == "__main__":
    seed_card_library()
