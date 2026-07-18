"""
P&L Analyst Agent
Computes profit/loss deterministically in Python; uses Claude only to
generate a short natural-language insight per product.
"""
import os
import json
from typing import List, Dict, Tuple
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a financial analyst providing concise insights about product profitability
in a manufacturing business. For each product you receive computed P&L data across multiple periods.

Write exactly 2 sentences per product:
1. State the key financial trend (margin improving/declining, absolute profit level)
2. Give a specific, actionable recommendation

Be concrete — reference the numbers provided. Avoid generic advice.

Respond with JSON only:
{
  "insights": {
    "<product_id>": "insight text",
    ...
  }
}
"""


def compute_pnl(
    product_id: int,
    sales_records: List[Dict],    # [{date, quantity_sold, revenue}, ...]
    manufacturing_records: List[Dict],  # [{run_date, quantity_produced, cost}, ...]
) -> Dict:
    """
    Pure Python P&L computation. No LLM involved.
    Returns aggregated P&L and trend data.
    """
    total_revenue = sum(r["revenue"] for r in sales_records)
    total_cost = sum(r["cost"] for r in manufacturing_records)
    profit = total_revenue - total_cost
    margin_pct = (profit / total_revenue * 100) if total_revenue > 0 else 0.0

    # Monthly trend: group revenue and cost by month
    monthly = {}
    for r in sales_records:
        month = str(r["date"])[:7]  # "YYYY-MM"
        monthly.setdefault(month, {"revenue": 0.0, "cost": 0.0})
        monthly[month]["revenue"] += r["revenue"]

    for r in manufacturing_records:
        month = str(r["run_date"])[:7]
        monthly.setdefault(month, {"revenue": 0.0, "cost": 0.0})
        monthly[month]["cost"] += r["cost"]

    trend = [
        {
            "month": m,
            "revenue": round(monthly[m]["revenue"], 2),
            "cost": round(monthly[m]["cost"], 2),
            "profit": round(monthly[m]["revenue"] - monthly[m]["cost"], 2),
        }
        for m in sorted(monthly.keys())
    ]

    # Per-run cost trend for detecting cost inflation
    run_costs = []
    for i, r in enumerate(sorted(manufacturing_records, key=lambda x: x["run_date"])):
        qty = r.get("quantity_produced", 1)
        cost_per_unit = r["cost"] / qty if qty > 0 else 0
        run_costs.append({
            "run": i + 1,
            "run_date": str(r["run_date"]),
            "cost_per_unit": round(cost_per_unit, 3),
            "quantity": qty,
        })

    return {
        "product_id": product_id,
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "profit": round(profit, 2),
        "margin_pct": round(margin_pct, 2),
        "trend": trend,
        "run_cost_trend": run_costs,
    }


def generate_insights(pnl_data: List[Dict]) -> Dict[str, str]:
    """
    Given list of computed P&L dicts, ask Claude for short insight per product.
    Falls back to deterministic text if no API key.
    """
    if not pnl_data:
        return {}

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_anthropic_api_key_here":
        return _fallback_insights(pnl_data)

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=api_key,
        max_tokens=2000,
    )

    # Trim run_cost_trend to last 3 runs to keep prompt small
    trimmed = []
    for p in pnl_data:
        trimmed.append({
            "product_id": p["product_id"],
            "product_name": p.get("product_name", ""),
            "total_revenue": p["total_revenue"],
            "total_cost": p["total_cost"],
            "profit": p["profit"],
            "margin_pct": p["margin_pct"],
            "run_cost_trend": p.get("run_cost_trend", [])[-3:],
        })

    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Generate insights for:\n{json.dumps(trimmed, indent=2)}"),
        ])
        result = json.loads(response.content)
        return {str(k): v for k, v in result.get("insights", {}).items()}
    except Exception as e:
        print(f"P&L analyst LLM failed ({e}), using fallback.")
        return _fallback_insights(pnl_data)


def _fallback_insights(pnl_data: List[Dict]) -> Dict[str, str]:
    """Deterministic fallback insights."""
    insights = {}
    for p in pnl_data:
        pid = str(p["product_id"])
        margin = p["margin_pct"]
        profit = p["profit"]
        runs = p.get("run_cost_trend", [])

        cost_inflating = (
            len(runs) >= 2
            and runs[-1]["cost_per_unit"] > runs[0]["cost_per_unit"] * 1.05
        )

        if profit < 0:
            insights[pid] = (
                f"This product is operating at a loss (${profit:,.0f}), "
                f"with {margin:.1f}% margin. Immediate cost review or price adjustment required."
            )
        elif cost_inflating:
            delta = (runs[-1]["cost_per_unit"] / runs[0]["cost_per_unit"] - 1) * 100
            insights[pid] = (
                f"Margin is {margin:.1f}% but manufacturing cost has risen {delta:.0f}% "
                f"across production runs. Renegotiate supplier terms or improve yield."
            )
        elif margin > 40:
            insights[pid] = (
                f"Strong performer at {margin:.1f}% margin (${profit:,.0f} profit). "
                f"Consider increasing production volume to capture more demand."
            )
        else:
            insights[pid] = (
                f"Stable at {margin:.1f}% margin. "
                f"Monitor manufacturing costs to maintain profitability."
            )
    return insights
