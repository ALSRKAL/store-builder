# تشغيل DevOps وتفعيل GitHub Actions

## ما الذي أُعدّ فعليًا؟

- `Quality`: فحوص TypeScript والتغطية وlint والأسرار والتبعيات والترحيلات، ثم بناء الواجهة والـWorker واختبارات المتصفح.
- `Release`: آخر Quality ناجح من push على الفرع الافتراضي → بناء ملفَي staging/production من SHA نفسه → staging → إنتاج يدوي بموافقة.
- `Rollback`: رجوع للكود فقط بمعرّفات Worker/Pages متوافقة ومن الإصدار نفسه. لا استرجاع SQL تلقائي.
- `Monitor`: فحص دوري اختياري للموقع وreadiness؛ معطل حتى تضبط المتغيرات.
- Dependabot: طلبات تحديث التبعيات، ولا merge تلقائي يتجاوز الفحوص.

الأتمتة ليست ضمانًا بأن كل منطق جديد صحيح. التعديلات الجديدة تحتاج اختبارات وقبولًا؛ الفحوص تمنع التعديل المعروف فشله من الوصول إلى الإنتاج.

## 1. الأدوات المحلية

Node مثبت في `.nvmrc` على `24.22.3`، وnpm في `packageManager`. Wrangler واحد من lockfile الجذر؛ مجلد workers لا يحتاج تثبيت نسخة مستقلة.

```bash
nvm install
nvm use
npm ci
npm exec --no -- playwright install --with-deps chromium
npm run verify:ci
```

تشغيل `verify:ci` محليًا لا يتصل بقاعدة الإنتاج. اختبارات المتصفح تستخدم App حقيقيًا وMiniflare/D1/R2/DO محلية، وتمنع طلبات الشبكة الخارجية غير المتوقعة. المصادقة وهمية في harness فقط؛ اختبار إنتاج منفصل يبني المدخل الحقيقي بدون هذه البدائل.

### سياسة الجودة

- الأخطاء تمنع النجاح؛ تحذيرات lint القديمة محددة في `scripts/lint-baseline.json`، وزيادتها ممنوعة.
- التغطية تحسب ملفات الواجهة والـWorker كلها، لا الملفات المختبرة فقط. التغطية الحالية منخفضة وليست 90%؛ حدود البداية تحفظ القياس الحالي ضد التراجع، وتُرفع مع إضافة الاختبارات.
- التغطية داخل Vitest لا تحتسب التنفيذ داخل workerd/اختبارات المتصفح. لذلك اختبارات المتصفح والترحيلات بوابات مستقلة، لا بديلًا عن التغطية.
- `security:audit` يمنع high/critical. `scripts/audit-exceptions.json` فارغ؛ لا استثناء تلقائي. أي استثناء يحتاج advisory/package/reason/expiry ومراجعة.
- الصور والتقارير تحفظ عند الفشل. لا تُولّد بصمات screenshots تلقائيًا في CI.

## 2. GitHub المطلوب

المجلد الحالي Git على فرع `master`، ولم يكن له remote أثناء الإعداد. تسجيل الدخول المحلي لـGitHub لا يربط هذا المشروع تلقائيًا.

1. جهّز مستودعًا لهذا المجلد، ثم اربط remote وادفع التغييرات بإذن صريح.
2. اختر default branch؛ workflows تكتشفه وتمنع النشر من PR/fork أو فرع غير معتمد.
3. فعّل branch protection: منع push المباشر، طلب مراجعة، والفحص المطلوب `Quality / quality` بعد ظهور اسمه في أول run.
4. أنشئ Environment باسم `staging` وأخرى `production`.
5. في production: required reviewers، منع self-review، منع admin bypass. الكود يتحقق من هذه الحماية عبر GitHub API ويتوقف إذا لم تكن مدعومة.

**تنبيه خطة GitHub:** في Free/Pro/Team قد تكون required reviewers متاحة فقط للمستودع العام. المستودع الخاص يحتاج خطة/حماية تدعم هذه الميزة. هذا التنفيذ لا يخفف الموافقة إلى نشر غير محمي إذا كانت الميزة غير متاحة.

المتغيرات العامة على repository:

```text
PRODUCTION_APPROVAL_CONFIGURED=true
PRODUCTION_APPROVAL_MODE=required-reviewers
RELEASE_STAGING_CONFIG=<JSON>
RELEASE_PRODUCTION_CONFIG=<JSON>
```

## 3. Cloudflare وFirebase المطلوب

staging منفصلة فعلًا: Worker وPages وD1 وR2 وDO وFirebase مستقلّة عن الإنتاج. لا تنشئ موارد مدفوعة دون تأكيد. تحتاج:

