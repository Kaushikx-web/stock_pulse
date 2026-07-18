"""
Seed Supabase with realistic mock data.
Run: python seed.py
Skips if products table already has rows.

Data:
- 18 products across 4 categories
- 4 suppliers
- 60 days of sales_history (with weekend dips)
- 3 manufacturing runs per product (with cost inflation)
- 10 draft/sent purchase orders
"""
import os
import random
from datetime import date, timedelta, datetime, timezone
from database import get_db
from dotenv import load_dotenv

load_dotenv()
random.seed(42)

PRODUCTS = [
    ("Industrial Bearing 6205",  "Mechanical Parts",   12.50,  28.00),
    ("Hydraulic Seal Kit A",     "Mechanical Parts",   45.00,  95.00),
    ("Copper Wire Spool 2mm",    "Electrical",         38.00,  72.00),
    ("Circuit Breaker 20A",      "Electrical",         22.00,  55.00),
    ("LED Panel Light 40W",      "Electrical",         18.00,  42.00),
    ("Polypropylene Sheet 6mm",  "Raw Materials",       8.50,  19.00),
    ("Aluminum Rod 25mm",        "Raw Materials",      14.00,  32.00),
    ("Stainless Bolt M10x50",    "Fasteners",           0.85,   2.20),
    ("Hex Nut M10",              "Fasteners",           0.40,   1.10),
    ("Nylon Washer 10mm",        "Fasteners",           0.25,   0.75),
    ("Pneumatic Cylinder 80mm",  "Pneumatics",        185.00, 390.00),
    ("Air Filter Regulator",     "Pneumatics",         62.00, 135.00),
    ("Safety Valve 1/2in",       "Pneumatics",         28.00,  65.00),
    ("Anti-Static Gloves L",     "Safety Equipment",    6.50,  16.00),
    ("Hard Hat Class E",         "Safety Equipment",   18.00,  45.00),
    ("First Aid Kit Pro",        "Safety Equipment",   35.00,  80.00),
    ("Epoxy Adhesive 500ml",     "Chemicals",          22.00,  52.00),
    ("Solvent Cleaner 1L",       "Chemicals",          14.00,  34.00),
]

SUPPLIERS = [
    ("PrecisionParts Co.",    5,  0.960),
    ("GlobalSupply Ltd.",    12,  0.780),
    ("FastTrack Materials",   3,  0.880),
    ("EcoTech Distributors",  8,  0.820),
]

WAREHOUSES = ["WH-01", "WH-02", "WH-03"]

BASE_DAILY_DEMAND = {
    "Mechanical Parts": 8,
    "Electrical":       12,
    "Raw Materials":    25,
    "Fasteners":        80,
    "Pneumatics":        3,
    "Safety Equipment": 15,
    "Chemicals":        10,
}

REORDER_THRESHOLDS = {
    "Mechanical Parts": 80,
    "Electrical":       60,
    "Raw Materials":   150,
    "Fasteners":       500,
    "Pneumatics":       20,
    "Safety Equipment":100,
    "Chemicals":        40,
}


