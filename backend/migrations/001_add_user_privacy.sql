-- Phase 1 Migration: Add User Privacy and Profile Fields
-- Run date: November 25, 2025

-- Add new fields to users table
ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profile_image_url TEXT;

-- Create unique index on username (partial index for non-null values)
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
