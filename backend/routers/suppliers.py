"""Suppliers router — user-scoped via auth_deps."""
from typing import List
from fastapi import APIRouter, Depends
from supabase import Client
from database import get_db
from auth_deps import get_user_id
import schemas

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("/", response_model=List[schemas.SupplierOut])
def list_suppliers(
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    res = db.table("suppliers").select("*").eq("user_id", uid).execute()
    return res.data


@router.post("/", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(
    supplier: schemas.SupplierCreate,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    data = {**supplier.model_dump(), "user_id": uid}
    res = db.table("suppliers").insert(data).execute()
    return res.data[0]
