-- =============================================
-- جدول الطلبات
-- نظام الطلبات الكامل مع طرق الدفع
-- =============================================

-- جدول الطلبات
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                    -- UUID فريد
  store_id TEXT NOT NULL,                 -- معرف المتجر (owner_id)
  order_number TEXT NOT NULL,             -- رقم الطلب (مثل: ORD-001)
  
  -- بيانات العميل
  customer_name TEXT NOT NULL,            -- اسم العميل
  customer_phone TEXT NOT NULL,           -- رقم هاتف العميل
  customer_address TEXT,                  -- عنوان العميل (اختياري)
  customer_notes TEXT,                    -- ملاحظات العميل
  
  -- المنتجات
  items TEXT NOT NULL,                    -- JSON: قائمة المنتجات
  items_count INTEGER DEFAULT 1,          -- عدد المنتجات
  subtotal REAL DEFAULT 0,                -- المجموع الفرعي
  total REAL DEFAULT 0,                   -- المجموع الكلي
  currency TEXT DEFAULT 'YER',            -- العملة
  
  -- الدفع
  payment_method_id TEXT,                 -- معرف طريقة الدفع
  payment_provider_id TEXT,               -- معرف مزود الدفع
  payment_status TEXT DEFAULT 'pending',  -- pending, paid, failed
  receipt_image TEXT,                     -- صورة الإيصال (إذا مطلوب)
  
  -- حالة الطلب
  status TEXT DEFAULT 'new',              -- new, confirmed, processing, shipped, delivered, cancelled
  admin_notes TEXT,                       -- ملاحظات التاجر
  
  -- التواريخ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  
  FOREIGN KEY (store_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- فهارس الطلبات
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

-- Trigger لتحديث updated_at
CREATE TRIGGER IF NOT EXISTS update_orders_timestamp 
AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;
