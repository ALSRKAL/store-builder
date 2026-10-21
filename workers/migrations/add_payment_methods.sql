-- =============================================
-- Migration: Add Payment Methods Table
-- نظام طرق الدفع الديناميكي حسب الدولة
-- =============================================

-- جدول طرق الدفع للمتاجر
CREATE TABLE IF NOT EXISTS store_payment_methods (
  id TEXT PRIMARY KEY,                    -- UUID فريد
  store_id TEXT NOT NULL,                 -- معرف المتجر (owner_id)
  provider_id TEXT NOT NULL,              -- معرف مزود الدفع (مثل: 'onecash', 'kurimi')
  country_code TEXT NOT NULL,             -- كود الدولة (مثل: 'YE', 'SA')
  label TEXT,                             -- تسمية مخصصة (مثل: "حساب OneCash الرئيسي")
  config_details TEXT NOT NULL,           -- JSON: تفاصيل الإعدادات (رقم الهاتف، اسم الحساب، إلخ)
  require_receipt INTEGER DEFAULT 0,      -- هل يتطلب رفع إيصال الدفع
  receipt_instructions TEXT,              -- تعليمات رفع الإيصال
  is_active INTEGER DEFAULT 1,            -- هل طريقة الدفع مفعلة
  sort_order INTEGER DEFAULT 0,           -- ترتيب العرض
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- جدول إيصالات الدفع المرفوعة
CREATE TABLE IF NOT EXISTS payment_receipts (
  id TEXT PRIMARY KEY,                    -- UUID فريد
  store_id TEXT NOT NULL,                 -- معرف المتجر
  payment_method_id TEXT NOT NULL,        -- معرف طريقة الدفع
  customer_name TEXT,                     -- اسم العميل
  customer_phone TEXT,                    -- رقم هاتف العميل
  amount REAL,                            -- المبلغ المحول
  receipt_image TEXT NOT NULL,            -- رابط صورة الإيصال
  notes TEXT,                             -- ملاحظات العميل
  status TEXT DEFAULT 'pending',          -- pending, approved, rejected
  admin_notes TEXT,                       -- ملاحظات الأدمن
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES store_payment_methods(id) ON DELETE CASCADE
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_id ON store_payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON store_payment_methods(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_country ON store_payment_methods(country_code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON store_payment_methods(store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_receipts_store_id ON payment_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON payment_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON payment_receipts(created_at);

-- Trigger لتحديث updated_at تلقائياً
CREATE TRIGGER IF NOT EXISTS update_payment_methods_timestamp 
AFTER UPDATE ON store_payment_methods
BEGIN
  UPDATE store_payment_methods SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_receipts_timestamp 
AFTER UPDATE ON payment_receipts
BEGIN
  UPDATE payment_receipts SET updated_at = datetime('now') WHERE id = NEW.id;
END;
