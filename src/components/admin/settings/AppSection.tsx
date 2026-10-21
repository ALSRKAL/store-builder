import { Check, MessageCircle, Smartphone } from 'lucide-react';
import { APP_PRICES, getWhatsAppLink, WHATSAPP_MESSAGES } from '../../../config/contact';
import { Button } from '../../ui';

interface AppSectionProps {
  storeName?: string | undefined;
}

/**
 * "حوّل متجرك لتطبيق" — three ruled columns; no cards, no pills, no emoji.
 */
export function AppSection({ storeName }: AppSectionProps): React.JSX.Element {
  return (
    <div>
      <div className="grid md:grid-cols-3">
        {Object.entries(APP_PRICES).map(([key, app], index) => {
          const recommended = key === 'both';
          return (
            <article
              key={key}
              className={
                index === 0
                  ? 'border-t border-border py-5 md:pe-6'
                  : 'border-t border-border py-5 md:border-s md:pe-6 md:ps-6'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <Smartphone className="size-4 text-fg-subtle" strokeWidth={1.75} aria-hidden />
                {recommended ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
                    <span aria-hidden className="size-1.5 bg-highlight" />
                    الأفضل
                  </span>
                ) : null}
              </div>
              <h4 className="mt-2 text-label font-semibold text-foreground">{app.name}</h4>
              <p className="mt-1 font-display text-[1.35rem] font-semibold text-foreground" data-numeric dir="ltr">
                ${app.price}
              </p>
              <p className="text-[11px] text-fg-subtle" data-numeric dir="ltr">+ ${app.yearlyFee}/year</p>
              <ul className="my-3 space-y-1.5">
                {app.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-muted">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" strokeWidth={2} aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild variant={recommended ? 'default' : 'outline'} className="mt-2 w-full gap-1.5">
                <a
                  href={getWhatsAppLink(`${WHATSAPP_MESSAGES.requestApp} (${app.name})`, storeName)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
                  طلب الآن
                </a>
              </Button>
            </article>
          );
        })}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-fg-subtle">
        الاشتراك السنوي = رسوم المتاجر الرسمية (منفصل عن اشتراك المتجر).
      </p>
    </div>
  );
}
