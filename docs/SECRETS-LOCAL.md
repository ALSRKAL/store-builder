# أسرار محلية (لا تُرفع إلى Git)

## Cloudflare

- **الملف:** `store-app/.secrets/cloudflare.env`
- **المحتوى:** `CLOUDFLARE_ACCOUNT_ID` و`CLOUDFLARE_API_TOKEN`
- **الحالة:** مستثنى من Git عبر `.secrets/` في `.gitignore`، ومُضاف كسر في GitHub:
  - Environment `production`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `WORKER_SECRETS_JSON`
  - Environment `staging`: `CLOUDFLARE_API_TOKEN`
- **الصلاحيات:** Workers Scripts / Cloudflare Pages / D1 / Workers R2 Storage — مستوى Edit، على مستوى الحساب.
- **التحقق:** `GET /user/tokens/verify` + قراءة D1/Pages/R2/Workers (200).

### كيف يستخدمه وكيل محلي؟

```bash
cd store-app
set -a; . .secrets/cloudflare.env; set +a
npm exec --no -- wrangler whoami
```

أو لتمرير متغيرات إصدار:

```bash
set -a; . .secrets/cloudflare.env; set +a
GH_HOST=github.com gh secret set CLOUDFLARE_API_TOKEN --env production \
  --repo ALSRKAL/store-builder < <(sed -n 's/^CLOUDFLARE_API_TOKEN=//p' .secrets/cloudflare.env)
```

> ⚠️ لا تضع هذا الملف في أي Archive أو نسخة احتياطية تُشارك، ولا تنسخه إلى `public/` أو حزمة الواجهة.
> على نظام الملفات الحالي لا يُطبَّق `chmod 600` (القرص يعرض 777)، فالحماية تعتمد على استثناء Git وحدود الجهاز.

## Firebase / FCM

- **الإنتاج:** مشروع `store-e82a9`؛ حساب خدمة FCM في ملف خارج المشروع باسم `store-e82a9-firebase-adminsdk-*.json` (لا يُنسخ للمشروع).
- **Staging:** مشروع منفصل `store-staging-947`.
  - الإعداد العام وVAPID (مفتاح عام): `.secrets/staging-firebase.env`
  - حساب خدمة Firebase Admin/FCM (مفتاح خاص): `.secrets/firebase-staging-service-account.json`
- في GitHub: `WORKER_SECRETS_JSON` يحتوي `FCM_CLIENT_EMAIL` و`FCM_PRIVATE_KEY` فقط، ولكل بيئة مشروع Firebase مطابق.
- هذان الملفان مستثنيان من Git عبر `.secrets/`؛ لا تُنسخ قيمهما إلى أي ملف يُرفع.


## قواعد

1. لا تطبع قيمة أي سر في المحادثة أو السجلات.
2. لا تُضف هذه الملفات إلى Git ولو بـ`-f`.
3. عند تدوير التوكن: أنشئ بديلًا في Cloudflare، حدّث `.secrets/cloudflare.env` وأسرار GitHub، ثم احذف القديم.
