"""
Purchase Orders router — user-scoped via auth_deps.
Includes: PO drafting agent (auto + manual), ranked queue with AI explanations,
and status updates.
"""
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from database import get_db
from auth_deps import get_user_id
import schemas
from agents.po_drafter import draft_po
from agents.priority_scorer import score_purchase_orders, POInput
from agents.priority_explainer import explain_rankings

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


def _sales_velocity(product_id: int, uid: int, db: Client, days: int = 14) -> float:
    """Average daily units sold over the last N days — scoped to user."""
    cutoff = str((date.today() - timedelta(days=days)))
    res = (
        db.table("sales_history")
        .select("quantity_sold")
        .eq("product_id", product_id)
        .eq("user_id", uid)
        .gte("date", cutoff)
        .execute()
    )
    total = sum(r["quantity_sold"] for r in res.data)
    return total / days


@router.get("/")
def list_pos(
    status: Optional[str] = None,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    q = db.table("purchase_orders").select(
        "*, products(id, name, category, unit_cost, unit_price), "
        "suppliers(id, name, lead_time_days, reliability_score)"
    ).eq("user_id", uid)
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).execute()
    return [_flatten_po(row) for row in res.data]


@router.get("/ranked")
def ranked_pos(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Return active POs in priority order with AI explanations — scoped to user."""
    res = (
        db.table("purchase_orders")
        .select(
            "*, products(id, name, category, unit_cost, unit_price), "
            "suppliers(id, name, lead_time_days, reliability_score)"
        )
        .eq("user_id", uid)
        .in_("status", ["draft", "sent"])
        .execute()
    )

    if not res.data:
        return {"ranked": [], "summary": "No active purchase orders."}

    all_product_ids = list({row["product_id"] for row in res.data})
    inv_res = (
        db.table("inventory")
        .select("product_id, current_stock, reorder_threshold")
        .eq("user_id", uid)
        .in_("product_id", all_product_ids)
        .execute()
    )
    inv_map = {r["product_id"]: r for r in inv_res.data}

    po_inputs = []
    for row in res.data:
        product = row.get("products") or {}
        supplier = row.get("suppliers") or {}
        inv = inv_map.get(row["product_id"], {})

        current_stock = inv.get("current_stock", 0)
        velocity = _sales_velocity(row["product_id"], uid, db)
        deadline_dt = datetime.fromisoformat(row["deadline"].replace("Z", "+00:00")) if row.get("deadline") else None
        days_deadline = (deadline_dt - datetime.now(timezone.utc)).days if deadline_dt else 30
        order_value = row["quantity"] * float(product.get("unit_cost", 0))

        po_inputs.append(POInput(
            po_id=row["id"],
            product_name=product.get("name", f"Product {row['product_id']}"),
            current_stock=current_stock,
            daily_sales_velocity=velocity,
            days_until_deadline=max(0, days_deadline),
            order_value=order_value,
            supplier_lead_time_days=supplier.get("lead_time_days", 7),
            supplier_reliability=float(supplier.get("reliability_score", 0.8)),
        ))

    scored = score_purchase_orders(po_inputs)

    for s in scored:
        db.table("purchase_orders").update(
            {"priority_score": s.priority_score}
        ).eq("id", s.po_id).eq("user_id", uid).execute()

    scored_dicts = [
        {
            "po_id": s.po_id,
            "product_name": s.product_name,
            "priority_score": s.priority_score,
            "days_until_stockout": s.days_until_stockout,
            "component_breakdown": s.component_breakdown,
        }
        for s in scored
    ]
    explanations = explain_rankings(scored_dicts)

    po_map = {row["id"]: row for row in res.data}
    ranked = []
    for i, s in enumerate(scored):
        row = po_map[s.po_id]
        product = row.get("products") or {}
        supplier = row.get("suppliers") or {}
        ranked.append({
            "id":                  row["id"],
            "rank":                i + 1,
            "product_name":        product.get("name", ""),
            "category":            product.get("category", ""),
            "supplier_name":       supplier.get("name", ""),
            "quantity":            row["quantity"],
            "status":              row["status"],
            "deadline":            row.get("deadline"),
            "priority_score":      s.priority_score,
            "days_until_stockout": s.days_until_stockout,
            "component_breakdown": s.component_breakdown,
            "ai_explanation":      explanations.get(str(s.po_id), ""),
            "created_at":          row.get("created_at"),
        })

    return {"ranked": ranked, "summary": explanations.get("__summary__", "")}


@router.post("/draft-auto")
def draft_auto_pos(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Auto-draft POs for this user's products below reorder threshold."""
    inv_res = db.table("inventory").select(
        "product_id, current_stock, reorder_threshold, products(id, name, category, unit_cost, unit_price)"
    ).eq("user_id", uid).execute()

    low_stock = [r for r in inv_res.data if r["current_stock"] < r["reorder_threshold"]]

    if not low_stock:
        return {"message": "No low-stock items found", "drafted": 0}

    sup_res = db.table("suppliers").select("*").eq("user_id", uid).execute()
    suppliers = sup_res.data
    if not suppliers:
        raise HTTPException(400, "No suppliers in your database. Please upload supplier data first.")

    active_po_res = db.table("purchase_orders").select("product_id").eq("user_id", uid).in_(
        "status", ["draft", "sent"]
    ).execute()
    active_product_ids = {r["product_id"] for r in active_po_res.data}

    drafted_count = 0
    results = []
    best_supplier = max(suppliers, key=lambda s: float(s["reliability_score"]))

    for inv in low_stock:
        product = inv.get("products") or {}
        product_id = inv["product_id"]

        if product_id in active_product_ids:
            results.append({"product": product.get("name", ""), "action": "skipped (existing PO)"})
            continue

        velocity = _sales_velocity(product_id, uid, db)
        po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{product_id:04d}"

        draft_result = draft_po(
            product_name=product.get("name", ""),
            product_id=product_id,
            category=product.get("category", ""),
            unit_cost=float(product.get("unit_cost", 0)),
            current_stock=inv["current_stock"],
            reorder_threshold=inv["reorder_threshold"],
            daily_velocity=velocity,
            supplier_name=best_supplier["name"],
            supplier_id=best_supplier["id"],
            lead_time_days=best_supplier["lead_time_days"],
            reliability_score=float(best_supplier["reliability_score"]),
            po_number=po_number,
        )

        po_res = db.table("purchase_orders").insert({
            "product_id":  product_id,
            "supplier_id": best_supplier["id"],
            "quantity":    draft_result["quantity"],
            "deadline":    draft_result["deadline"].isoformat(),
            "status":      "draft",
            "draft_text":  draft_result["draft_text"],
            "user_id":     uid,
        }).execute()

        results.append({
            "product":  product.get("name", ""),
            "action":   "drafted",
            "po_id":    po_res.data[0]["id"] if po_res.data else None,
            "quantity": draft_result["quantity"],
            "urgency":  draft_result["urgency"],
        })
        drafted_count += 1

    return {"drafted": drafted_count, "results": results}


@router.post("/draft-manual/{product_id}")
def draft_manual_po(
    product_id: int,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Manually trigger PO drafting for a specific product owned by this user."""
    prod_res = (
        db.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("user_id", uid)
        .single()
        .execute()
    )
    if not prod_res.data:
        raise HTTPException(404, "Product not found")
    product = prod_res.data

    inv_res = (
        db.table("inventory")
        .select("*")
        .eq("product_id", product_id)
        .eq("user_id", uid)
        .single()
        .execute()
    )
    inventory = inv_res.data or {}

    sup_res = db.table("suppliers").select("*").eq("user_id", uid).execute()
    suppliers = sup_res.data
    if not suppliers:
        raise HTTPException(400, "No suppliers available. Upload supplier data first.")

    best_supplier = max(suppliers, key=lambda s: float(s["reliability_score"]))
    velocity = _sales_velocity(product_id, uid, db)

    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{product_id:04d}-M"
    draft_result = draft_po(
        product_name=product["name"],
        product_id=product_id,
        category=product["category"],
        unit_cost=float(product["unit_cost"]),
        current_stock=inventory.get("current_stock", 0),
        reorder_threshold=inventory.get("reorder_threshold", 50),
        daily_velocity=velocity,
        supplier_name=best_supplier["name"],
        supplier_id=best_supplier["id"],
        lead_time_days=best_supplier["lead_time_days"],
        reliability_score=float(best_supplier["reliability_score"]),
        po_number=po_number,
    )

    po_res = db.table("purchase_orders").insert({
        "product_id":  product_id,
        "supplier_id": best_supplier["id"],
        "quantity":    draft_result["quantity"],
        "deadline":    draft_result["deadline"].isoformat(),
        "status":      "draft",
        "draft_text":  draft_result["draft_text"],
        "user_id":     uid,
    }).execute()

    return {
        "po_id":          po_res.data[0]["id"],
        "product":        product["name"],
        "quantity":       draft_result["quantity"],
        "estimated_cost": draft_result["estimated_cost"],
        "urgency":        draft_result["urgency"],
        "draft_text":     draft_result["draft_text"],
    }


@router.patch("/{po_id}/status")
def update_po_status(
    po_id: int,
    update: schemas.POStatusUpdate,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    valid = {"draft", "sent", "received", "manufacturing", "complete", "cancelled"}
    if update.status not in valid:
        raise HTTPException(400, f"Invalid status. Choose from: {valid}")
    res = (
        db.table("purchase_orders")
        .update({"status": update.status})
        .eq("id", po_id)
        .eq("user_id", uid)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "PO not found")
    return {"po_id": po_id, "new_status": update.status}


@router.get("/{po_id}")
def get_po(
    po_id: int,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = (
        db.table("purchase_orders")
        .select("*, products(id, name, category, unit_cost, unit_price), suppliers(id, name, lead_time_days, reliability_score)")
        .eq("id", po_id)
        .eq("user_id", uid)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "PO not found")
    return _flatten_po(res.data)


def _flatten_po(row: dict) -> dict:
    """Flatten Supabase nested join result into a flat dict."""
    product = row.pop("products", None) or {}
    supplier = row.pop("suppliers", None) or {}
    return {**row, "product": product, "supplier": supplier}
