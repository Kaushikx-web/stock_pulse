"""
Priority Scorer — PURE PYTHON, NO LLM.
Computes a deterministic priority_score for each Purchase Order.

Formula:
  score = (
      0.35 * urgency_component       # days until stockout (lower = more urgent)
    + 0.25 * deadline_component      # days until deadline (lower = more urgent)
    + 0.20 * value_component         # order value (higher = more important)
    + 0.20 * reliability_component   # supplier risk (lower reliability = more attention)
  )

All components are normalized to [0, 1] where 1 = highest priority.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List


@dataclass
class POInput:
    po_id: int
    product_name: str
    current_stock: int
    daily_sales_velocity: float          # units/day
    days_until_deadline: float           # calendar days
    order_value: float                   # qty * unit_cost
    supplier_lead_time_days: int
    supplier_reliability: float          # 0.0–1.0


@dataclass
class POScore:
    po_id: int
    product_name: str
    priority_score: float                # 0.0–1.0, higher = more urgent
    days_until_stockout: float
    component_breakdown: dict


def _safe_normalize(value: float, min_val: float, max_val: float, invert: bool = False) -> float:
    """Normalize value to [0,1]. Clamp if out of range."""
    if max_val == min_val:
        return 0.5
    norm = (value - min_val) / (max_val - min_val)
    norm = max(0.0, min(1.0, norm))
    return (1.0 - norm) if invert else norm


def compute_days_until_stockout(current_stock: float, daily_velocity: float) -> float:
    """How many days before stock hits zero at current sales rate."""
    if daily_velocity <= 0:
        return 999.0  # No demand → no urgency
    return current_stock / daily_velocity


def score_purchase_orders(pos: List[POInput]) -> List[POScore]:
    """
    Score and rank all POs. Returns list sorted by priority_score descending.
    """
    if not pos:
        return []

    # Pre-compute derived values
    stockouts = [compute_days_until_stockout(p.current_stock, p.daily_sales_velocity) for p in pos]
    values = [p.order_value for p in pos]

    # Ranges for normalization
    min_stockout = max(0, min(stockouts))
    max_stockout = max(max(stockouts), 1)

    min_deadline = max(0, min(p.days_until_deadline for p in pos))
    max_deadline = max(max(p.days_until_deadline for p in pos), 1)

    min_value = min(values)
    max_value = max(max(values), 1)

    scored = []
    for po, stockout in zip(pos, stockouts):
        # Urgency: fewer days to stockout → higher score (invert)
        urgency = _safe_normalize(stockout, min_stockout, max_stockout, invert=True)

        # Deadline: fewer days → higher priority (invert)
        deadline_comp = _safe_normalize(
            po.days_until_deadline, min_deadline, max_deadline, invert=True
        )

        # Value: higher order value → higher priority
        value_comp = _safe_normalize(po.order_value, min_value, max_value, invert=False)

        # Reliability risk: lower reliability → higher attention needed
        reliability_comp = 1.0 - po.supplier_reliability

        score = (
            0.35 * urgency
            + 0.25 * deadline_comp
            + 0.20 * value_comp
            + 0.20 * reliability_comp
        )

        scored.append(POScore(
            po_id=po.po_id,
            product_name=po.product_name,
            priority_score=round(score, 4),
            days_until_stockout=round(stockout, 1),
            component_breakdown={
                "urgency_weight": round(0.35 * urgency, 4),
                "deadline_weight": round(0.25 * deadline_comp, 4),
                "value_weight": round(0.20 * value_comp, 4),
                "reliability_weight": round(0.20 * reliability_comp, 4),
                "days_until_stockout": round(stockout, 1),
                "days_until_deadline": round(po.days_until_deadline, 1),
                "order_value": round(po.order_value, 2),
                "supplier_reliability": po.supplier_reliability,
            },
        ))

    scored.sort(key=lambda x: x.priority_score, reverse=True)
    return scored
