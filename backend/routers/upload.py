"""Upload router — injects user_id into every uploaded row."""
import io
import uuid
from typing import Optional
import pandas as pd
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form, Header
from supabase import Client
from database import get_db
from auth_deps import get_user_id
from agents.header_mapper import map_headers

router = APIRouter(prefix="/upload", tags=["upload"])

_preview_cache: dict = {}   # in-memory; fine for demo MVP


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    target_table: Optional[str] = Form(default=None),
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(400, f"Unsupported file type: .{ext}")

    contents = await file.read()
    try:
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl", header=None)
        else:
            df = pd.read_csv(io.BytesIO(contents), header=None)
            
        # Drop completely empty rows and columns
        df.dropna(how='all', inplace=True)
        df.dropna(how='all', axis=1, inplace=True)
        
        if df.empty:
            raise HTTPException(400, "File is empty or contains no readable data")
            
        # Find the row with the most non-null values in the first 10 rows to act as the header
        header_idx = 0
        max_non_nulls = 0
        for i in range(min(10, len(df))):
            non_nulls = df.iloc[i].count()
            if non_nulls > max_non_nulls:
                max_non_nulls = non_nulls
                header_idx = i
                
        # Set the headers and drop the rows above it
        df.columns = df.iloc[header_idx].astype(str).str.strip()
        df = df.iloc[header_idx + 1:].reset_index(drop=True)
        
        # Drop any remaining empty rows
        df.dropna(how='all', inplace=True)
        
    except Exception as e:
        raise HTTPException(400, f"Parse error: {e}")

    if df.empty:
        raise HTTPException(400, "File contains no data rows after the header")

    df.columns = [str(c).strip() for c in df.columns]
    raw_headers = list(df.columns)

    col_map, unmapped, flagged_fields, detected_table = map_headers(raw_headers, target_table)

    # Fetch user's products and suppliers for validation
    products_res = db.table("products").select("id, name").eq("user_id", uid).execute()
    product_name_to_id = {p["name"].strip().lower(): p["id"] for p in products_res.data}
    
    suppliers_res = db.table("suppliers").select("id, name").eq("user_id", uid).execute()
    supplier_name_to_id = {s["name"].strip().lower(): s["id"] for s in suppliers_res.data}

    preview_rows, flagged_rows = [], []
    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        
        # Skip summary/total rows (e.g. has "TOTAL" in a column and mostly blank elsewhere)
        is_summary = False
        for k, v in row_dict.items():
            if isinstance(v, str) and str(v).strip().lower() in ("total", "totals", "grand total"):
                blanks = sum(1 for val in row_dict.values() if pd.isna(val) or str(val).strip() == "")
                if blanks > len(row_dict) / 2:
                    is_summary = True
                    break
        if is_summary:
            continue
            
        issues = []
        for raw_col, schema_field in col_map.items():
            val = row_dict.get(raw_col)
            if pd.isna(val) or val == "":
                issues.append(f"Missing '{schema_field}'")
            elif schema_field in ("unit_cost", "unit_price", "revenue", "cost", "reliability_score"):
                try:
                    float(val)
                except (ValueError, TypeError):
                    issues.append(f"'{schema_field}' must be numeric, got: {val!r}")
            elif schema_field in ("current_stock", "quantity_sold", "quantity_produced", "lead_time_days"):
                try:
                    int(float(str(val)))
                except (ValueError, TypeError):
                    issues.append(f"'{schema_field}' must be integer, got: {val!r}")
            elif schema_field == "product_id":
                val_str = str(val).strip()
                try:
                    int(float(val_str))
                except (ValueError, TypeError):
                    if val_str.lower() not in product_name_to_id:
                        issues.append(f"Product '{val_str}' not found in database")
            elif schema_field == "supplier_id":
                val_str = str(val).strip()
                try:
                    int(float(val_str))
                except (ValueError, TypeError):
                    if val_str.lower() not in supplier_name_to_id:
                        issues.append(f"Supplier '{val_str}' not found in database")

        mapped_row = {col_map.get(k, k): (None if pd.isna(v) else v) for k, v in row_dict.items()}
        mapped_row["_row_index"] = int(idx)

        if issues:
            flagged_rows.append({**mapped_row, "_issues": issues})
        else:
            preview_rows.append(mapped_row)

    upload_id = str(uuid.uuid4())
    _preview_cache[upload_id] = {
        "df": df, "col_map": col_map, "target_table": detected_table, "user_id": uid,
    }

    return {
        "upload_id":         upload_id,
        "filename":          file.filename,
        "row_count":         len(df),
        "columns_detected":  raw_headers,
        "column_mapping":    col_map,
        "unmapped_columns":  unmapped,
        "flagged_fields":    flagged_fields,
        "target_table":      detected_table,
        "preview_rows":      preview_rows[:20],
        "flagged_rows":      flagged_rows[:10],
    }