- Cloudflare account ID، وأسماء/IDs الموارد الموجودة، وعناوين API/site/R2.
- Pages production branch لكل مشروع؛ staging هنا مشروع منفصل وليس preview يمس الإنتاج.
- D1 الحالي: schema وسجل الترحيلات، ونسخة/مرجع استعادة قبل أول اعتماد.
- Worker الحالي: حالة migration إنشاء SQLite DO `store-realtime-v1` والإصدارات الحالية.
- Firebase Auth: Email/Password وGoogle حسب الاستخدام، وauthorized domains للموقعين.
- إعدادات Firebase/VAPID العامة؛ أسرار حساب FCM في GitHub Environment/Worker فقط.

ضع في **Secrets لكل Environment**، وليس المحادثة أو المستودع:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
WORKER_SECRETS_JSON
```

Token يكون محدود الحساب والصلاحيات اللازمة لـWorkers/Pages/D1/R2؛ لا تستخدم Global API Key. مثال شكل `WORKER_SECRETS_JSON`، لا قيم حقيقية:

```json
{
  "FCM_CLIENT_EMAIL": "<service-account-email>",
  "FCM_PRIVATE_KEY": "<private-key>"
}
```

مفاتيح غير مصرّح بها أو `null` مرفوضة، حتى لا يفسرها Wrangler على أنها حذف سر. إعداد FCM مطلوب في سياسة الإصدار الحالية.

### شكل إعداد كل بيئة

الأسماء التالية أمثلة وليست موارد منشأة. `resourcesProvisioned` لا تجعل الموارد موجودة؛ preflight يتحقق منها عند النشر.

```json
{
  "environment": "staging",
  "accountId": "<32-hex-account-id>",
  "workerName": "store-staging-api",
  "pagesProject": "store-staging",
  "pagesBranch": "master",
  "d1": { "binding": "DB", "name": "store-staging-db", "id": "<database-uuid>" },
  "r2": { "binding": "R2_BUCKET", "bucket": "store-staging-images" },
  "durableObject": { "binding": "STORE_REALTIME", "className": "StoreRealtime", "migrationTag": "store-realtime-v1" },
  "apiUrl": "https://<staging-api-host>",
  "siteUrl": "https://<staging-site-host>",
  "readinessUrl": "https://<staging-api-host>/api/ready",
  "r2PublicUrl": "https://<staging-images-host>",
  "firebase": {
    "apiKey": "<public-config>",
    "authDomain": "<project>.firebaseapp.com",
    "projectId": "<project>",
    "storageBucket": "<project>.firebasestorage.app",
    "messagingSenderId": "<public-config>",
    "appId": "<public-config>",
    "vapidKey": "<public-config>"
  },
  "requiredWorkerSecrets": ["FCM_CLIENT_EMAIL", "FCM_PRIVATE_KEY"],
  "resourcesProvisioned": true,
  "compatibilityDate": "2025-12-23"
}
```

الإنتاج JSON مستقل مع `environment: production`. أسماء/IDs وأصول API/site/R2 وFirebase يجب أن تختلف. لا تستخدم بيانات وهمية للنشر الحقيقي.

## 4. D1: التثبيت الجديد واعتماد قاعدة موجودة

السلسلة المعتمدة في `workers/migrations-managed/`:

- `0001_baseline.sql`: البنية الأساسية كاملة.
- `0002_store_revisions.sql`: revisions والـtriggers.
- `0003_trial_ledger.sql`: تاريخ استعمال التجربة الدائم.

manifest يحفظ SHA256. التاريخ مستقل `app_schema_migrations` ولا يخلط مع `d1_migrations` القديمة. لا تعدّل migration سبق اعتماده. SQL الحذفي والتجارب العامة/trigger غير المراجع محظورة؛ إضافة trigger جديدة تحتاج مراجعة سياسة واضحة، وليس تحديث manifest وحده.

```bash
npm run db:check
npm run db:test
node scripts/db/migrations.mjs inspection-sql
```

`inspection-sql` يخرج SELECT قراءة فقط. الـrelease يستعمل Wrangler لالتقاط مرحلتَي schema/checks، ثم يحولهما إلى inventory ويخطط. قاعدة فارغة تُثبت، وقاعدة مطابقة كاملة يمكن اعتماد prefix لها بعد إثبات؛ قاعدة ناقصة/مجهولة تتوقف وتتطلب معالجة منفصلة.

### اعتماد قاعدة إنتاج قديمة مرة واحدة

لا تشغّل schema.sql أو مجلد migrations القديم عشوائيًا. بعد فحص schema ونسخة SQL خاصة قابلة للاستعادة:

```bash
node scripts/db/migrations.mjs inspect --capture schema.json --checks checks.json --target <database-id> --out inventory.json
node scripts/db/migrations.mjs plan --inventory inventory.json --out plan.json
node scripts/db/migrations.mjs proof --inventory inventory.json --backup backup.sql --acknowledge reviewed --out proof.json
node scripts/db/migrations.mjs plan --inventory inventory.json --proof proof.json --out approved-plan.json
node scripts/db/migrations.mjs materialize --inventory inventory.json --plan approved-plan.json --proof proof.json --out reviewed-batches
```

هذه الأوامر محلية لا تنفذ remote SQL. نفّذ batches فقط ضمن عملية منفصلة مصرح بها على DB التي يطابقها inventory وبعد مراجعة البيانات؛ إعادة الفحص واجبة إذا تغير schema/history/target.

للنسخ الصغيرة فقط يوجد transport اختياري في Secrets: `DB_ADOPTION_PROOF_JSON` و`DB_ADOPTION_BACKUP_BASE64`، مع تحقق من bytes/hash. GitHub Secret حدّه 48KB؛ backup كبير **لا يُضغط داخل هذه الآلية**. الأفضل اعتماد قاعدة الإنتاج الكبيرة يدويًا بشكل آمن قبل pipeline. لا ترفع backup أو proof أو captures الحساسة كـartifacts عامة، ولا تحفظها في Git.

Time Travel bookmark مرجع استعادة وليس نسخة SQL؛ الإصدار يلتقطه ويتوقف إذا لم يوجد. الاستعادة لها أثر على البيانات وتحتاج قرارًا بشريًا؛ لا تلقائية.

## 5. إصدار اعتيادي

1. Pull Request → Quality كاملة.
2. Merge إلى default branch → Quality push، ثم Release staging.
3. artifacts staging/production تُبنى من SHA نفسه بإعدادات البيئة الصحيحة، دون أسرار cloud.
4. staging: فحص الموارد → D1 checkpoint/plan/materialize → ترحيلات متوافقة → Worker → readiness/releaseId → Pages → release marker.
5. شغّل Release يدويًا مع `staging_run_id` لآخر إصدار staging ناجح. بعد الموافقة، تُنزّل artifact إنتاج نفسها بدون إعادة بناء.
6. احتفظ بـrelease report وWorker version وPages deployment ID؛ تمنع concurrency نشرين متداخلين.

نجاح command وحده لا يكفي: ما بعد الترحيل يجب ألا يبقى pending، والـWorker وPages يجب أن يحملَا الإصدار الصحيح.

## 6. معالجة الإخفاق والرجوع

- **Quality فشلت:** راجع artifact الاختبارات/lint/security؛ لا تتجاوز الفحوص.
- **Migration preflight فشل:** لا تجرّب إعادة تشغيل ملفات قديمة. راجع schema/history/backup/adoption.
- **ترحيل نجح وWorker فشل:** البيانات تغيّرت؛ أوقف نشر Pages. أصلح forward أو ارجع لكود متوافق بعد مراجعة. لا تفترض الرجوع للبيانات.
- **Readiness فشلت:** `/api/health` liveness فقط، `/api/ready` يفحص schema/R2/DO المطلوبة قراءةً. تفاصيل الأسرار لا تُعرض.
- **Rollback:** شغّل workflow يدويًا مع SHA/Quality وWorker/Pages IDs و`code-only-no-sql` وتأكيد schema compatible. يجب أن يطابق RELEASE_ID الكامل، موارد DB/R2/Firebase، وDO migration tag.
- Pages rollback فقط لإصدار production ناجح ومحتفظ به. تغيير secrets أو DO migration يمنع rollback بدل force.

## 7. مراقبة اختيارية

Repository variables:

```text
MONITORING_ENABLED=true
MONITOR_URLS_JSON=[{"kind":"readiness","url":"https://<api>/api/ready"},{"kind":"site","url":"https://<site>"}]
```

workflow يعطي نتيجة وإخفاقًا في GitHub؛ لا توجد قناة Slack/WhatsApp مُفعّلة. فعّل إشعارات GitHub أو أضف قناة معتمدة لاحقًا. لا يوجد إصلاح تلقائي لكود الأعمال أو استرجاع بيانات غير مراقب.

## 8. حالة الربط ومتطلبات أول نشر

تم ربط المشروع بالمستودع العام `ALSRKAL/store-builder` على `main`، مع حماية `protect-main` (منع الحذف وforce-push) وSecret Scanning/Push Protection. بيئتا GitHub `staging` و`production` موجودتان. المتغيرات: `RELEASE_PRODUCTION_CONFIG` و`RELEASE_STAGING_CONFIG` و`CLOUDFLARE_ACCOUNT_ID`. الأسرار: `CLOUDFLARE_API_TOKEN` في البيئتين، و`WORKER_SECRETS_JSON` في الإنتاج وstaging (بلا قيم في Git).

### بيئة staging المنشأة (تجريبية، ليست الإنتاج)

| المورد | الاسم/المعرّف |
|---|---|
| D1 | `store-staging-db` — `1cea1e99-a108-45b6-abab-e802e63fb9c2` |
| R2 | `store-staging-images` — عام عبر `https://pub-381deb7f60864eeb8b03e1fdac0b90dd.r2.dev` |
| Pages | `store-staging` — `https://store-staging-bk4.pages.dev` (branch `main`) |
| Worker | `store-staging-api` |
| Firebase | مشروع مستقل `store-staging-947` (Auth Email/Password + Google، النطاق `store-staging-bk4.pages.dev` مصرّح) |

