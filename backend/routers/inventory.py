"""Inventory router — user-scoped via auth_deps."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from database import get_db
from auth_deps import get_user_id
import schemas

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/", response_model=List[schemas.InventoryOut])
def list_inventory(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = db.table("inventory").select("*").eq("user_id", uid).execute()
    return res.data


@router.get("/low-stock")
def low_stock_items(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    """Items where current_stock < reorder_threshold for this user."""
    res = db.table("inventory").select(
        "id, product_id, current_stock, reorder_threshold, warehouse_id, "
        "products(name, category)"
    ).eq("user_id", uid).execute()

    low = [
        {
            "inventory_id":      row["id"],
            "product_id":        row["product_id"],
            "product_name":      (row.get("products") or {}).get("name", ""),
            "category":          (row.get("products") or {}).get("category", ""),
            "current_stock":     row["current_stock"],
            "reorder_threshold": row["reorder_threshold"],
            "warehouse_id":      row["warehouse_id"],
            "shortfall":         row["reorder_threshold"] - row["current_stock"],
        }
        for row in res.data
        if row["current_stock"] < row["reorder_threshold"]
    ]
    return low


@router.patch("/{inventory_id}")
def update_stock(
    inventory_id: int,
    current_stock: int,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = (
        db.table("inventory")
        .update({"current_stock": current_stock})
        .eq("id", inventory_id)
        .eq("user_id", uid)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Inventory record not found")
    return {"message": "Updated", "current_stock": current_stock}
