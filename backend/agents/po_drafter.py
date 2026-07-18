"""
PO Drafter Agent
Uses Claude to write a professional Purchase Order document given
structured data. The QUANTITIES and COSTS are computed by plain Python
(sales velocity math) — the LLM only produces the readable document text.
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a procurement specialist writing Purchase Orders for a manufacturing company.
Given structured data about a product, its stock level, sales velocity, and the best supplier,
write a concise, professional Purchase Order document.

The PO should include:
1. A header with PO number, date, and urgency level
2. Product and supplier details
3. Order quantity with justification (based on the velocity data provided)
4. Estimated cost breakdown
5. Delivery timeline and priority
6. A brief recommendation note

Keep it under 250 words. Be direct and professional. Use clear formatting with sections."""


def compute_order_quantity(
    current_stock: int,
    reorder_threshold: int,
    daily_velocity: float,
    lead_time_days: int,
    safety_stock_days: int = 14,
) -> int:
    """
    Pure Python: compute how many units to order.
    Formula: cover lead time + safety buffer + replenish to 60-day supply
    """
    # Units needed during lead time
    lead_time_demand = daily_velocity * lead_time_days
    # Safety buffer
    safety_stock = daily_velocity * safety_stock_days
    # Target stock level (60-day supply)
    target_stock = daily_velocity * 60
    # Order enough to reach target from current
    order_qty = max(
        reorder_threshold * 2,  # minimum order
        int(target_stock - current_stock + lead_time_demand + safety_stock),
    )
    return max(50, order_qty)  # floor of 50 units


def draft_po(
    product_name: str,
    product_id: int,
    category: str,
    unit_cost: float,
    current_stock: int,
    reorder_threshold: int,
    daily_velocity: float,
    supplier_name: str,
    supplier_id: int,
    lead_time_days: int,
    reliability_score: float,
    po_number: str,
) -> dict:
    """
    Returns dict with: quantity, estimated_cost, deadline, draft_text
    Python computes the numbers; LLM writes the document text.
    """
    # ── Pure Python calculations ──────────────────────────────────────────
    quantity = compute_order_quantity(
        current_stock, reorder_threshold, daily_velocity, lead_time_days
    )
    estimated_cost = round(quantity * unit_cost, 2)
    deadline = datetime.utcnow() + timedelta(days=lead_time_days + 3)
    days_until_stockout = (current_stock / daily_velocity) if daily_velocity > 0 else 999
    urgency = "CRITICAL" if days_until_stockout < 7 else "HIGH" if days_until_stockout < 14 else "NORMAL"

    # ── LLM: write the PO document text ──────────────────────────────────
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key and api_key != "your_anthropic_api_key_here":
        llm = ChatAnthropic(
            model="claude-sonnet-4-6",
            api_key=api_key,
            max_tokens=600,
        )
        data_summary = f"""
PO Number: {po_number}
Date: {datetime.utcnow().strftime('%Y-%m-%d')}
Urgency: {urgency}

Product: {product_name} (ID: {product_id}, Category: {category})
Current Stock: {current_stock} units
Reorder Threshold: {reorder_threshold} units
Daily Sales Velocity: {daily_velocity:.1f} units/day
Days Until Stockout: {days_until_stockout:.0f} days

Supplier: {supplier_name} (ID: {supplier_id})
Supplier Reliability: {reliability_score:.0%}
Lead Time: {lead_time_days} days

Order Quantity (computed): {quantity} units
Unit Cost: ${unit_cost:.2f}
Total Estimated Cost: ${estimated_cost:,.2f}
Required By: {deadline.strftime('%Y-%m-%d')}
"""
        try:
            response = llm.invoke([
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=f"Write a Purchase Order for:\n{data_summary}"),
            ])
            draft_text = response.content
        except Exception as e:
            draft_text = _fallback_draft(po_number, product_name, supplier_name,
                                          quantity, unit_cost, estimated_cost,
                                          deadline, urgency, lead_time_days)
    else:
        draft_text = _fallback_draft(po_number, product_name, supplier_name,
                                      quantity, unit_cost, estimated_cost,
                                      deadline, urgency, lead_time_days)

    return {
        "quantity": quantity,
        "estimated_cost": estimated_cost,
        "deadline": deadline,
        "draft_text": draft_text,
        "days_until_stockout": round(days_until_stockout, 1),
        "urgency": urgency,
    }


def _fallback_draft(po_number, product_name, supplier_name, quantity,
                    unit_cost, total_cost, deadline, urgency, lead_time):
    return f"""PURCHASE ORDER — {po_number}
Date: {datetime.utcnow().strftime('%Y-%m-%d')} | Priority: {urgency}
{'='*50}

PRODUCT: {product_name}
SUPPLIER: {supplier_name}
LEAD TIME: {lead_time} days

ORDER DETAILS:
  Quantity:        {quantity:,} units
  Unit Cost:       ${unit_cost:.2f}
  Total Cost:      ${total_cost:,.2f}
  Required By:     {deadline.strftime('%Y-%m-%d')}

NOTE: Quantity computed based on 60-day supply target adjusted
for current stock level and sales velocity.

Please acknowledge receipt and confirm delivery schedule.
"""