@router.post("/confirm/{upload_id}")
def confirm_upload(
    upload_id: str,
    db: Client = Depends(get_db),
    uid: int = Depends(get_user_id),
):
    cached = _preview_cache.get(upload_id)
    if not cached:
        raise HTTPException(404, "Upload session not found or expired")

    if cached.get("user_id") != uid:
        raise HTTPException(403, "You do not have permission to confirm this upload")

    df: pd.DataFrame = cached["df"]
    col_map: dict = cached["col_map"]
    target: str = cached["target_table"]

    # Required fields per table — rows missing these will be skipped with a clear error
    REQUIRED: dict = {
        "products":           ["name", "category", "unit_cost", "unit_price"],
        "inventory":          ["product_id", "current_stock", "reorder_threshold"],
        "suppliers":          ["name", "lead_time_days", "reliability_score"],
        "sales_history":      ["product_id", "date", "quantity_sold", "revenue"],
        "manufacturing_runs": ["product_id", "run_date", "quantity_produced", "cost"],
    }
    required_fields = REQUIRED.get(target, [])

    # Fetch user's products and suppliers to map name -> id
    products_res = db.table("products").select("id, name").eq("user_id", uid).execute()
    product_name_to_id = {p["name"].strip().lower(): p["id"] for p in products_res.data}

    suppliers_res = db.table("suppliers").select("id, name").eq("user_id", uid).execute()
    supplier_name_to_id = {s["name"].strip().lower(): s["id"] for s in suppliers_res.data}

    rows = []
    errors = []
    for idx, row in df.iterrows():
        try:
            mapped = {
                col_map[k]: (None if pd.isna(v) else v)
                for k, v in row.items()
                if k in col_map
            }

            # 1. Resolve product name/ID
            if "product_id" in mapped and mapped["product_id"] is not None:
                val_str = str(mapped["product_id"]).strip()
                try:
                    # check if already an integer ID
                    mapped["product_id"] = int(float(val_str))
                except (ValueError, TypeError):
                    val_lower = val_str.lower()
                    if val_lower in product_name_to_id:
                        mapped["product_id"] = product_name_to_id[val_lower]
                    else:
                        errors.append({
                            "row": int(idx),
                            "error": f"Product '{val_str}' not found in database. Please create the product first."
                        })
                        continue

            # 2. Resolve supplier name/ID
            if "supplier_id" in mapped and mapped["supplier_id"] is not None:
                val_str = str(mapped["supplier_id"]).strip()
                try:
                    mapped["supplier_id"] = int(float(val_str))
                except (ValueError, TypeError):
                    val_lower = val_str.lower()
                    if val_lower in supplier_name_to_id:
                        mapped["supplier_id"] = supplier_name_to_id[val_lower]
                    else:
                        errors.append({
                            "row": int(idx),
                            "error": f"Supplier '{val_str}' not found in database. Please create the supplier first."
                        })
                        continue

            # Check required fields before inserting
            missing = [f for f in required_fields if mapped.get(f) is None]
            if missing:
                errors.append({
                    "row": int(idx),
                    "error": f"Missing required fields: {missing}. Check column mapping."
                })
                continue

            coerced = _coerce_types(target, mapped)
            coerced["user_id"] = uid
            rows.append(coerced)
        except Exception as e:
            errors.append({"row": int(idx), "error": str(e)})

    if not rows and errors:
        # All rows failed — return a helpful message instead of inserting nothing silently
        raise HTTPException(
            422,
            f"No rows could be imported. The column mapping doesn't match the '{target}' table. "
            f"First error: {errors[0]['error']}. "
            f"Please check your file headers match the expected field names."
        )

    inserted = 0
    updated = 0
    db_errors = []
    if rows:
        try:
            # 1. Fetch existing records to find duplicates (scoped to user_id = uid)
            existing_map = {}
            if target == "products":
                keys = [r["name"] for r in rows]
                existing = db.table(target).select("id, name").eq("user_id", uid).in_("name", keys).execute().data
                existing_map = {e["name"]: e["id"] for e in existing}
            elif target == "suppliers":
                keys = [r["name"] for r in rows]
                existing = db.table(target).select("id, name").eq("user_id", uid).in_("name", keys).execute().data
                existing_map = {e["name"]: e["id"] for e in existing}
            elif target == "inventory":
                keys = [r["product_id"] for r in rows]
                existing = db.table(target).select("id, product_id").eq("user_id", uid).in_("product_id", keys).execute().data
                existing_map = {e["product_id"]: e["id"] for e in existing}
            elif target == "sales_history":
                p_ids = [r["product_id"] for r in rows]
                existing = db.table(target).select("id, product_id, date").eq("user_id", uid).in_("product_id", p_ids).execute().data
                existing_map = {(e["product_id"], e["date"]): e["id"] for e in existing}
            elif target == "manufacturing_runs":
                p_ids = [r["product_id"] for r in rows]
                existing = db.table(target).select("id, product_id, run_date").eq("user_id", uid).in_("product_id", p_ids).execute().data
                existing_map = {(e["product_id"], e["run_date"]): e["id"] for e in existing}

            # 2. Separate into inserts and updates
            inserts = []
            updates = []
            
            for row in rows:
                key = None
                if target == "products":
                    key = row["name"]
                elif target == "suppliers":
                    key = row["name"]
                elif target == "inventory":
                    key = row["product_id"]
                elif target == "sales_history":
                    key = (row["product_id"], row["date"])
                elif target == "manufacturing_runs":
                    key = (row["product_id"], row["run_date"])
                
                if key and key in existing_map:
                    updates.append((existing_map[key], row))
                else:
                    inserts.append(row)
                    
            # 3. Perform database operations
            if inserts:
                for i in range(0, len(inserts), 500):
                    db.table(target).insert(inserts[i:i+500]).execute()
                    inserted += len(inserts[i:i+500])
                    
            if updates:
                for row_id, row in updates:
                    db.table(target).update(row).eq("id", row_id).execute()
                    updated += 1

        except Exception as e:
            db_errors.append(str(e))

    if db_errors and inserted == 0 and updated == 0:
        raise HTTPException(500, f"Database operation failed: {db_errors[0]}")

    del _preview_cache[upload_id]
    return {"inserted": inserted, "updated": updated, "errors": errors, "db_errors": db_errors, "target_table": target}


def _coerce_types(table: str, data: dict) -> dict:
    """Cast values to the right Python types for each table."""
    numeric_fields = {"unit_cost", "unit_price", "revenue", "cost", "reliability_score"}
    int_fields = {"current_stock", "reorder_threshold", "quantity_sold",
                  "quantity_produced", "lead_time_days", "product_id", "supplier_id"}
    for k, v in data.items():
        if v is None:
            continue
        if k in numeric_fields:
            data[k] = float(v)
        elif k in int_fields:
            data[k] = int(float(str(v)))
    return data
