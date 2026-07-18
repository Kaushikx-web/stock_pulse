# StockPulse — AI-Powered Inventory & Procurement Platform

## Quick Start

### Prerequisites
- Python 3.10+ (`python3 --version`)
- Node.js 18+ (`node --version`)
- A Supabase project (free tier works)
- An Anthropic API key

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New query**
3. Run `backend/migrations/001_create_schema.sql`
4. Run `backend/migrations/002_disable_rls.sql`
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_KEY` *(never expose this to the browser)*

---

## 2. Backend

```bash
cd backend

# Copy and fill in credentials
cp ../.env.example .env
# Edit .env with your SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database (18 products, 60 days of sales, etc.)
python seed.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API available at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

## 3. Frontend

```bash
cd frontend
npm install          # already done if you followed setup
npm run dev
```

App available at: http://localhost:5173

---

## Architecture

```
Browser (React) ──HTTP──► FastAPI (Python)
                               │
                 ┌─────────────┴──────────────┐
                 │ Supabase-py (service role)  │
                 │ ──────────────────────────  │
                 │         Supabase            │
                 │      (Postgres DB)          │
                 └─────────────────────────────┘
                               │
                    LangChain + Anthropic API
                    (header mapping, PO drafts,
                     priority explanations,
                     P&L insights)
```

**Security:** The `SUPABASE_KEY` (service role) lives only in the backend `.env`.  
The frontend never talks to Supabase directly.

---

## Features

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Excel/CSV Upload | `POST /upload/` | LLM maps headers, returns preview |
| Confirm Import | `POST /upload/confirm/{id}` | Commit to Supabase |
| Auto-Draft POs | `POST /purchase-orders/draft-auto` | Claude writes PO text, Python computes qty |
| Manual PO | `POST /purchase-orders/draft-manual/{id}` | Per-product PO |
| Ranked Queue | `GET /purchase-orders/ranked` | Python scores, Claude explains |
| P&L Analytics | `GET /analytics/pnl` | Python computes, Claude generates insights |
| Dashboard | `GET /analytics/dashboard` | Overview stats |

## AI vs Deterministic Split

| Component | Type | Reason |
|-----------|------|--------|
| Priority score formula | **Pure Python** | Must be reproducible, auditable |
| P&L computation | **Pure Python** | Financial accuracy requirement |
| Sales velocity / order qty | **Pure Python** | Business logic |
| Header mapping | **LLM (Claude)** | Handles unlimited synonym variants |
| PO document text | **LLM (Claude)** | Natural language drafting |
| Priority explanations | **LLM (Claude)** | Readable justification |
| P&L insights | **LLM (Claude)** | Narrative analysis |
