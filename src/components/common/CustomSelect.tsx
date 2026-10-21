/**
 * CustomSelect Component
 * Type-safe implementation with Tailwind CSS
 */

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// Option interface
export interface SelectOption {
  value: string;
  label: string;
}

// Props interface
interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  className = '',
}: CustomSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  // كان `useRef(Math.random()...)` ينتج معرّفاً غير حتمي أثناء الرسم: الوسيط
  // يُقيَّم في كل render، ما يخالف قواعد نقاء المكوّن. `useId` يوفّر معرّفاً
  // ثابتاً بين الخادم والعميل وآمناً في StrictMode.
  const generatedId = useId();
  const listId = `cs-list-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedIndex = options.findIndex((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={selectRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2.5 border border-border rounded-md bg-surface text-body text-foreground",
          "flex items-center justify-between cursor-pointer transition-colors text-start",
          "hover:border-border-strong",
          isOpen && "border-accent ring-2 ring-ring/25"
        )}
      >
        <span className="flex-1 text-start truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(
            "text-fg-subtle transition-transform shrink-0 ms-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          id={listId}
          role="listbox"
          aria-label={placeholder}
          aria-activedescendant={selectedIndex >= 0 ? `${listId}-opt-${selectedIndex}` : undefined}
          className="absolute top-[calc(100%+4px)] inset-x-0 z-[1000] max-h-[250px] overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-overlay"
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-3.5 min-h-[44px] py-2.5 border-0 bg-transparent text-body text-start cursor-pointer transition-colors flex items-center",
                  "hover:bg-muted",
                  isSelected && "bg-surface-sunken font-semibold text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
