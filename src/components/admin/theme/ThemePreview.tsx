import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Monitor, Smartphone } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ThemeConfig } from '../../../utils/themeUtils';
import type { DisplayMode } from './demoTheme';

interface ThemePreviewProps {
  theme: ThemeConfig;
  displayMode: DisplayMode;
  previewDevice: 'desktop' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'mobile') => void;
  storeName?: string | null;
  storeLogo?: string | null;
  currency?: string;
}

/**
 * Live theme preview.
 *
 * It embeds the real storefront in an iframe and posts the unsaved theme into
 * it. Because the iframe has its own viewport, Tailwind media queries resolve
 * against 1200px for desktop and 390px for mobile, so the preview is not a
 * scaled drawing that keeps the admin viewport's breakpoints. The store
 * components themselves are the source of truth.
 */
export function ThemePreview({
  theme,
  displayMode,
  previewDevice,
  onDeviceChange,
  storeName,
  storeLogo,
  currency = 'SAR',
}: ThemePreviewProps): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  const baseWidth = previewDevice === 'desktop' ? 1200 : 390;
  const baseHeight = previewDevice === 'desktop' ? 1500 : 844;
  const chrome = previewDevice === 'mobile' ? 12 : 2;
  const maxScale = previewDevice === 'desktop' ? 0.42 : 0.72;
  const scale = Math.max(
    0.2,
    Math.min(((availableWidth || 440) - chrome) / baseWidth, maxScale),
  );
  const frameWidth = baseWidth * scale + chrome;
  const frameHeight = baseHeight * scale + chrome;

  const sendTheme = useCallback((): void => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'theme-preview',
        theme,
        displayMode,
        storeName: storeName ?? null,
        storeLogo: storeLogo ?? null,
        currency,
      },
      window.location.origin,
    );
  }, [theme, displayMode, storeName, storeLogo, currency]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setAvailableWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    sendTheme();
  }, [sendTheme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'theme-preview-ready') sendTheme();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendTheme]);

  return (
    <div className="border border-border bg-card p-4 xl:sticky xl:top-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-label font-semibold text-foreground">
            <Eye className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
            معاينة حية
          </h3>
          <p className="mt-0.5 text-[11px] text-fg-subtle">نفس مكوّنات المتجر التي يراها العميل.</p>
        </div>
        <div className="flex border border-border" role="group" aria-label="حجم المعاينة">
          <button
            type="button"
            aria-label="معاينة على شاشة كمبيوتر"
            aria-pressed={previewDevice === 'desktop'}
            className={cn(
              'inline-flex size-11 items-center justify-center text-fg-muted transition-colors',
              previewDevice === 'desktop' && 'bg-surface-sunken text-foreground',
            )}
            onClick={() => onDeviceChange('desktop')}
          >
            <Monitor className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="معاينة على الهاتف"
            aria-pressed={previewDevice === 'mobile'}
            className={cn(
              'inline-flex size-11 items-center justify-center border-s border-border text-fg-muted transition-colors',
              previewDevice === 'mobile' && 'bg-surface-sunken text-foreground',
            )}
            onClick={() => onDeviceChange('mobile')}
          >
            <Smartphone className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex justify-center rounded-md bg-surface-sunken p-3">
        <div
          dir="ltr"
          className={cn(
            'overflow-hidden bg-fg',
            previewDevice === 'mobile' ? 'rounded-[28px] border-[6px]' : 'rounded-md border',
          )}
          style={{ width: frameWidth, height: frameHeight }}
        >
          <iframe
            ref={iframeRef}
            src="/theme-preview"
            title="معاينة المتجر"
            onLoad={sendTheme}
            className="block border-0"
            style={{
              width: baseWidth,
              height: baseHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
        معاينة بصرية ببيانات تجريبية. مرّر داخل الإطار لرؤية بقية الصفحة.
      </p>
    </div>
  );
}
