import json
import os
from typing import Any

from database import db
from models import Merchant, CategoryEnum


def load_merchants_from_json() -> Any:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "seed_data", "merchants.json")

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"merchants.json not found at {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_merchants() -> None:
    print("\n" + "=" * 60)
    print("🌱 Seeding merchants from JSON")
    print("=" * 60)

    merchants_data = load_merchants_from_json()

    with db.session_scope() as session:
        created_count = 0
        skipped_count = 0

        for m in merchants_data:
            name = m["merchant_name"]
            primary_category = m.get("primary_category", "other")

            # Ensure category is valid
            try:
                category_enum = CategoryEnum(primary_category)
            except ValueError:
                category_enum = CategoryEnum.OTHER

            existing = (
                session.query(Merchant)
                .filter(Merchant.merchant_name == name)
                .first()
            )
            if existing:
                skipped_count += 1
                print(f"   ⏭️  Skipping existing merchant: {name}")
                continue

            merchant = Merchant(
                merchant_name=name,
                primary_category=category_enum,
                secondary_categories=m.get("secondary_categories", []),
                website=None,
                logo_url=m.get("logo_url"),
                has_special_offers=False,
                special_offers=[],
            )
            session.add(merchant)
            created_count += 1
            print(f"   ✅ Created merchant: {name} ({primary_category})")

        print("\n" + "=" * 60)
        print(
            f"✨ Merchant seeding complete. Created: {created_count}, Skipped existing: {skipped_count}"
        )
        print("=" * 60 + "\n")


if __name__ == "__main__":
    seed_merchants()
