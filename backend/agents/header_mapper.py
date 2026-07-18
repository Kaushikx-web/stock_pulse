"""
Header Mapper Agent
Uses Claude to map ambiguous CSV/Excel column headers to schema fields.
This is the ONLY LLM call in the ingestion pipeline; all data transformation
is done deterministically afterward.
"""
import json
import os
import re
from typing import Dict, List, Tuple
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

SCHEMA_FIELDS = {
    "products": ["name", "category", "unit_cost", "unit_price"],
    "inventory": ["product_id", "current_stock", "reorder_threshold", "warehouse_id"],
    "sales_history": ["product_id", "date", "quantity_sold", "revenue"],
    "manufacturing_runs": ["product_id", "run_date", "quantity_produced", "cost"],
    "suppliers": ["name", "lead_time_days", "reliability_score"],
}

SYSTEM_PROMPT = """You are a data schema expert for a manufacturing ERP system.
Your job is to map CSV/Excel column headers to the correct database schema fields.

You will receive:
1. A list of column headers found in the uploaded file
2. A target table name and its expected fields

Respond with a JSON object ONLY (no markdown, no explanation) in this exact format:
{
  "mapping": {"detected_header": "schema_field", ...},
  "unmapped": ["headers that couldn't be mapped"],
  "flagged_fields": ["schema fields that are missing from the file"],
  "target_table": "the best matching table name"
}

Rules:
- Map common variants: "Qty"/"Quantity"/"Stock Count"/"Amt" to current_stock (inventory), quantity_sold (sales_history), or quantity_produced (manufacturing_runs).
- "Cost"/"Price"/"Unit Cost" to unit_cost (products) or cost (manufacturing_runs).
- "Product"/"Item"/"SKU"/"Product Name" to name (products) or product_id (inventory, sales_history, manufacturing_runs).
- "Supplier"/"Vendor"/"Supplier Name" to name (suppliers) or supplier_id (purchase_orders).
- "Date"/"Sale Date"/"Transaction Date" to date (sales_history) or run_date (manufacturing_runs).
- If a field is required and missing, add it to flagged_fields.
- Choose target_table based on the columns present if not obvious.
"""


def map_headers(
    headers: List[str],
    hint_table: str = None,
) -> Tuple[Dict[str, str], List[str], List[str], str]:
    """
    Returns (column_mapping, unmapped_cols, flagged_fields, target_table)
    Uses deterministic mapping first, then falls back to LLM for ambiguous headers.
    """
    mapping, unmapped, flagged_fields, target_table = _fallback_mapping(headers, hint_table)
    
    if not unmapped:
        return mapping, unmapped, flagged_fields, target_table

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_anthropic_api_key_here":
        return mapping, unmapped, flagged_fields, target_table

    llm = ChatAnthropic(
        model="claude-3-5-sonnet-20240620",
        api_key=api_key,
        max_tokens=1024,
    )

    schema_info = json.dumps(SCHEMA_FIELDS, indent=2)
    user_msg = (
        f"File columns detected: {unmapped}\n\n"
        f"Hint table: {target_table}\n\n"
        f"Available schema fields:\n{schema_info}"
    )

    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        result = json.loads(response.content)
        
        # Merge LLM results
        llm_mapping = result.get("mapping", {})
        for k, v in llm_mapping.items():
            if k in unmapped:
                # Ensure LLM mapping is also scoped to target table
                valid_fields = set(SCHEMA_FIELDS.get(target_table, []))
                if not valid_fields or v in valid_fields:
                    # Prevent multiple columns from mapping to the exact same field
                    if v not in mapping.values():
                        mapping[k] = v
                        unmapped.remove(k)
        
        return (
            mapping,
            unmapped,
            result.get("flagged_fields", flagged_fields),
            result.get("target_table", target_table),
        )
    except Exception as e:
        print(f"LLM header mapping failed ({e}), using fallback.")
        return mapping, unmapped, flagged_fields, target_table


