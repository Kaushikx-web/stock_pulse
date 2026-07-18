from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


# ── Products ──────────────────────────────────────────────
class ProductBase(BaseModel):
    name: str
    category: str
    unit_cost: float
    unit_price: float

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    model_config = {"from_attributes": True}


# ── Inventory ─────────────────────────────────────────────
class InventoryBase(BaseModel):
    product_id: int
    current_stock: int
    reorder_threshold: int
    warehouse_id: str = "WH-01"

class InventoryOut(InventoryBase):
    id: int
    model_config = {"from_attributes": True}


# ── Suppliers ─────────────────────────────────────────────
class SupplierBase(BaseModel):
    name: str
    lead_time_days: int
    reliability_score: float

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    model_config = {"from_attributes": True}


# ── Purchase Orders ───────────────────────────────────────
class PurchaseOrderBase(BaseModel):
    product_id: int
    supplier_id: int
    quantity: int
    deadline: Optional[datetime] = None
    status: str = "draft"

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderOut(PurchaseOrderBase):
    id: int
    priority_score: Optional[float] = None
    ai_explanation: Optional[str] = None
    draft_text: Optional[str] = None
    created_at: datetime
    product: Optional[ProductOut] = None
    supplier: Optional[SupplierOut] = None
    model_config = {"from_attributes": True}

class POStatusUpdate(BaseModel):
    status: str


# ── Sales History ─────────────────────────────────────────
class SalesHistoryBase(BaseModel):
    product_id: int
    date: date
    quantity_sold: int
    revenue: float

class SalesHistoryOut(SalesHistoryBase):
    id: int
    model_config = {"from_attributes": True}


# ── Manufacturing Runs ────────────────────────────────────
class ManufacturingRunBase(BaseModel):
    product_id: int
    run_date: date
    quantity_produced: int
    cost: float

class ManufacturingRunOut(ManufacturingRunBase):
    id: int
    model_config = {"from_attributes": True}


# ── Dashboard ─────────────────────────────────────────────
class DashboardStats(BaseModel):
    low_stock_count: int
    pending_po_count: int
    total_products: int
    top_products: List[dict]
    bottom_products: List[dict]
    recent_alerts: List[dict]


# ── P&L ──────────────────────────────────────────────────
class PLEntry(BaseModel):
    product_id: int
    product_name: str
    category: str
    total_revenue: float
    total_cost: float
    profit: float
    margin_pct: float
    ai_insight: Optional[str] = None
    trend: List[dict] = []


# ── Upload Preview ────────────────────────────────────────
class UploadPreview(BaseModel):
    filename: str
    row_count: int
    columns_detected: List[str]
    column_mapping: dict
    preview_rows: List[dict]
    flagged_rows: List[dict]
    target_table: str
