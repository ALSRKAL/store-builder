-- =============================================
-- Rate Limiting Table
-- حماية الـ API من الطلبات المفرطة
-- =============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,                    -- IP + endpoint hash
  ip TEXT NOT NULL,                       -- عنوان IP
  endpoint TEXT NOT NULL,                 -- المسار (مثل: /api/products)
  request_count INTEGER DEFAULT 1,        -- عدد الطلبات
  window_start TEXT NOT NULL,             -- بداية النافذة الزمنية
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON rate_limits(ip, endpoint);

-- Trigger لتحديث updated_at
CREATE TRIGGER IF NOT EXISTS update_rate_limits_timestamp 
AFTER UPDATE ON rate_limits
BEGIN
  UPDATE rate_limits SET updated_at = datetime('now') WHERE id = NEW.id;
END;
