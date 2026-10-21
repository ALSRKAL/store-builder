/**
 * Terms — legal document layout.
 * Same text; no card-per-section, no centered heading, no tinted panels.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import Wordmark from '../components/brand/Wordmark';

const sectionClass = 'border-t border-border py-7';
const headingClass = 'mb-4 font-display text-h2 font-semibold leading-snug text-foreground';
const subheadingClass = 'mb-2 mt-5 font-display text-[1.0625rem] font-semibold text-foreground';
const paragraphClass = 'mb-3 text-body leading-[1.85] text-fg-muted';
const listClass = 'mb-3 list-disc space-y-2 ps-5 text-body leading-[1.85] text-fg-muted';
const strongClass = 'font-semibold text-foreground';

export default function Terms(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[820px] items-center justify-between px-5">
          <Link to="/" className="inline-flex min-h-11 items-center" aria-label="StoreBuilder — الرئيسية">
            <Wordmark size="sm" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-label font-medium text-fg-muted transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-16 pt-10">
        <p className="text-label text-fg-subtle">وثيقة قانونية</p>
        <h1 className="mt-2 max-w-[24ch] font-display text-h1 font-semibold leading-snug text-foreground">
          اتفاقية الاستخدام وإخلاء المسؤولية القانونية
        </h1>

        <div className="mt-7 border-s-2 border-warning bg-surface px-4 py-3 text-label leading-relaxed text-fg-muted">
          <strong className="font-semibold text-warning">تنويه هام:</strong> صيغت هذه الوثيقة لحماية مالك
          المنصة من أي مسؤولية قانونية أو مالية ناتجة عن استخدام التجار أو المشتركين للنظام.
        </div>

        <div className="mt-8">
          <section className={sectionClass}>
            <h2 className={headingClass}>1. مقدمة وتعريفات</h2>
            <p className={paragraphClass}>
              تُعد هذه الاتفاقية عقداً ملزماً بين <strong className={strongClass}>StoreBuilder</strong> (يشار إليها
              بـ &quot;النظام&quot; أو &quot;الطرف الأول&quot;) وبين{' '}
              <strong className={strongClass}>التاجر/المشترك</strong> (يشار إليه بـ &quot;الطرف الثاني&quot; أو
              &quot;التاجر&quot;).
            </p>
            <p className={paragraphClass}>
              بمجرد التسجيل أو استخدام المنصة، يقر التاجر بقراءة وفهم وقبول كافة الشروط الواردة أدناه. تهدف المنصة
              إلى تقديم خدمة تقنية (SaaS) لإنشاء متاجر إلكترونية تعمل ككتالوج لعرض المنتجات واستقبال الطلبات عبر
              تطبيق &quot;WhatsApp&quot;، ودورنا يقتصر على توفير البنية التحتية التقنية فقط.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>2. طبيعة الخدمة وحدود المسؤولية</h2>
            <h3 className={subheadingClass}>2.1 الحيادية التامة</h3>
            <p className={paragraphClass}>
              المنصة مجرد أداة تقنية لتمكين التجار من عرض منتجاتهم.{' '}
              <strong className={strongClass}>نحن لسنا طرفاً في أي عملية بيع أو شراء</strong> تتم بين التاجر
              وعملائه. جميع المعاملات والاتفاقات والمدفوعات تتم خارج نطاق سيطرة المنصة.
            </p>
            <h3 className={subheadingClass}>2.2 إخلاء المسؤولية عن المعاملات التجارية</h3>
            <ul className={listClass}>
              <li><strong className={strongClass}>لا تتحمل المنصة أي مسؤولية</strong> عن جودة المنتجات أو قانونيتها أو سلامتها أو مطابقتها للمواصفات المعروضة.</li>
              <li><strong className={strongClass}>المنصة غير مسؤولة</strong> عن فشل التاجر في تسليم المنتجات أو استرداد الأموال.</li>
              <li>أي نزاع ينشأ بين التاجر والعميل النهائي يُحل بينهما مباشرة دون تدخل أو مسؤولية على مالك المنصة.</li>
            </ul>
            <h3 className={subheadingClass}>2.3 إخلاء المسؤولية عن المحتوى</h3>
            <ul className={listClass}>
              <li>التاجر هو المسؤول الوحيد والحصري عن جميع النصوص والصور والبيانات التي يرفعها على متجره.</li>
              <li>لا تقوم المنصة بمراجعة استباقية لكل المحتوى، لكنها تحتفظ بالحق في إزالة أي محتوى ينتهك السياسات دون إنذار.</li>
              <li>يتحمل التاجر المسؤولية القانونية الكاملة في حال انتهاكه حقوق الملكية الفكرية لطرف ثالث.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>3. التزامات التاجر</h2>
            <p className={paragraphClass}>يقر ويتعهد التاجر بما يلي:</p>
            <ol className={cn(listClass, 'list-decimal')}>
              <li><strong className={strongClass}>الامتثال للقوانين:</strong> عدم استخدام المنصة لبيع سلع أو خدمات مجرّمة قانوناً.</li>
              <li><strong className={strongClass}>الصدق والشفافية:</strong> تقديم وصف دقيق للمنتجات وعدم تضليل العملاء.</li>
              <li><strong className={strongClass}>التراخيص:</strong> الحصول على كافة التراخيص الحكومية والتجارية اللازمة لنشاطه.</li>
              <li><strong className={strongClass}>سياسة الخصوصية:</strong> التاجر مسؤول عن توضيح سياسة الخصوصية الخاصة به لعملائه.</li>
            </ol>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>4. حماية البيانات والخصوصية</h2>
            <h3 className={subheadingClass}>4.1 دور المنصة</h3>
            <p className={paragraphClass}>
              نعمل كـ &quot;معالج للبيانات&quot; فيما يخص بيانات عملاء التاجر. نخزّن ونعرض البيانات نيابة عنه لغرض
              تشغيل الخدمة فقط.
            </p>
            <h3 className={subheadingClass}>4.2 دور التاجر</h3>
            <p className={paragraphClass}>
              التاجر هو &quot;مراقب البيانات&quot; والمسؤول الأول أمام الجهات القانونية والعملاء عن:
            </p>
            <ul className={listClass}>
              <li>جمع البيانات بطريقة قانونية.</li>
              <li>الحصول على موافقة العملاء قبل مراسلتهم عبر WhatsApp.</li>
              <li>التعامل مع طلبات حذف البيانات أو تعديلها المقدمة من عملائه.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>5. المحتوى المحظور</h2>
            <ol className={cn(listClass, 'list-decimal')}>
              <li>يمنع منعاً باتاً نشر أي محتوى يحرض على العنف أو العنصرية أو الكراهية أو يحتوي مواد إباحية.</li>
              <li>يحق للمنصة الإبلاغ عن أي متجر مخالف، وستُتخذ إجراءات فورية قد تصل إلى <strong className={strongClass}>الحذف النهائي للمتجر</strong> وحظر الحساب دون استرداد رسوم الاشتراك.</li>
              <li>يجب أن يكون المحتوى مملوكاً للتاجر. بيع السلع المقلدة يؤدي إلى الإغلاق الفوري للحساب.</li>
            </ol>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>6. حقوق الملكية الفكرية</h2>
            <p className={paragraphClass}>
              جميع حقوق الملكية الفكرية المتعلقة ببرمجيات المنصة والأكواد المصدرية والتصاميم والشعارات هي ملكية
              حصرية لـ StoreBuilder. يُمنع التاجر من نسخ أو تعديل أو هندسة النظام عكسياً.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>7. المدفوعات والاشتراكات</h2>
            <ul className={listClass}>
              <li>الاشتراكات المدفوعة للمنصة غير قابلة للاسترداد إلا في الحالات التي يقررها مالك المنصة بمحض إرادته.</li>
              <li>توقف التاجر عن استخدام الخدمة لا يعفيه من المستحقات المالية السابقة.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>8. الإنهاء والإيقاف</h2>
            <p className={paragraphClass}>تحتفظ المنصة بالحق الكامل في:</p>
            <ul className={listClass}>
              <li>تعليق أو إنهاء حساب أي تاجر فوراً ودون إنذار في حال انتهاك أي بند من هذه الاتفاقية.</li>
              <li>تعديل أو إيقاف الخدمة مؤقتاً أو دائماً لأغراض الصيانة أو التطوير.</li>
            </ul>
          </section>

          <section className="border-t-2 border-foreground py-7">
            <h2 className="mb-3 font-display text-h2 font-semibold text-foreground">الموافقة</h2>
            <p className="text-body font-medium leading-[1.85] text-fg-muted">
              إكمالك لعملية التسجيل وإنشاء المتجر يُعتبر توقيعاً إلكترونياً وموافقة صريحة وكاملة على كافة البنود
              أعلاه.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-5 text-label text-fg-subtle">
          <span>© {new Date().getFullYear()} StoreBuilder</span>
          <span>جميع الحقوق محفوظة</span>
        </div>
      </footer>
    </div>
  );
}
