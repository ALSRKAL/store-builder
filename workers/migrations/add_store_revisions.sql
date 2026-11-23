-- Apply after schema.sql and the payment-method migration, before enabling realtime.
-- Revision rows intentionally survive deletes (no FK): counters cannot go backwards
-- on delete/recreate and open sockets can observe a tombstone. No payload is stored.
CREATE TABLE IF NOT EXISTS store_revisions (
  store_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  store_revision INTEGER NOT NULL DEFAULT 1,
  products_revision INTEGER NOT NULL DEFAULT 1,
  categories_revision INTEGER NOT NULL DEFAULT 1,
  payments_revision INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_store_revisions_owner ON store_revisions(owner_id);
CREATE TABLE IF NOT EXISTS store_slug_aliases (
  alias TEXT PRIMARY KEY,
  store_id TEXT NOT NULL
);
INSERT OR IGNORE INTO store_revisions(store_id, owner_id, slug) SELECT id, owner_id, slug FROM stores;
INSERT OR IGNORE INTO store_slug_aliases(alias, store_id) SELECT slug, id FROM stores;
INSERT OR IGNORE INTO store_slug_aliases(alias, store_id) SELECT id, id FROM stores;

CREATE TRIGGER IF NOT EXISTS realtime_stores_insert AFTER INSERT ON stores BEGIN
  INSERT INTO store_revisions(store_id, owner_id, slug) VALUES(NEW.id, NEW.owner_id, NEW.slug)
  ON CONFLICT(store_id) DO UPDATE SET owner_id = NEW.owner_id, slug = NEW.slug, deleted = 0,
    revision = revision + 1, store_revision = store_revision + 1,
    products_revision = products_revision + 1, categories_revision = categories_revision + 1,
    payments_revision = payments_revision + 1;
  INSERT INTO store_slug_aliases(alias, store_id) VALUES(NEW.slug, NEW.id)
    ON CONFLICT(alias) DO UPDATE SET store_id = NEW.id;
  INSERT OR IGNORE INTO store_slug_aliases(alias, store_id) VALUES(NEW.id, NEW.id);
END;
-- Do not watch updated_at: existing timestamp triggers issue a nested UPDATE.
CREATE TRIGGER IF NOT EXISTS realtime_stores_update
AFTER UPDATE OF slug, name, whatsapp, logo, owner_id, theme, currency, location, announcement, social_links, is_active ON stores
BEGIN
  UPDATE store_revisions SET owner_id = NEW.owner_id, slug = NEW.slug, revision = revision + 1,
    store_revision = store_revision + 1,
    products_revision = products_revision + CASE WHEN OLD.owner_id IS NOT NEW.owner_id THEN 1 ELSE 0 END,
    categories_revision = categories_revision + CASE WHEN OLD.owner_id IS NOT NEW.owner_id THEN 1 ELSE 0 END,
    payments_revision = payments_revision + CASE WHEN OLD.owner_id IS NOT NEW.owner_id THEN 1 ELSE 0 END
    WHERE store_id = NEW.id;
  INSERT OR IGNORE INTO store_slug_aliases(alias, store_id) VALUES(OLD.slug, OLD.id);
  INSERT INTO store_slug_aliases(alias, store_id) VALUES(NEW.slug, NEW.id)
    ON CONFLICT(alias) DO UPDATE SET store_id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS realtime_stores_delete AFTER DELETE ON stores BEGIN
  UPDATE store_revisions SET deleted = 1, revision = revision + 1,
    store_revision = store_revision + 1, products_revision = products_revision + 1,
    categories_revision = categories_revision + 1, payments_revision = payments_revision + 1
    WHERE store_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS realtime_products_insert AFTER INSERT ON products BEGIN
  UPDATE store_revisions SET revision = revision + 1, products_revision = products_revision + 1
    WHERE owner_id = NEW.store_id;
END;
CREATE TRIGGER IF NOT EXISTS realtime_products_update
AFTER UPDATE OF store_id, name, price, description, images, category_id, colors, sizes, discount, in_stock ON products BEGIN
  UPDATE store_revisions SET revision = revision + 1, products_revision = products_revision + 1
    WHERE owner_id IN (OLD.store_id, NEW.store_id);
END;
CREATE TRIGGER IF NOT EXISTS realtime_products_delete AFTER DELETE ON products BEGIN
  UPDATE store_revisions SET revision = revision + 1, products_revision = products_revision + 1
    WHERE owner_id = OLD.store_id;
END;

CREATE TRIGGER IF NOT EXISTS realtime_categories_insert AFTER INSERT ON categories BEGIN
  UPDATE store_revisions SET revision = revision + 1, categories_revision = categories_revision + 1
    WHERE owner_id = NEW.store_id;
END;
CREATE TRIGGER IF NOT EXISTS realtime_categories_update
AFTER UPDATE OF store_id, name, description, sort_order ON categories BEGIN
  UPDATE store_revisions SET revision = revision + 1, categories_revision = categories_revision + 1
    WHERE owner_id IN (OLD.store_id, NEW.store_id);
END;
CREATE TRIGGER IF NOT EXISTS realtime_categories_delete AFTER DELETE ON categories BEGIN
  -- Deleting a category reassigns its products in the existing route. Invalidate
  -- both resources even when foreign-key/cascade settings differ in an installation.
  UPDATE store_revisions SET revision = revision + 1, categories_revision = categories_revision + 1,
    products_revision = products_revision + 1 WHERE owner_id = OLD.store_id;
END;

CREATE TRIGGER IF NOT EXISTS realtime_payments_insert AFTER INSERT ON store_payment_methods BEGIN
  UPDATE store_revisions SET revision = revision + 1, payments_revision = payments_revision + 1
    WHERE owner_id = NEW.store_id;
END;
CREATE TRIGGER IF NOT EXISTS realtime_payments_update
AFTER UPDATE OF store_id, provider_id, country_code, label, config_details, require_receipt, receipt_instructions, is_active, sort_order ON store_payment_methods BEGIN
  UPDATE store_revisions SET revision = revision + 1, payments_revision = payments_revision + 1
    WHERE owner_id IN (OLD.store_id, NEW.store_id);
END;
CREATE TRIGGER IF NOT EXISTS realtime_payments_delete AFTER DELETE ON store_payment_methods BEGIN
  UPDATE store_revisions SET revision = revision + 1, payments_revision = payments_revision + 1
    WHERE owner_id = OLD.store_id;
END;

CREATE TRIGGER IF NOT EXISTS realtime_admins_insert AFTER INSERT ON admins BEGIN
  UPDATE store_revisions SET revision = revision + 1, store_revision = store_revision + 1,
    payments_revision = payments_revision + 1 WHERE owner_id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS realtime_admins_update
AFTER UPDATE OF id, plan_id, subscription_end, subscription_start, is_trial, store_is_active, dashboard_is_active, hide_upgrade_ui ON admins BEGIN
  UPDATE store_revisions SET revision = revision + 1, store_revision = store_revision + 1,
    payments_revision = payments_revision + 1 WHERE owner_id IN (OLD.id, NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS realtime_admins_delete AFTER DELETE ON admins BEGIN
  UPDATE store_revisions SET revision = revision + 1, store_revision = store_revision + 1,
    products_revision = products_revision + 1, categories_revision = categories_revision + 1,
    payments_revision = payments_revision + 1 WHERE owner_id = OLD.id;
END;
