-- ══════════════════════════════════════════════════════════════════════
-- StockPulse  —  Complete Schema Migration
-- File: backend/migrations/001_init_schema.sql
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste all → Run
--
-- Column names here are the exact names used by every router, schema,
-- and seed script in the backend.  Do not rename anything.
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- 0.  SAFETY: drop existing tables in reverse-dependency order
--     Uncomment ONLY if you want a clean reset (destructive!)
-- ──────────────────────────────────────────────────────────────────────
-- drop table if exists manufacturing_runs  cascade;
-- drop table if exists sales_history       cascade;
-- drop table if exists purchase_orders     cascade;
-- drop table if exists inventory           cascade;
-- drop table if exists products            cascade;
-- drop table if exists suppliers           cascade;
-- drop table if exists warehouses          cascade;


-- ──────────────────────────────────────────────────────────────────────
-- 1.  warehouses
--     Stores logical warehouse identifiers used by inventory.warehouse_id
--     NOTE: inventory.warehouse_id is stored as TEXT (e.g. 'WH-01'),
--     not as a bigint FK, so existing backend code needs no changes.
--     This table is reference data only.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists warehouses (
    id          bigint generated always as identity primary key,
    name        text not null,
    location    text not null default '',
    created_at  timestamptz not null default now()
);

-- Seed the three warehouses the backend uses
insert into warehouses (name, location)
select name, location
from (values
    ('WH-01', 'Main Facility'),
    ('WH-02', 'Secondary Facility'),
    ('WH-03', 'Overflow Storage')
) as v(name, location)
where not exists (select 1 from warehouses limit 1);


-- ──────────────────────────────────────────────────────────────────────
-- 2.  suppliers
--     Columns read/written by:
--       seed.py              → name, lead_time_days, reliability_score
--       routers/suppliers.py → *
--       routers/purchase_orders.py → id, name, lead_time_days, reliability_score
-- ──────────────────────────────────────────────────────────────────────
create table if not exists suppliers (
    id                bigint generated always as identity primary key,
    name              text         not null,
    lead_time_days    int          not null default 7
                      check (lead_time_days > 0),
    reliability_score numeric(4,3) not null default 0.800
                      check (reliability_score between 0 and 1),
    created_at        timestamptz  not null default now()
);


-- ──────────────────────────────────────────────────────────────────────
-- 3.  products
--     Columns read/written by:
--       seed.py              → name, category, unit_cost, unit_price
--       routers/products.py  → *
--       routers/analytics.py → id, name, category
--       schemas.py           → id, name, category, unit_cost, unit_price
-- ──────────────────────────────────────────────────────────────────────
create table if not exists products (
    id          bigint generated always as identity primary key,
    name        text           not null,
    category    text           not null,
    unit_cost   numeric(12,4)  not null check (unit_cost >= 0),
    unit_price  numeric(12,4)  not null check (unit_price >= 0),
    created_at  timestamptz    not null default now()
);


-- ──────────────────────────────────────────────────────────────────────
-- 4.  inventory
--     Columns read/written by:
--       seed.py              → product_id, current_stock, reorder_threshold, warehouse_id
--       routers/inventory.py → id, product_id, current_stock, reorder_threshold, warehouse_id
--       routers/analytics.py → current_stock, reorder_threshold, warehouse_id
--       schemas.py (InventoryBase) → product_id, current_stock, reorder_threshold, warehouse_id
--
--     warehouse_id is stored as TEXT (e.g. 'WH-01'), matching the backend.
--     No FK to warehouses — backend never queries warehouses table directly.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists inventory (
    id                  bigint generated always as identity primary key,
    product_id          bigint       not null
                        references products(id) on delete cascade,
    current_stock       int          not null default 0
                        check (current_stock >= 0),
    reorder_threshold   int          not null default 50
                        check (reorder_threshold >= 0),
    warehouse_id        text         not null default 'WH-01',
    updated_at          timestamptz  not null default now(),
    unique (product_id)             -- one inventory row per product
);


