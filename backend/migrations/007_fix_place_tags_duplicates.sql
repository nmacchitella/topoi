-- Migration: Fix duplicate entries in place_tags and add unique constraint
-- Run date: November 28, 2025

-- Step 1: Remove duplicate entries from place_tags, keeping only one of each (place_id, tag_id) pair
-- SQLite doesn't support DELETE with JOIN, so we use a subquery

-- Create a temporary table with unique entries
CREATE TABLE IF NOT EXISTS place_tags_temp (
    place_id TEXT,
    tag_id TEXT,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(place_id, tag_id)
);

-- Insert unique entries (using INSERT OR IGNORE to skip duplicates)
INSERT OR IGNORE INTO place_tags_temp (place_id, tag_id)
SELECT place_id, tag_id FROM place_tags;

-- Drop the old table
DROP TABLE place_tags;

-- Rename the temp table
ALTER TABLE place_tags_temp RENAME TO place_tags;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_place_tags_place_id ON place_tags(place_id);
CREATE INDEX IF NOT EXISTS idx_place_tags_tag_id ON place_tags(tag_id);