قرار Firebase: أصبح staging منفصلًا بالكامل عن الإنتاج، بما في ذلك Firebase Auth. VAPID والإعداد العام في `.secrets/staging-firebase.env`، وحساب خدمة Firebase Admin/FCM في `.secrets/firebase-staging-service-account.json` (كلاهما مستثنى من Git). لا توجد مشاركة لمجمع مستخدمي الإنتاج.

### المتبقي قبل الإنتاج
1. **بوابة الموافقة:** المستودع أصبح عامًا، وأُضيف `alsrkal2` كـRequired Reviewer لبيئة `production` مع `prevent_self_review=true` و`can_admins_bypass=false`، وفُعّل `PRODUCTION_APPROVAL_CONFIGURED=true`.
2. **D1 الإنتاج:** ليس فارغًا. الفحص القراءة فقط وجد غياب `admins.trial_used` وغياب `error_logs` و`rate_limits` و`store_revisions` و`store_slug_aliases` و`trial_ledger` وmanaged history. يلزم قبل الترحيل: نسخة قابلة للاستعادة، ثم `ALTER TABLE admins ADD COLUMN trial_used INTEGER DEFAULT 0` (توافق إضافي مراجع)، ثم خطة adoption/proof والتحقق من invariants. لا تُنفّذ هذه الكتابة دون نسخة احتياطية ومراجعة.

