-- جدول اشتراكات الإشعارات الفورية
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- فهرس للبحث السريع بالمتجر
CREATE INDEX IF NOT EXISTS idx_push_store_id ON push_subscriptions(store_id);

-- فهرس للـ endpoint
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