def seed():
    db = get_db()

    # Check if already seeded
    existing = db.table("products").select("id").limit(1).execute()
    if existing.data:
        print("Database already seeded — skipping.")
        return

    print("Seeding Supabase...")

    # ── 1. Suppliers ─────────────────────────────────────────────────────
    supplier_rows = [
        {"name": n, "lead_time_days": lt, "reliability_score": rel}
        for n, lt, rel in SUPPLIERS
    ]
    sup_res = db.table("suppliers").insert(supplier_rows).execute()
    suppliers = sup_res.data  # [{id, name, ...}, ...]
    print(f"  Inserted {len(suppliers)} suppliers")

    # ── 2. Products ──────────────────────────────────────────────────────
    product_rows = [
        {"name": name, "category": cat, "unit_cost": cost, "unit_price": price}
        for name, cat, cost, price in PRODUCTS
    ]
    prod_res = db.table("products").insert(product_rows).execute()
    products = prod_res.data
    print(f"  Inserted {len(products)} products")

    # ── 3. Inventory ─────────────────────────────────────────────────────
    inv_rows = []
    for p in products:
        cat = p["category"]
        thresh = REORDER_THRESHOLDS.get(cat, 50)
        high_thresh = thresh * 3
        # 30% below threshold for demo urgency
        if random.random() < 0.30:
            stock = random.randint(int(thresh * 0.1), int(thresh * 0.7))
        else:
            stock = random.randint(thresh, high_thresh)
        inv_rows.append({
            "product_id":        p["id"],
            "current_stock":     stock,
            "reorder_threshold": thresh,
            "warehouse_id":      random.choice(WAREHOUSES),
        })
    db.table("inventory").insert(inv_rows).execute()
    print(f"  Inserted {len(inv_rows)} inventory records")

    # ── 4. Sales History ─────────────────────────────────────────────────
    today = date.today()
    sales_rows = []
    for p in products:
        base = BASE_DAILY_DEMAND.get(p["category"], 10)
        for d in range(60, 0, -1):
            day = today - timedelta(days=d)
            dow = day.weekday()
            multiplier = 0.3 if dow >= 5 else max(0.1, 1.0 + random.gauss(0, 0.25))
            qty = max(0, int(base * multiplier))
            if qty == 0:
                continue
            rev = round(qty * p["unit_price"] * random.uniform(0.95, 1.05), 4)
            sales_rows.append({
                "product_id":    p["id"],
                "date":          str(day),
                "quantity_sold": qty,
                "revenue":       rev,
            })

    # Supabase insert in chunks of 500 to avoid payload limits
    for i in range(0, len(sales_rows), 500):
        db.table("sales_history").insert(sales_rows[i:i+500]).execute()
    print(f"  Inserted {len(sales_rows)} sales history rows")

    # ── 5. Manufacturing Runs ─────────────────────────────────────────────
    mfg_rows = []
    for p in products:
        for cycle in range(3):
            run_date = today - timedelta(days=random.randint(10 + cycle*20, 25 + cycle*20))
            qty = random.randint(200, 800)
            # Cost inflation on later cycles to demonstrate margin pressure
            cost_per_unit = float(p["unit_cost"]) * (1 + cycle * 0.05)
            mfg_rows.append({
                "product_id":        p["id"],
                "run_date":          str(run_date),
                "quantity_produced": qty,
                "cost":              round(qty * cost_per_unit, 4),
            })
    db.table("manufacturing_runs").insert(mfg_rows).execute()
    print(f"  Inserted {len(mfg_rows)} manufacturing run rows")

    # ── 6. Purchase Orders ────────────────────────────────────────────────
    statuses = ["draft", "draft", "draft", "sent", "sent", "received"]
    po_rows = []
    for i, p in enumerate(products[:10]):
        sup = suppliers[i % len(suppliers)]
        deadline = (datetime.now(timezone.utc) + timedelta(days=random.randint(3, 21))).isoformat()
        qty = random.randint(100, 500)
        po_rows.append({
            "product_id":  p["id"],
            "supplier_id": sup["id"],
            "quantity":    qty,
            "deadline":    deadline,
            "status":      random.choice(statuses),
            "priority_score": round(random.uniform(0.3, 0.95), 4),
            "draft_text": (
                f"Purchase Order for {p['name']}\n"
                f"Supplier: {sup['name']}\n"
                f"Quantity: {qty} units\n"
                f"Estimated Cost: ${round(qty * float(p['unit_cost']), 2):,.2f}\n"
                f"Lead Time: {sup['lead_time_days']} days"
            ),
        })
    db.table("purchase_orders").insert(po_rows).execute()
    print(f"  Inserted {len(po_rows)} purchase orders")

    print("\nDone! Seeding complete.")


if __name__ == "__main__":
    seed()
