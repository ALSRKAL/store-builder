import type { Env } from '../types';

export interface TrialAdmin {
  id: string;
  email: string;
  subscription_end: string | null;
  subscription_months: number | null;
  subscription_code: string | null;
  plan_id: string | null;
  is_trial: number;
  trial_used: number;
}

export function isActiveTrial(admin: TrialAdmin | null, timestamp = Date.now()): boolean {
  return !!admin && (admin.is_trial === 1 || admin.plan_id === 'trial') &&
    (admin.subscription_months ?? 0) === 0 && !admin.subscription_code &&
    (!admin.plan_id || admin.plan_id === 'trial') &&
    !!admin.subscription_end && Date.parse(admin.subscription_end) > timestamp;
}

/** D1 batch is transactional. Claim both identities and grant the profile in
 * one batch; losers cannot renew/extend a trial or clobber a paid activation. */
export async function claimTrial(env: Env, userId: string, email: string, timestamp: string, endDate: string): Promise<void> {
  const claimId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO trial_ledger
        (identity_type, identity_value, claim_id, started_at, subscription_end)
      SELECT 'uid', ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM trial_ledger WHERE
        (identity_type = 'uid' AND identity_value = ?) OR
        (identity_type = 'email' AND identity_value = ?))
      AND NOT EXISTS (SELECT 1 FROM admins WHERE id <> ? AND lower(trim(email)) = ?)
      AND NOT EXISTS (SELECT 1 FROM admins WHERE (id = ? OR lower(trim(email)) = ?) AND (
        trial_used = 1 OR subscription_end IS NOT NULL OR
        COALESCE(subscription_months, 0) > 0 OR COALESCE(subscription_code, '') <> '' OR
        (plan_id IS NOT NULL AND plan_id <> 'trial') OR is_trial = 0
      ))
    `).bind(userId, claimId, timestamp, endDate, userId, email, userId, email, userId, email),
    env.DB.prepare(`
      INSERT OR IGNORE INTO trial_ledger
        (identity_type, identity_value, claim_id, started_at, subscription_end)
      SELECT 'email', ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM trial_ledger WHERE identity_type = 'uid' AND identity_value = ? AND claim_id = ?)
    `).bind(email, claimId, timestamp, endDate, userId, claimId),
    env.DB.prepare(`
      INSERT INTO admins (id, email, subscription_start, subscription_end, subscription_months,
        plan_id, is_trial, trial_used, last_login, created_at, updated_at)
      SELECT ?, ?, ?, ?, 0, 'trial', 1, 1, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM trial_ledger WHERE identity_type = 'uid' AND identity_value = ? AND claim_id = ?)
        AND EXISTS (SELECT 1 FROM trial_ledger WHERE identity_type = 'email' AND identity_value = ? AND claim_id = ?)
      ON CONFLICT(id) DO UPDATE SET
        subscription_start = excluded.subscription_start,
        subscription_end = excluded.subscription_end,
        subscription_months = 0, plan_id = 'trial', is_trial = 1, trial_used = 1,
        last_login = excluded.last_login, updated_at = excluded.updated_at
      WHERE admins.subscription_end IS NULL AND COALESCE(admins.trial_used, 0) = 0
        AND COALESCE(admins.subscription_months, 0) = 0
        AND COALESCE(admins.subscription_code, '') = ''
        AND (admins.plan_id IS NULL OR admins.plan_id = 'trial') AND admins.is_trial <> 0
    `).bind(userId, email, timestamp, endDate, timestamp, timestamp, timestamp, userId, claimId, email, claimId),
  ]);
}
