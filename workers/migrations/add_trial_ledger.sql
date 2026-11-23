-- Durable, once-only trial identities. Deliberately no FK to admins: deleting a
-- profile or moving its UID must never make a consumed trial available again.
CREATE TABLE IF NOT EXISTS trial_ledger (
  identity_type TEXT NOT NULL CHECK (identity_type IN ('uid', 'email')),
  identity_value TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  started_at TEXT,
  subscription_end TEXT,
  PRIMARY KEY (identity_type, identity_value)
);

-- Preserve explicit historical usage, including paid accounts upgraded from a
-- trial. Default is_trial/plan_id alone is NOT evidence of a consumed trial.
INSERT OR IGNORE INTO trial_ledger
  (identity_type, identity_value, claim_id, started_at, subscription_end)
SELECT 'uid', id, 'legacy:' || id, subscription_start, subscription_end FROM admins
WHERE trial_used = 1 OR (
  (is_trial = 1 OR plan_id = 'trial') AND subscription_end IS NOT NULL
  AND COALESCE(subscription_months, 0) = 0
  AND COALESCE(subscription_code, '') = ''
  AND (plan_id IS NULL OR plan_id = 'trial')
);

INSERT OR IGNORE INTO trial_ledger
  (identity_type, identity_value, claim_id, started_at, subscription_end)
SELECT 'email', lower(trim(email)), 'legacy:' || id, subscription_start, subscription_end FROM admins
WHERE trim(email) <> '' AND (trial_used = 1 OR (
  (is_trial = 1 OR plan_id = 'trial') AND subscription_end IS NOT NULL
  AND COALESCE(subscription_months, 0) = 0
  AND COALESCE(subscription_code, '') = ''
  AND (plan_id IS NULL OR plan_id = 'trial')
)) ORDER BY subscription_start, id;

-- Keep imported/legacy profiles and UID/email changes safe after deployment.
CREATE TRIGGER IF NOT EXISTS record_trial_identity_insert
AFTER INSERT ON admins
WHEN NEW.trial_used = 1 OR (
  (NEW.is_trial = 1 OR NEW.plan_id = 'trial') AND NEW.subscription_end IS NOT NULL
  AND COALESCE(NEW.subscription_months, 0) = 0
  AND COALESCE(NEW.subscription_code, '') = ''
  AND (NEW.plan_id IS NULL OR NEW.plan_id = 'trial')
)
BEGIN
  INSERT INTO trial_ledger
    SELECT 'uid', NEW.id, 'legacy:' || NEW.id, NEW.subscription_start, NEW.subscription_end
    WHERE NOT EXISTS (SELECT 1 FROM trial_ledger WHERE identity_type = 'uid' AND identity_value = NEW.id);
  INSERT INTO trial_ledger
    SELECT 'email', lower(trim(NEW.email)), 'legacy:' || NEW.id, NEW.subscription_start, NEW.subscription_end
    WHERE trim(NEW.email) <> '' AND NOT EXISTS (
      SELECT 1 FROM trial_ledger WHERE identity_type = 'email' AND identity_value = lower(trim(NEW.email))
    );
END;

CREATE TRIGGER IF NOT EXISTS record_trial_identity_update
AFTER UPDATE OF id, email, trial_used, is_trial, subscription_start, subscription_end, plan_id, subscription_months, subscription_code ON admins
WHEN NEW.trial_used = 1 OR (
  (NEW.is_trial = 1 OR NEW.plan_id = 'trial') AND NEW.subscription_end IS NOT NULL
  AND COALESCE(NEW.subscription_months, 0) = 0
  AND COALESCE(NEW.subscription_code, '') = ''
  AND (NEW.plan_id IS NULL OR NEW.plan_id = 'trial')
)
BEGIN
  INSERT INTO trial_ledger
    SELECT 'uid', NEW.id, 'legacy:' || NEW.id, NEW.subscription_start, NEW.subscription_end
    WHERE NOT EXISTS (SELECT 1 FROM trial_ledger WHERE identity_type = 'uid' AND identity_value = NEW.id);
  INSERT INTO trial_ledger
    SELECT 'email', lower(trim(NEW.email)), 'legacy:' || NEW.id, NEW.subscription_start, NEW.subscription_end
    WHERE trim(NEW.email) <> '' AND NOT EXISTS (
      SELECT 1 FROM trial_ledger WHERE identity_type = 'email' AND identity_value = lower(trim(NEW.email))
    );
END;
