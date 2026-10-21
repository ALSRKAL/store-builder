import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CURRENCIES, getCurrencyByCode } from '../../../data/currencies';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui';

interface CurrencySectionProps {
  storeCurrency: string;
  onSaveCurrency: (currency: string) => Promise<void>;
}

export function CurrencySection({ storeCurrency, onSaveCurrency }: CurrencySectionProps): React.JSX.Element {
  const [selected, setSelected] = useState(storeCurrency);
  const [saving, setSaving] = useState(false);
  const current = getCurrencyByCode(storeCurrency);

  // العملة تصل من الخادم بعد التركيب؛ بدون هذا التزامن كان الحفظ يكتب SAR
  // فوق عملة المتجر الحقيقية عند فتح الإعدادات مباشرة.
  useEffect(() => {
    setSelected(storeCurrency);
  }, [storeCurrency]);

  const save = async (): Promise<void> => {
    if (selected === storeCurrency) return;
    setSaving(true);
    try {
      await onSaveCurrency(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-fg-muted">
        تظهر الأسعار في المتجر بعملة <strong className="font-semibold text-foreground">{current?.name ?? storeCurrency}</strong>.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger aria-label="عملة المتجر">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.name} ({currency.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || selected === storeCurrency}
          className="shrink-0 gap-2 sm:w-32"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          حفظ
        </Button>
      </div>
    </div>
  );
}
