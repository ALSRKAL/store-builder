-- إضافة حقل مفتاح API للواتساب
ALTER TABLE admins ADD COLUMN whatsapp_api_key TEXT DEFAULT NULL;
