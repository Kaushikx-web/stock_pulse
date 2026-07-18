"""Products router — user-scoped via auth_deps."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from database import get_db
from auth_deps import get_user_id
import schemas

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[schemas.ProductOut])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = (
        db.table("products")
        .select("*")
        .eq("user_id", uid)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = (
        db.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("user_id", uid)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Product not found")
    return res.data


@router.post("/", response_model=schemas.ProductOut, status_code=201)
def create_product(
    product: schemas.ProductCreate,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    data = {**product.model_dump(), "user_id": uid}
    res = db.table("products").insert(data).execute()
    return res.data[0]
