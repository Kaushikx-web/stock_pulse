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

    # Low-stock count (user's inventory only)
    inv_res = db.table("inventory").select(
        "current_stock, reorder_threshold"
    ).eq("user_id", uid).execute()
    low_stock_count = sum(
        1 for r in inv_res.data if r["current_stock"] < r["reorder_threshold"]
    )

    # Pending PO count (user's POs only)
    po_res = db.table("purchase_orders").select("id").in_(
        "status", ["draft", "sent"]
    ).eq("user_id", uid).execute()
    pending_po_count = len(po_res.data)

    # Total products (user's only)
    prod_res = db.table("products").select("id, name, category").eq("user_id", uid).execute()
    total_products = len(prod_res.data)
    product_map = {p["id"]: p for p in prod_res.data}

    # Revenue by product — last 30 days (user's sales only)
    cutoff = str(date.today() - timedelta(days=30))
    sales_res = db.table("sales_history").select(
        "product_id, quantity_sold, revenue, date"
    ).gte("date", cutoff).eq("user_id", uid).execute()

    rev_by_product: dict = {}
    for r in sales_res.data:
        pid = r["product_id"]
        if pid not in rev_by_product:
            rev_by_product[pid] = {"revenue": 0.0, "qty": 0}
        rev_by_product[pid]["revenue"] += float(r["revenue"])
        rev_by_product[pid]["qty"] += r["quantity_sold"]

    perf = sorted(
        [
            {
                "product_id":    pid,
                "product_name":  product_map.get(pid, {}).get("name", ""),
                "category":      product_map.get(pid, {}).get("category", ""),
                "total_revenue": round(d["revenue"], 2),
                "total_qty":     d["qty"],
            }
            for pid, d in rev_by_product.items()
        ],
        key=lambda x: x["total_revenue"],
        reverse=True,
    )

    # Low-stock alerts (top 5, user's only)
    inv_full = db.table("inventory").select(
        "id, product_id, current_stock, reorder_threshold, warehouse_id, products(name)"
    ).eq("user_id", uid).execute()
    alerts = [
        {
            "product_name":      (r.get("products") or {}).get("name", ""),
            "current_stock":     r["current_stock"],
            "reorder_threshold": r["reorder_threshold"],
            "warehouse_id":      r["warehouse_id"],
            "shortfall":         r["reorder_threshold"] - r["current_stock"],
        }
        for r in inv_full.data
        if r["current_stock"] < r["reorder_threshold"]
    ][:5]

    # Daily revenue trend — last 30 days (user's only)
    daily: dict = {}
    for r in sales_res.data:
        d = r["date"]
        daily[d] = daily.get(d, 0.0) + float(r["revenue"])

    daily_trend = [
        {"date": d, "revenue": round(rev, 2)}
        for d, rev in sorted(daily.items())
    ]

    return {
        "low_stock_count":     low_stock_count,
        "pending_po_count":    pending_po_count,
        "total_products":      total_products,
        "top_products":        perf[:5],
        "bottom_products":     perf[-5:] if len(perf) >= 5 else perf,
        "recent_alerts":       alerts,
        "daily_revenue_trend": daily_trend,
    }
