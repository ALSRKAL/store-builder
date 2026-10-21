-- Migration: Add trial_used column to admins table
-- This prevents users from restarting trial period multiple times

-- Add the trial_used column if it doesn't exist
ALTER TABLE admins ADD COLUMN trial_used INTEGER DEFAULT 0;

-- Mark existing trial users as having used their trial
UPDATE admins SET trial_used = 1 WHERE is_trial = 1 OR plan_id = 'trial';
