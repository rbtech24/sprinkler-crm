-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Database setup script
-- Run this first to initialize the database

-- Usage:
-- 1. Create a new PostgreSQL database
-- 2. Run: psql -d your_database -f setup.sql
-- 3. Run migrations: psql -d your_database -f migrations/001_initial_schema.sql

-- Check if we're running on the correct database
DO $$
BEGIN
  IF current_database() = 'postgres' THEN
    RAISE EXCEPTION 'Do not run setup on the postgres system database. Create a new database first.';
  END IF;
END $$;
