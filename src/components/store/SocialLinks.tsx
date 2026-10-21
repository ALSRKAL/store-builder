/**
 * SocialLinks — merchant social links as a quiet ruled row.
 * No colored chips, no stagger animation, 44px targets.
 */

import { Facebook, Globe, Instagram, Linkedin, MessageCircle, Send, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import { storeScopeStyle } from '../../utils/themeUtils';

type PlatformKey = 'instagram' | 'twitter' | 'facebook' | 'youtube' | 'whatsapp' | 'telegram' | 'tiktok' | 'snapchat' | 'linkedin' | 'website';

export interface SocialLinksData {
  enabled?: boolean | undefined;
  links?: Partial<Record<PlatformKey, string | undefined>> | undefined;
}

interface SocialLinksProps {
  socialLinks: SocialLinksData | null | undefined;
}

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

type IconComponent = LucideIcon | (() => React.JSX.Element);

const ICONS: Record<PlatformKey, IconComponent> = {
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
  telegram: Send,
  tiktok: TikTokIcon,
  snapchat: SnapchatIcon,
  linkedin: Linkedin,
  website: Globe,
};

const NAMES: Record<PlatformKey, string> = {
  instagram: 'انستقرام',
  twitter: 'تويتر',
  facebook: 'فيسبوك',
  youtube: 'يوتيوب',
  whatsapp: 'واتساب',
  telegram: 'تيليجرام',
  tiktok: 'تيك توك',
  snapchat: 'سناب شات',
  linkedin: 'لينكد إن',
  website: 'الموقع',
};

export default function SocialLinks({ socialLinks }: SocialLinksProps): React.JSX.Element | null {
  if (!socialLinks?.enabled) return null;
  const links = socialLinks.links ?? {};
  const active = Object.entries(links).filter(([, url]) => url && url.trim()) as [PlatformKey, string][];
  if (active.length === 0) return null;

  return (
    <section
      className="my-8 border-y py-5 max-md:my-6"
      style={{ borderColor: 'var(--store-border)', ...storeScopeStyle }}
      aria-labelledby="social-links-title"
    >
      <h2 id="social-links-title" className="mb-3 text-label font-medium" style={{ color: 'var(--store-card-secondary)' }}>
        تابعنا على
      </h2>

      <div className="flex flex-wrap gap-2">
        {active.map(([platform, url]) => {
          const Icon = ICONS[platform];
          if (!Icon) return null;
          const trimmed = url.trim();
          const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
          return (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={NAMES[platform]}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--store-button-radius,4px)] border px-3.5 text-label font-medium no-underline transition-colors hover:bg-[var(--store-body-bg)]"
              style={{ borderColor: 'var(--store-border)', color: 'var(--store-card-text)' }}
            >
              <span className="flex size-4 items-center justify-center">
                <Icon />
              </span>
              {NAMES[platform]}
            </a>
          );
        })}
      </div>
    </section>
  );
}