def _fallback_mapping(headers: List[str], hint_table: str = None) -> Tuple:
    """Deterministic fallback mapping using known synonyms, dynamically adapted to the target table."""
    # Synonyms mapping to canonical meanings
    synonym_canonical = {
        # Product identifiers
        "product name": "product_ref", "product": "product_ref", "item": "product_ref",
        "sku": "product_ref", "item name": "product_ref", "description": "product_ref",
        # Category
        "category": "category", "type": "category", "product type": "category",
        # Costs/Prices
        "unit cost": "unit_cost_ref", "cost price": "unit_cost_ref",
        "unit price": "unit_price_ref", "price": "unit_price_ref", "selling price": "unit_price_ref", "sale price": "unit_price_ref",
        # Quantity
        "current stock": "stock_ref", "stock": "stock_ref", "stock count": "stock_ref", "on hand": "stock_ref",
        "qty": "qty_ref", "quantity": "qty_ref", "units": "qty_ref",
        "quantity sold": "qty_sold_ref", "quantity_sold": "qty_sold_ref", "qty sold": "qty_sold_ref", "units sold": "qty_sold_ref", "sold": "qty_sold_ref",
        "quantity produced": "qty_produced_ref", "quantity_produced": "qty_produced_ref", "produced": "qty_produced_ref", "output": "qty_produced_ref",
        # Thresholds
        "reorder threshold": "reorder_threshold", "min stock": "reorder_threshold", "reorder point": "reorder_threshold",
        # Warehouse
        "warehouse": "warehouse_id", "location": "warehouse_id", "warehouse id": "warehouse_id",
        # Date
        "date": "date_ref", "sale date": "date_ref", "transaction date": "date_ref",
        "run date": "run_date", "manufacture date": "run_date",
        # Revenue
        "revenue": "revenue", "sales": "revenue", "total revenue": "revenue", "amount": "revenue",
        # Supplier
        "supplier": "supplier_ref", "vendor": "supplier_ref", "supplier name": "supplier_ref",
        "lead time": "lead_time_days", "lead time days": "lead_time_days",
        "reliability": "reliability_score", "reliability score": "reliability_score",
        # Cost (manufacturing)
        "total cost": "cost_ref", "cost": "cost_ref",
    }

    # Infer target table if not provided
    target_table = hint_table
    if not target_table:
        counts = {t: 0 for t in SCHEMA_FIELDS}
        for h in headers:
            clean_h = re.sub(r'\(.*?\)|\[.*?\]', '', h)
            clean_h = re.sub(r'[^\w\s]', '', clean_h).lower().strip()
            clean_h = re.sub(r'\s+', ' ', clean_h)
            if clean_h in synonym_canonical:
                canon = synonym_canonical[clean_h]
                if canon == "product_ref":
                    counts["products"] += 1
                    counts["inventory"] += 1
                    counts["sales_history"] += 1
                    counts["manufacturing_runs"] += 1
                elif canon in ("category", "unit_cost_ref", "unit_price_ref"):
                    counts["products"] += 1
                elif canon in ("stock_ref", "reorder_threshold", "warehouse_id"):
                    counts["inventory"] += 1
                elif canon == "qty_ref":
                    counts["inventory"] += 1
                    counts["sales_history"] += 1
                    counts["manufacturing_runs"] += 1
                elif canon in ("qty_sold_ref", "date_ref", "revenue"):
                    counts["sales_history"] += 1
                elif canon in ("qty_produced_ref", "run_date", "cost_ref"):
                    counts["manufacturing_runs"] += 1
                elif canon in ("supplier_ref", "lead_time_days", "reliability_score"):
                    counts["suppliers"] += 1
        
        if counts and max(counts.values()) > 0:
            best = max(counts.items(), key=lambda x: x[1])
            target_table = best[0]
        else:
            target_table = "products"

    # Now map synonyms based on the resolved target_table
    mapping = {}
    valid_fields = set(SCHEMA_FIELDS.get(target_table, []))

    for h in headers:
        clean_h = re.sub(r'\(.*?\)|\[.*?\]', '', h)
        clean_h = re.sub(r'[^\w\s]', '', clean_h).lower().strip()
        clean_h = re.sub(r'\s+', ' ', clean_h)
        
        if clean_h in synonym_canonical:
            canon = synonym_canonical[clean_h]
            target_field = None
            
            if canon == "product_ref":
                target_field = "name" if target_table == "products" else "product_id"
            elif canon == "supplier_ref":
                target_field = "name" if target_table == "suppliers" else "supplier_id"
            elif canon == "qty_ref":
                if target_table == "inventory":
                    target_field = "current_stock"
                elif target_table == "sales_history":
                    target_field = "quantity_sold"
                elif target_table == "manufacturing_runs":
                    target_field = "quantity_produced"
            elif canon == "qty_sold_ref":
                if target_table == "sales_history":
                    target_field = "quantity_sold"
            elif canon == "qty_produced_ref":
                if target_table == "manufacturing_runs":
                    target_field = "quantity_produced"
            elif canon == "stock_ref":
                if target_table == "inventory":
                    target_field = "current_stock"
            elif canon == "date_ref":
                if target_table == "sales_history":
                    target_field = "date"
            elif canon == "cost_ref":
                if target_table == "manufacturing_runs":
                    target_field = "cost"
                elif target_table == "products":
                    target_field = "unit_cost"
            elif canon == "unit_cost_ref":
                if target_table == "products":
                    target_field = "unit_cost"
            elif canon == "unit_price_ref":
                if target_table == "products":
                    target_field = "unit_price"
            else:
                target_field = canon
            
            if target_field and target_field in valid_fields:
                if target_field not in mapping.values():
                    mapping[h] = target_field

    unmapped = [h for h in headers if h not in mapping]
    return mapping, unmapped, [], target_table
