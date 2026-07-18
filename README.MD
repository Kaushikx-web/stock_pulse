# StockPulse
**AI-powered inventory, procurement & profitability platform for SMEs**

Built for **TakeOver'26 Hackathon** — Theme 4: Operations, Inventory & ERP

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Sonnet-CC785C)

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [AI vs Deterministic Logic](#ai-vs-deterministic-logic)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Sample Data](#sample-data)
- [Troubleshooting](#troubleshooting)
- [Demo](#demo)
- [Team](#team)
- [Acknowledgments](#acknowledgments)

---

## Overview

Most SMEs run inventory and procurement on spreadsheets and manual tracking — leading to stock-outs, overstocking, reordering with no demand forecasting, and zero real-time visibility into which products are actually profitable after repeated restocks.

**StockPulse** unifies inventory, purchase order management, manufacturing priority, and product-level profitability into one platform. It uses an AI agent layer for the parts that genuinely benefit from language understanding and judgment (reading messy spreadsheets, explaining decisions, drafting documents) while keeping all financial and scheduling math as plain, auditable, deterministic code.

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

## How It Works

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

**Security:** The `SUPABASE_KEY` (service role) lives only in the backend `.env`. The frontend never talks to Supabase directly — every request is routed through FastAPI, which owns the agent logic and business rules.

## AI vs Deterministic Logic

The core design principle: **numbers and rules are code, judgment and language are AI.**

| Component | Type | Reason |
|-----------|------|--------|
| Priority score formula | **Pure Python** | Must be reproducible, auditable |
| P&L computation | **Pure Python** | Financial accuracy requirement |
| Sales velocity / order qty | **Pure Python** | Business logic |
| Header mapping | **LLM (Claude)** | Handles unlimited synonym variants |
| PO document text | **LLM (Claude)** | Natural language drafting |
| Priority explanations | **LLM (Claude)** | Readable justification |
| P&L insights | **LLM (Claude)** | Narrative analysis |

## Tech Stack

- **Backend:** FastAPI (Python)
- **Database:** Supabase (Postgres)
- **AI/Agents:** LangChain (`create_agent`) + Anthropic API (Claude)
- **Frontend:** React + Tailwind CSS, Recharts for visualizations
- **Data ingestion:** pandas + openpyxl

## Quick Start

### Prerequisites
- Python 3.10+ (`python3 --version`)
- Node.js 18+ (`node --version`)
- A Supabase project (free tier works)
- An Anthropic API key

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New query**
3. Run `backend/migrations/001_create_schema.sql`
4. Run `backend/migrations/002_disable_rls.sql`
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_KEY` *(never expose this to the browser)*

### 2. Backend
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

### 3. Frontend
```bash
cd frontend
npm install          # already done if you followed setup
npm run dev
```
App available at: http://localhost:5173

## API Reference

Full interactive documentation is auto-generated by FastAPI once the backend is running — visit **http://localhost:8000/docs** for request/response schemas and to try endpoints directly. See the [Features](#features) table above for a summary of what each endpoint does.

## Project Structure

```
stockpulse/
├── backend/
│   ├── main.py
│   ├── seed.py
│   ├── requirements.txt
│   └── migrations/
│       ├── 001_create_schema.sql
│       └── 002_disable_rls.sql
├── frontend/
│   ├── package.json
│   └── src/
├── .env.example
└── README.md
```
*(adjust this tree if your actual folder layout differs)*

## Sample Data

Sample product/inventory spreadsheets are available for testing the upload feature end-to-end without needing real data — useful for judges or teammates trying the app for the first time. Consider adding these to a `/sample-data` folder in the repo:
- `stockpulse_sample_inventory.xlsx` — 25 products across 6 categories
- `stockpulse_sample_inventory_batch2.xlsx` — a second batch of 25 different products

## Troubleshooting

**Upload says "no rows imported" / column mapping errors**
Usually means a header didn't map to the expected schema field (e.g. `"Unit Cost (INR)"` failing to match `unit_cost`). Fixed by having the mapping logic normalize headers (strip units/currency annotations, ignore case/punctuation) and fall back to semantic LLM matching instead of a rigid synonym list.

**Data exists in Supabase but doesn't show in the UI**
Check whether Row Level Security is enabled on the relevant table with no policy defined — this causes queries to silently return an empty result instead of an error, which looks identical to "nothing is there." Confirm via Supabase → Table Editor → RLS toggle.

**CORS errors in the browser console**
Ensure FastAPI's `CORSMiddleware` explicitly allows your frontend's origin (e.g. `http://localhost:5173`).

## Demo

🎥 **Demo video:** _add link once recorded_
📸 **Screenshots:** _add here_

## Team

| Name | Role |
|------|------|
| _Add your name_ | _Add your role_ |

## Acknowledgments

- [Anthropic Claude](https://www.anthropic.com) — agent reasoning & natural language generation
- [Supabase](https://supabase.com) — managed Postgres backend
- [LangChain](https://www.langchain.com) — agent orchestration
- TakeOver'26 Hackathon organizers

---

*License not yet specified — consider adding one (MIT is a common default for hackathon projects) if this repo will stay public long-term.*
