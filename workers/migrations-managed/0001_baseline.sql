-- Immutable managed baseline. Only apply to an empty database.
-- schema.sql + distinct legacy migrations + runtime settings/error_logs; no trial default backfill.
-- =============================================
-- Cloudflare D1 Schema for Store App
-- Migration from Firebase Firestore
-- =============================================

-- جدول المتاجر
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,                    -- slug (unique identifier)
  slug TEXT UNIQUE NOT NULL,              -- URL slug
  name TEXT NOT NULL,                     -- اسم المتجر
  whatsapp TEXT,                          -- رقم الواتساب
  logo TEXT,                              -- رابط الشعار
  owner_id TEXT NOT NULL,                 -- Firebase UID
  theme TEXT,                             -- JSON: إعدادات الثيم
  currency TEXT DEFAULT 'SAR',            -- العملة
  location TEXT,                          -- JSON: الموقع
  announcement TEXT,                      -- JSON: الشريط الإعلاني
  social_links TEXT,                      -- JSON: روابط التواصل الاجتماعي
  is_active INTEGER DEFAULT 1,            -- حالة المتجر
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول الأدمن/المشتركين
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,                    -- Firebase UID
  email TEXT UNIQUE NOT NULL,
  store_name TEXT,
  store_id TEXT,                          -- references stores(id)
  slug TEXT,
  whatsapp TEXT,
  logo TEXT,
  subscription_code TEXT,
  subscription_start TEXT,
  subscription_end TEXT,
  subscription_months INTEGER DEFAULT 0,
  plan_id TEXT DEFAULT 'trial',
  is_trial INTEGER DEFAULT 1,
  trial_used INTEGER DEFAULT 0,           -- هل استخدم الفترة التجريبية من قبل
  dashboard_is_active INTEGER DEFAULT 1,
  store_is_active INTEGER DEFAULT 1,
  hide_upgrade_ui INTEGER DEFAULT 0,
  code_history TEXT,                      -- JSON array
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  whatsapp_api_key TEXT DEFAULT NULL
);

-- جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,                 -- references admins(id) - owner UID
  name TEXT NOT NULL,
  price REAL DEFAULT 0,
  description TEXT,
  images TEXT,                            -- JSON array of URLs
  category_id TEXT,
  colors TEXT,                            -- JSON array
  sizes TEXT,                             -- JSON array
  discount REAL DEFAULT 0,
  in_stock INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- جدول التصنيفات
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,                 -- references admins(id) - owner UID
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- جدول أكواد الاشتراك
CREATE TABLE IF NOT EXISTS subscription_codes (
  code TEXT PRIMARY KEY,
  months INTEGER NOT NULL,
  plan_id TEXT,
  used INTEGER DEFAULT 0,
  used_by TEXT,                           -- Firebase UID
  used_by_email TEXT,
  used_at TEXT,
  expires_at TEXT,                        -- تاريخ انتهاء صلاحية الكود
  created_at TEXT DEFAULT (datetime('now'))
);

-- جدول تتبع الاستخدام
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                  -- Firebase UID
  actions TEXT,                           -- JSON array
  last_action TEXT,
  total_product_add INTEGER DEFAULT 0,
  total_product_edit INTEGER DEFAULT 0,
  total_product_delete INTEGER DEFAULT 0,
  total_category_add INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- =============================================
-- Indexes for better performance
-- =============================================

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);

-- Admins indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_store_id ON admins(store_id);
CREATE INDEX IF NOT EXISTS idx_admins_subscription_end ON admins(subscription_end);
CREATE INDEX IF NOT EXISTS idx_admins_plan_id ON admins(plan_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_store_created ON products(store_id, created_at DESC);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_name ON categories(store_id, name);

-- Subscription codes indexes
CREATE INDEX IF NOT EXISTS idx_codes_used ON subscription_codes(used);
CREATE INDEX IF NOT EXISTS idx_codes_used_by ON subscription_codes(used_by);

-- Usage indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE TRIGGER IF NOT EXISTS update_stores_timestamp 
AFTER UPDATE ON stores
BEGIN
  UPDATE stores SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_admins_timestamp 
AFTER UPDATE ON admins
BEGIN
  UPDATE admins SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
END;


-- =============================================
-- Payment Methods Table
-- نظام طرق الدفع الديناميكي حسب الدولة
-- =============================================

-- جدول طرق الدفع للمتاجر
CREATE TABLE IF NOT EXISTS store_payment_methods (
  id TEXT PRIMARY KEY,                    -- UUID فريد
  store_id TEXT NOT NULL,                 -- معرف المتجر (owner_id)
  provider_id TEXT NOT NULL,              -- معرف مزود الدفع (مثل: 'onecash', 'kurimi')
  country_code TEXT NOT NULL,             -- كود الدولة (مثل: 'YE', 'SA')
  label TEXT,                             -- تسمية مخصصة (مثل: "حساب OneCash الرئيسي")
  config_details TEXT NOT NULL,           -- JSON: تفاصيل الإعدادات
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

-- فهارس طرق الدفع
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_id ON store_payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON store_payment_methods(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_country ON store_payment_methods(country_code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON store_payment_methods(store_id, is_active);

-- فهارس الإيصالات
CREATE INDEX IF NOT EXISTS idx_receipts_store_id ON payment_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON payment_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON payment_receipts(created_at);

-- Trigger لتحديث updated_at
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

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  path TEXT,
  method TEXT,
  user_id TEXT,
  ip TEXT,
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  context TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
