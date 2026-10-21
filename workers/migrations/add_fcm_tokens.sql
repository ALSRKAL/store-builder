-- جدول FCM Tokens للإشعارات الفورية
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL UNIQUE,
  device_type TEXT DEFAULT 'web',  -- web, android, ios
  device_info TEXT,                -- معلومات الجهاز (اختياري)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- فهرس للبحث السريع بالمتجر
CREATE INDEX IF NOT EXISTS idx_fcm_store_id ON fcm_tokens(store_id);

-- فهرس للـ token
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_token ON fcm_tokens(fcm_token);
