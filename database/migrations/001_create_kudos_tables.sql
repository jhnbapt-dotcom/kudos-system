-- Migration: Create Kudos System Tables
-- Version: 1.0.0
-- Date: 2026-09-07

-- Create Kudos table
CREATE TABLE kudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_kudos_created_at ON kudos(created_at DESC);
CREATE INDEX idx_kudos_is_visible ON kudos(is_visible);
CREATE INDEX idx_kudos_giver ON kudos(giver_id);
CREATE INDEX idx_kudos_recipient ON kudos(recipient_id);

-- Create Kudos Moderation Log table
CREATE TABLE kudos_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id UUID REFERENCES kudos(id) ON DELETE SET NULL,
    moderator_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('hide', 'show', 'delete')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for moderation log
CREATE INDEX idx_moderation_kudos ON kudos_moderation_log(kudos_id);
CREATE INDEX idx_moderation_moderator ON kudos_moderation_log(moderator_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kudos_updated_at
    BEFORE UPDATE ON kudos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
