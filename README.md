# متجر إلكتروني احترافي

متجر إلكتروني متكامل مبني بـ React مع لوحة تحكم للأدمن.

## البنية التقنية

- **Frontend**: React + Vite
- **Authentication**: Firebase Auth
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **API**: Cloudflare Workers

## المميزات

### المتجر
- عرض المنتجات بتصميم عصري وجذاب
- دعم الألوان والمقاسات المتعددة
- معرض صور للمنتج مع إمكانية التنقل
- البحث والتصفية حسب الفئات
- زر الطلب عبر واتساب
- سلة تسوق ذكية
- وضع عرض الستوري
- تصميم متجاوب للهواتف

### لوحة التحكم
- تسجيل دخول آمن (Google + Email)
- نظام اشتراكات بأكواد
- إدارة المنتجات (إضافة/تعديل/حذف)
- إدارة التصنيفات
- تخصيص المظهر والثيمات
- رفع الصور إلى Cloudflare R2
- عرض مدة الاشتراك المتبقية

## التثبيت

### 1. إعداد Firebase (للمصادقة فقط)

1. أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com)
2. فعّل Authentication (Email/Password + Google)
3. انسخ إعدادات المشروع

### 2. إعداد Cloudflare

1. أنشئ حساب في [Cloudflare](https://cloudflare.com)
2. أنشئ قاعدة بيانات D1
3. أنشئ bucket في R2
4. انشر Workers API

### 3. إعداد المشروع

```bash
cd store-app
npm install
```

### 4. إنشاء ملف .env

```env
# Firebase Auth Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudflare R2 Public URL
VITE_R2_PUBLIC_URL=https://your-r2-bucket.r2.dev

# Cloudflare Workers API URL
VITE_API_URL=https://your-api.workers.dev
```

### 5. تشغيل المشروع

```bash
npm run dev
```

## الروابط

- المتجر: `/store/{storeId}`
- لوحة التحكم: `/admin`

## النشر

### Cloudflare Pages
```bash
npm run build
npm run pages:deploy
```

### Cloudflare Workers (API)
```bash
cd workers
npm run deploy
```

## تطبيق Flutter (مولد الأكواد)

راجع مجلد `subscription_generator` لتطبيق إدارة الاشتراكات.
