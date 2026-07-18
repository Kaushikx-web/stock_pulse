-- ══════════════════════════════════════════════════════════════════════
-- StockPulse  —  Migration 002: Add user_id to all data tables
-- File: backend/migrations/002_add_user_id.sql
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste all → Run
--
-- This migration adds a user_id column to every data table so that
-- each user's uploaded data is scoped to them only.
-- ══════════════════════════════════════════════════════════════════════

-- First: ensure the users table exists (run 001_init_schema.sql if not)
-- The users table is required for the user_id foreign key references below.

-- Add user_id to suppliers
alter table suppliers add column if not exists user_id bigint references users(id) on delete cascade;

-- Add user_id to products
alter table products add column if not exists user_id bigint references users(id) on delete cascade;

-- Add user_id to inventory
alter table inventory add column if not exists user_id bigint references users(id) on delete cascade;

-- Fix inventory unique constraint: old constraint unique(product_id) prevents
-- multiple users from having inventory for the same product_id.
-- Drop old constraint and add a per-user unique constraint.
alter table inventory drop constraint if exists inventory_product_id_key;
create unique index if not exists inventory_product_user_unique on inventory(product_id, user_id);

-- Add user_id to sales_history
alter table sales_history add column if not exists user_id bigint references users(id) on delete cascade;

-- Add user_id to manufacturing_runs
alter table manufacturing_runs add column if not exists user_id bigint references users(id) on delete cascade;

-- Add user_id to purchase_orders
alter table purchase_orders add column if not exists user_id bigint references users(id) on delete cascade;

-- Create indexes for performance on user-scoped queries
create index if not exists idx_products_user_id on products(user_id);
create index if not exists idx_inventory_user_id on inventory(user_id);
create index if not exists idx_suppliers_user_id on suppliers(user_id);
create index if not exists idx_sales_history_user_id on sales_history(user_id);
create index if not exists idx_manufacturing_runs_user_id on manufacturing_runs(user_id);
create index if not exists idx_purchase_orders_user_id on purchase_orders(user_id);

-- Grant permissions
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ══════════════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════════════

