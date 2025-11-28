-- Email Verification System
-- Migration to add email verification support

-- Add is_verified column to users table
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0 NOT NULL;

-- Create verification_tokens table
CREATE TABLE verification_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_type ON verification_tokens(type);

-- Set OAuth users as verified by default
UPDATE users SET is_verified = 1 WHERE oauth_provider IS NOT NULL;
