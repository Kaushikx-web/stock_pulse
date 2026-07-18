"""Analytics router — user-scoped via auth_deps. All math is pure Python."""
from datetime import timedelta, date
from fastapi import APIRouter, Depends
from supabase import Client
from database import get_db
from auth_deps import get_user_id
from agents.pnl_analyst import compute_pnl, generate_insights

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/pnl")
def get_pnl(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Per-product P&L scoped to the logged-in user."""
    products = db.table("products").select("*").eq("user_id", uid).execute().data

    pnl_list = []
    for p in products:
        pid = p["id"]

        sales_res = db.table("sales_history").select(
            "date, quantity_sold, revenue"
        ).eq("product_id", pid).eq("user_id", uid).execute()

        mfg_res = db.table("manufacturing_runs").select(
            "run_date, quantity_produced, cost"
        ).eq("product_id", pid).eq("user_id", uid).execute()

        if not sales_res.data and not mfg_res.data:
            continue

        pnl = compute_pnl(pid, sales_res.data, mfg_res.data)
        pnl["product_name"] = p["name"]
        pnl["category"] = p["category"]
        pnl_list.append(pnl)

    pnl_list.sort(key=lambda x: x["profit"], reverse=True)

    insights = generate_insights(pnl_list)
    for pnl in pnl_list:
        pnl["ai_insight"] = insights.get(str(pnl["product_id"]), "")

    return {"products": pnl_list}


@router.get("/dashboard")
def dashboard_stats(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Overview numbers for the dashboard — scoped to the logged-in user."""

    # ── 1. Inventory stats ───────────────────────────────────────────────────
    inv_res = db.table("inventory").select(
        "id, product_id, current_stock, reorder_threshold, warehouse_id, products(name)"
    ).eq("user_id", uid).execute()
    inventory_count = len(inv_res.data)
    low_stock_count = sum(
        1 for r in inv_res.data if r["current_stock"] < r["reorder_threshold"]
    )
    alerts = [
        {
            "product_name":      (r.get("products") or {}).get("name", f"Product #{r['product_id']}"),
            "current_stock":     r["current_stock"],
            "reorder_threshold": r["reorder_threshold"],
            "warehouse_id":      r.get("warehouse_id", "—"),
            "shortfall":         r["reorder_threshold"] - r["current_stock"],
        }
        for r in inv_res.data
        if r["current_stock"] < r["reorder_threshold"]
    ][:5]

    # ── 2. Purchase orders ───────────────────────────────────────────────────
    po_res = db.table("purchase_orders").select("id").in_(
        "status", ["draft", "sent"]
    ).eq("user_id", uid).execute()
    pending_po_count = len(po_res.data)

    # ── 3. Products ──────────────────────────────────────────────────────────
    prod_res = db.table("products").select("id, name, category, unit_cost, unit_price").eq("user_id", uid).execute()
    total_products = len(prod_res.data)
    product_map = {p["id"]: p for p in prod_res.data}

    # Category breakdown
    categories: dict = {}
    for p in prod_res.data:
        cat = p.get("category") or "Unknown"
        categories[cat] = categories.get(cat, 0) + 1

    # ── 4. Suppliers ─────────────────────────────────────────────────────────
    sup_res = db.table("suppliers").select("id").eq("user_id", uid).execute()
    supplier_count = len(sup_res.data)

    # ── 5. Sales history — ALL time ──────────────────────────────────────────
    sales_res = db.table("sales_history").select(
        "product_id, quantity_sold, revenue, date"
    ).eq("user_id", uid).execute()

    rev_by_product: dict = {}
    total_all_time_revenue = 0.0
    for r in sales_res.data:
        pid = r["product_id"]
        rev = float(r["revenue"])
        total_all_time_revenue += rev
        if pid not in rev_by_product:
            rev_by_product[pid] = {"revenue": 0.0, "qty": 0}
        rev_by_product[pid]["revenue"] += rev
        rev_by_product[pid]["qty"] += r["quantity_sold"]

    perf = []
    for pid, d in rev_by_product.items():
        prod = product_map.get(pid, {})
        unit_cost  = float(prod.get("unit_cost")  or 0)
        unit_price = float(prod.get("unit_price") or 0)
        margin_pct = round(((unit_price - unit_cost) / unit_price * 100), 1) if unit_price > 0 else 0
        perf.append({
            "product_id":    pid,
            "product_name":  prod.get("name", f"Product #{pid}"),
            "category":      prod.get("category", ""),
            "total_revenue": round(d["revenue"], 2),
            "total_qty":     d["qty"],
            "margin_pct":    margin_pct,
        })
    perf.sort(key=lambda x: x["total_revenue"], reverse=True)

    # ── 6. Daily revenue trend — last 30 days for the chart ─────────────────
    cutoff = str(date.today() - timedelta(days=30))
    daily: dict = {}
    for r in sales_res.data:
        if r["date"] >= cutoff:
            d = r["date"]
            daily[d] = daily.get(d, 0.0) + float(r["revenue"])

    daily_trend = [
        {"date": d, "revenue": round(rev, 2)}
        for d, rev in sorted(daily.items())
    ]

    return {
        "low_stock_count":          low_stock_count,
        "pending_po_count":         pending_po_count,
        "total_products":           total_products,
        "inventory_count":          inventory_count,
        "supplier_count":           supplier_count,
        "total_all_time_revenue":   round(total_all_time_revenue, 2),
        "categories":               categories,
        "top_products":             perf[:5],
        "bottom_products":          perf[-5:] if len(perf) >= 5 else perf,
        "recent_alerts":            alerts,
        "daily_revenue_trend":      daily_trend,
    }
