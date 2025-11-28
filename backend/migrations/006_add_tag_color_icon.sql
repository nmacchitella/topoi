-- Migration: Add color and icon fields to tags
-- Run date: November 28, 2025

-- Add color field with default blue
ALTER TABLE tags ADD COLUMN color TEXT DEFAULT '#3B82F6';

-- Add icon field (nullable, for emoji)
ALTER TABLE tags ADD COLUMN icon TEXT;