### خطوات ترحيل الإنتاج الأول (مُراجعة ومحاكاة محليًا)

على نسخة محلية من نسخة الإنتاج الاحتياطية، نجحت الخطوات التالية وأعادت `foreignKeys/revisionCoverage/aliasCoverage/trialCoverage = 0`:

1. `ALTER TABLE admins ADD COLUMN trial_used INTEGER DEFAULT 0;`
2. تطبيق `workers/migrations-managed/0001_baseline.sql` (كله `IF NOT EXISTS`) لإنشاء `rate_limits` و`error_logs` والفهارس/triggers الناقصة.
3. `DELETE FROM usage WHERE user_id NOT IN (SELECT id FROM admins);` — يحذف صف usage يتيمًا واحدًا كان يفشل `PRAGMA foreign_key_check`.
4. بعد ذلك يصبح المخطط مطابقًا لـmanifest baseline (مع اختلاف ترتيب أعمدة فقط، يقبله فحص `schemaCompatible` الجديد)، ثم يُطبَّق proof/adoption ثم 0002/0003.

نسخة الإنتاج الحالية 210KB، وbase64 لها نحو 281KB > حد GitHub 48KB للسر الواحد؛ لذلك يدعم `cli.mjs` الآن `DB_ADOPTION_BACKUP_BASE64_1..8` (أجزاء متصلة بالترتيب) إضافة إلى المتغير المفرد للنسخ الصغيرة.


تظهر نتائج التشغيل الفعلية في تبويب Actions للمستودع؛ نجاح CI لا يعني نشرًا حيًا ناجحًا. ملفات النسخ الاحتياطية وcaptures لا تحفظ في Git ولا ترفع علنًا.

التغطية العامة بداية منخفضة (قرابة 15% lines في أول قياس)؛ المسارات الحساسة لها اختبارات وحدة/SQLite ومتصفح، لكن لا تدّعي هذه المنظومة أن كل صفحة مختبرة. زد الاختبارات عند أي ميزة جديدة.

## المصادر الرسمية

- [Workers على GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [D1 migrations وتاريخها](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 batch والمعاملات](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Worker versions وrollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
- [Pages rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Playwright CI](https://playwright.dev/docs/ci)

تم التحقق من صيغة Wrangler أيضًا من help/المصدر المثبت؛ commands cloud الحقيقية بقيت غير منفذة.
