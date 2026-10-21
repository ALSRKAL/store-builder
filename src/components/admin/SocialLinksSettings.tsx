/**
 * SocialLinksSettings — روابط التواصل (الخطة السنوية).
 * استُبدلت مربّعات الألوان التجارية بأيقونات محايدة على سطح واحد، وToggle
 * بسيط بـ`Switch`، وأزرار حذف 32px داخل حقل 44px.
 */

import { useEffect, useState } from 'react';
import {
  Facebook,
  Globe,
  Instagram,
  Loader2,
  Save,
  Trash2,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Input, Label, Switch } from '../ui';

function TikTokIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function SnapchatIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
    </svg>
  );
}

type PlatformId = 'instagram' | 'twitter' | 'tiktok' | 'snapchat' | 'facebook' | 'youtube' | 'website';

interface Platform {
  id: PlatformId;
  name: string;
  icon: LucideIcon | (() => React.JSX.Element);
  placeholder: string;
}

export interface SocialLinksData {
  enabled: boolean;
  links: Partial<Record<PlatformId, string>>;
}

interface SocialLinksSettingsProps {
  socialLinks?: SocialLinksData | null | undefined;
  onSave: (data: SocialLinksData) => void | Promise<void>;
  saving?: boolean;
}

const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'انستقرام', icon: Instagram, placeholder: 'https://instagram.com/username' },
  { id: 'twitter', name: 'تويتر / X', icon: Twitter, placeholder: 'https://twitter.com/username' },
  { id: 'tiktok', name: 'تيك توك', icon: TikTokIcon, placeholder: 'https://tiktok.com/@username' },
  { id: 'snapchat', name: 'سناب شات', icon: SnapchatIcon, placeholder: 'https://snapchat.com/add/username' },
  { id: 'facebook', name: 'فيسبوك', icon: Facebook, placeholder: 'https://facebook.com/page' },
  { id: 'youtube', name: 'يوتيوب', icon: Youtube, placeholder: 'https://youtube.com/@channel' },
  { id: 'website', name: 'موقع إلكتروني', icon: Globe, placeholder: 'https://example.com' },
];

export default function SocialLinksSettings({ socialLinks, onSave, saving = false }: SocialLinksSettingsProps): React.JSX.Element {
  const [links, setLinks] = useState<Partial<Record<PlatformId, string>>>({});
  const [enabled, setEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (socialLinks) {
      setLinks(socialLinks.links ?? {});
      setEnabled(socialLinks.enabled !== false);
      setHasChanges(false);
    }
  }, [socialLinks]);

  const update = (id: PlatformId, value: string): void => {
    setLinks((current) => ({ ...current, [id]: value }));
    setHasChanges(true);
  };

  const activeCount = Object.values(links).filter((value) => value?.trim()).length;

  const save = async (): Promise<void> => {
    const normalized = Object.fromEntries(
      Object.entries(links).map(([id, value]) => {
        const trimmed = value?.trim() ?? '';
        if (!trimmed) return [id, undefined];
        return [id, /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`];
      }),
    ) as Partial<Record<PlatformId, string>>;
    try {
      await onSave({ enabled, links: normalized });
      setLinks(normalized);
      setHasChanges(false);
    } catch {
      // الـContext يعرض Toast بالفعل؛ نُبقي التغييرات لتُعاد المحاولة.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-y border-border py-3">
        <div>
          <p className="text-label font-medium text-foreground">إظهار روابط التواصل</p>
          <p className="mt-0.5 text-[11px] text-fg-muted" data-numeric>{activeCount} رابط مفعّل</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            setEnabled(checked);
            setHasChanges(true);
          }}
          aria-label="إظهار روابط التواصل"
        />
      </div>

      <div className={cn('divide-y divide-border border-b border-border', !enabled && 'opacity-60')}>
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const value = links[platform.id] ?? '';
          return (
            <div key={platform.id} className="flex items-center gap-2 py-2">
              <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center text-fg-subtle">
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                <Label htmlFor={`social-${platform.id}`} className="sr-only">{platform.name}</Label>
                <Input
                  id={`social-${platform.id}`}
                  type="url"
                  value={value}
                  onChange={(event) => update(platform.id, event.target.value)}
                  placeholder={platform.placeholder}
                  disabled={!enabled}
                  dir="ltr"
                  className="h-11 text-start text-[13px]"
                />
              </div>
              {value.trim() ? (
                <Button
                  type="button"
                  size="iconSm"
                  variant="ghost"
                  aria-label={`مسح رابط ${platform.name}`}
                  className="text-fg-muted hover:bg-danger/5 hover:text-danger"
                  onClick={() => update(platform.id, '')}
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={() => void save()}
        disabled={saving || !hasChanges}
        className="mt-1 gap-2"
      >
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" strokeWidth={1.75} aria-hidden />}
        {saving ? 'جاري الحفظ…' : 'حفظ التغييرات'}
      </Button>
    </div>
  );
}
