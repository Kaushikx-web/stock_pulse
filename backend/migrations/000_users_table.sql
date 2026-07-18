-- ══════════════════════════════════════════════════════════════════════
-- StockPulse  —  Users Table Setup
-- File: backend/migrations/000_users_table.sql
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste all → Run
--   Run THIS FIRST before 001_init_schema.sql and 002_add_user_id.sql
--
-- This creates the users table required by the auth system.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists users (
    id            bigint generated always as identity primary key,
    username      text        not null unique,
    email         text        not null unique,
    password_hash text        not null,
    created_at    timestamptz not null default now()
);

-- Disable RLS (service role key bypasses it, but be explicit)
alter table users disable row level security;

-- Grant access to service role
grant all on table users    to service_role;
grant all on sequence users_id_seq to service_role;

-- ══════════════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════════════