-- ──────────────────────────────────────────────────────────────────────
-- 5.  purchase_orders
--     Columns read/written by:
--       seed.py                  → product_id, supplier_id, quantity,
--                                   deadline, status, priority_score, draft_text
--       routers/purchase_orders.py → all columns
--       schemas.py (PurchaseOrderOut) → id, product_id, supplier_id, quantity,
--                                        deadline, status, priority_score,
--                                        ai_explanation, draft_text, created_at
--
--     STATUS VALUES allowed by the backend:
--       'draft', 'sent', 'received', 'manufacturing', 'complete', 'cancelled'
--       (the router's update_po_status() accepts all six; old migration
--        was missing 'cancelled' — fixed here)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists purchase_orders (
    id              bigint generated always as identity primary key,
    product_id      bigint       not null
                    references products(id) on delete restrict,
    supplier_id     bigint       not null
                    references suppliers(id) on delete restrict,
    quantity        int          not null check (quantity > 0),
    deadline        timestamptz,
    status          text         not null default 'draft'
                    check (status in (
                        'draft', 'sent', 'received',
                        'manufacturing', 'complete', 'cancelled'
                    )),
    priority_score  numeric(6,4),
    ai_explanation  text,
    draft_text      text,
    created_at      timestamptz  not null default now()
);

create index if not exists idx_po_status
    on purchase_orders(status);

create index if not exists idx_po_product
    on purchase_orders(product_id);


-- ──────────────────────────────────────────────────────────────────────
-- 6.  sales_history
--     Columns read/written by:
--       seed.py              → product_id, date, quantity_sold, revenue
--       routers/analytics.py → product_id, date, quantity_sold, revenue
--       routers/purchase_orders.py → product_id, date, quantity_sold
--       schemas.py (SalesHistoryBase) → product_id, date, quantity_sold, revenue
-- ──────────────────────────────────────────────────────────────────────
create table if not exists sales_history (
    id              bigint generated always as identity primary key,
    product_id      bigint         not null
                    references products(id) on delete cascade,
    date            date           not null,
    quantity_sold   int            not null check (quantity_sold >= 0),
    revenue         numeric(14,4)  not null check (revenue >= 0)
);

create index if not exists idx_sales_product_date
    on sales_history(product_id, date desc);


-- ──────────────────────────────────────────────────────────────────────
-- 7.  manufacturing_runs
--     Columns read/written by:
--       seed.py              → product_id, run_date, quantity_produced, cost
--       routers/analytics.py → product_id, run_date, quantity_produced, cost
--       agents/pnl_analyst.py → run_date, quantity_produced, cost
--       schemas.py (ManufacturingRunBase) → product_id, run_date, quantity_produced, cost
-- ──────────────────────────────────────────────────────────────────────
create table if not exists manufacturing_runs (
    id                  bigint generated always as identity primary key,
    product_id          bigint         not null
                        references products(id) on delete cascade,
    run_date            date           not null,
    quantity_produced   int            not null check (quantity_produced > 0),
    cost                numeric(14,4)  not null check (cost >= 0)
);

create index if not exists idx_mfg_product_date
    on manufacturing_runs(product_id, run_date desc);


-- ══════════════════════════════════════════════════════════════════════
-- PERMISSIONS  (service_role key bypasses RLS automatically,
-- but being explicit prevents surprises if RLS is ever enabled)
-- ══════════════════════════════════════════════════════════════════════
alter table warehouses          disable row level security;
alter table suppliers           disable row level security;
alter table products            disable row level security;
alter table inventory           disable row level security;
alter table purchase_orders     disable row level security;
alter table sales_history       disable row level security;
alter table manufacturing_runs  disable row level security;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ══════════════════════════════════════════════════════════════════════
-- DONE — paste this entire file into Supabase SQL Editor and click Run
-- ══════════════════════════════════════════════════════════════════════
