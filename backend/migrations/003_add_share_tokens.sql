-- Phase 3 Migration: Add Share Tokens Table
-- Run date: November 25, 2025

CREATE TABLE share_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE UNIQUE INDEX idx_share_tokens_user_id ON share_tokens(user_id);
