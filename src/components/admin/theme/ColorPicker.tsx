import type { ChangeEvent } from 'react';

interface ColorPickerProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

/** منتقي لون واحد: عيّنة + قيمة HEX يدوية. حقول 44px وأسماء وصفية. */
export function ColorPicker({ label, value, onChange }: ColorPickerProps): React.JSX.Element {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-[11px] font-medium text-fg-muted">{label}</span>
      <div className="flex items-center gap-1.5 border border-border bg-surface p-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20">
        <input
          type="color"
          aria-label={`${label} — منتقي اللون`}
          value={value ?? '#000000'}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className="size-11 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <input
          type="text"
          aria-label={`${label} — قيمة اللون HEX`}
          value={value ?? ''}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder="#000000"
          dir="ltr"
          maxLength={7}
          className="h-11 w-full min-w-0 border-0 bg-transparent text-start font-mono text-xs text-foreground outline-none"
        />
      </div>
    </div>
  );
}
