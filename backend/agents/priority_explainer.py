"""
Priority Explainer Agent
Uses Claude to explain the ranked PO list in plain language and resolve ties.
The scores (numbers) come from priority_scorer.py — the LLM only writes explanations.
"""
import os
import json
from typing import List, Dict
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a supply chain analyst explaining purchase order priority rankings.
You will receive a ranked list of purchase orders with their computed priority scores and breakdown.
Your job is to write a brief, plain-English explanation for why each PO is ranked where it is.

For each PO write 1-2 sentences maximum. Focus on:
- The most critical factor driving the ranking (stockout urgency, deadline, value, supplier risk)
- Any notable flags (very low days-to-stockout, unreliable supplier, high value order)

Respond with JSON only:
{
  "explanations": {
    "<po_id>": "explanation text",
    ...
  },
  "summary": "One overall sentence about the queue state"
}
"""


def explain_rankings(scored_pos: List[Dict]) -> Dict[str, str]:
    """
    scored_pos: list of dicts with po_id, product_name, priority_score, component_breakdown
    Returns dict mapping po_id → explanation string
    """
    if not scored_pos:
        return {}

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_anthropic_api_key_here":
        return _fallback_explanations(scored_pos)

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=api_key,
        max_tokens=1500,
    )

    ranked_data = json.dumps(scored_pos, indent=2)
    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Explain these ranked purchase orders:\n{ranked_data}"),
        ])
        result = json.loads(response.content)
        explanations = {str(k): v for k, v in result.get("explanations", {}).items()}
        explanations["__summary__"] = result.get("summary", "")
        return explanations
    except Exception as e:
        print(f"Priority explainer LLM failed ({e}), using fallback.")
        return _fallback_explanations(scored_pos)


def _fallback_explanations(scored_pos: List[Dict]) -> Dict[str, str]:
    """Deterministic fallback explanations."""
    explanations = {}
    for i, po in enumerate(scored_pos):
        bd = po.get("component_breakdown", {})
        days_stockout = bd.get("days_until_stockout", 999)
        days_deadline = bd.get("days_until_deadline", 999)
        reliability = bd.get("supplier_reliability", 1.0)

        if days_stockout < 7:
            reason = f"Critical: only {days_stockout:.0f} days of stock remaining"
        elif days_deadline < 5:
            reason = f"Deadline in {days_deadline:.0f} days — must act immediately"
        elif reliability < 0.8:
            reason = f"Supplier reliability is low ({reliability:.0%}) — needs earlier processing"
        else:
            reason = f"Ranked #{i+1} by composite score ({po['priority_score']:.3f})"

        explanations[str(po["po_id"])] = reason

    explanations["__summary__"] = (
        f"{len(scored_pos)} POs ranked by urgency, deadline proximity, order value, and supplier risk."
    )
    return explanations
