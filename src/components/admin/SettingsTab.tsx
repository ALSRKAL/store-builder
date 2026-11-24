/**
 * SettingsTab — إعدادات المتجر.
 *
 * كان الملف 873 سطراً يجمع: بطاقة الحالة، معلومات المتجر، الاشتراك، الموقع،
 * العملة، التطبيق، الجولة، وثلاث بطاقات ترقية مكرّرة حرفياً. هنا صار
 * مُنسّقاً فقط؛ كل قسم في ملفه. هذا يقلّل diff أي تعديل مستقبلي ويجعل
 * قواعد `hideUpgradeUI` في مكان واحد (`FeatureGateCard`).
 */

import { useCallback, useRef, useState } from 'react';
import {
  Bell,
  Coins,
  CreditCard,
  MapPin,
  Megaphone,
  PlayCircle,
  RefreshCw,
  Share2,
  Smartphone,
  Store,
  type LucideIcon,
} from 'lucide-react';
import type { LocationData } from './LocationPicker';
import type { AnnouncementData } from './AnnouncementSettings';
import type { SocialLinksData } from './SocialLinksSettings';
import AnnouncementSettings from './AnnouncementSettings';
import SocialLinksSettings from './SocialLinksSettings';
import PaymentSettings from './PaymentSettings';
import NotificationSettings from './NotificationSettings';
import LocationPicker from './LocationPicker';
import { Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { FeatureGateCard, UpgradeDialog, type RenewalSuccessData } from './subscription';
import { AccordionItem } from './settings/AccordionItem';
import { StoreStatusCard } from './settings/StoreStatusCard';
import { StoreInfoSection } from './settings/StoreInfoSection';
import { SubscriptionSection } from './settings/SubscriptionSection';
import { LocationSection } from './settings/LocationSection';
import { CurrencySection } from './settings/CurrencySection';
import { AppSection } from './settings/AppSection';
import { TourSection } from './settings/TourSection';

interface AdminData {
  uid?: string;
  storeName?: string;
  description?: string;
  email?: string;
  whatsapp?: string;
  logo?: string;
  slug?: string;
  storeId?: string;
  subscriptionEnd?: string;
  storeIsActive?: boolean;
}

type SectionKey =
  | 'info'
  | 'announcement'
  | 'social'
  | 'notifications'
  | 'payments'
  | 'subscription'
  | 'location'
  | 'currency'
  | 'app'
  | 'tour';

interface SettingsTabProps {
  adminData?: AdminData | null;
  storeCurrency: string;
  onSaveCurrency: (currency: string) => Promise<void>;
  storeLocation?: LocationData | null;
  onSaveLocation: (location: LocationData) => void | Promise<void>;
  onToggleLocationVisibility: () => Promise<void>;
  onUpdateStoreInfo: (data: { name?: string; description?: string; email?: string; password?: string; whatsapp?: string; logoFile?: File }) => Promise<void>;
  storeAnnouncement?: AnnouncementData | null;
  onSaveAnnouncement: (data: AnnouncementData) => Promise<void>;
  storeSocialLinks?: SocialLinksData | null;
  onSaveSocialLinks: (data: SocialLinksData) => Promise<void>;
  onRenewalSuccess?: (data: RenewalSuccessData) => void;
  productsCount?: number;
  categoriesCount?: number;
  storeIsActive?: boolean;
  onNavigate?: (tab: string) => void;
  onShowTour?: () => void;
  onLogout?: () => void;
  hideUpgradeUI?: boolean;
  isAnnualPlan?: boolean;
}

interface SectionConfig {
  key: SectionKey;
  icon: LucideIcon;
  title: string;
  badge?: string | null;
}

function SettingsTab({
  adminData,
  storeCurrency,
  onSaveCurrency,
  storeLocation,
  onSaveLocation,
  onToggleLocationVisibility,
  onUpdateStoreInfo,
  storeAnnouncement,
  onSaveAnnouncement,
  storeSocialLinks,
  onSaveSocialLinks,
  onRenewalSuccess,
  productsCount = 0,
  storeIsActive = true,
  onNavigate,
  onShowTour,
  onLogout,
  hideUpgradeUI = false,
  isAnnualPlan = false,
}: SettingsTabProps): React.JSX.Element {
  const { currentPlan } = useAuth();
  const [expanded, setExpanded] = useState<SectionKey | null>('info');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [togglingLocation, setTogglingLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dialog, setDialog] = useState<'plans' | 'renew' | null>(null);

  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({});

  const scrollToSection = useCallback((key: SectionKey): void => {
    window.setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 220);
  }, []);

  const toggle = (key: SectionKey): void => {
    setExpanded((current) => {
      if (current === key) return null;
      scrollToSection(key);
      return key;
    });
  };

  const getRef = useCallback(
    (key: SectionKey) => (element: HTMLDivElement | null) => {
      sectionRefs.current[key] = element;
    },
    [],
  );

  const daysLeft = adminData?.subscriptionEnd
    ? Math.max(0, Math.ceil((new Date(adminData.subscriptionEnd).getTime() - Date.now()) / 86_400_000))
    : 0;

  const storeUrl = `${window.location.origin}/store/${adminData?.slug ?? adminData?.storeId ?? ''}`;
  const isStoreReady = productsCount > 0;

  const saveAnnouncement = async (data: AnnouncementData): Promise<void> => {
    setSavingAnnouncement(true);
    try {
      await onSaveAnnouncement(data);
    } catch {
      // الـContext يعرض Toast بالفعل؛ نمنع فقط رفض Promise غير المعالَج.
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const saveSocial = async (data: SocialLinksData): Promise<void> => {
    setSavingSocial(true);
    try {
      await onSaveSocialLinks(data);
    } catch {
      // الـContext يعرض Toast بالفعل.
    } finally {
      setSavingSocial(false);
    }
  };

  const toggleLocation = async (): Promise<void> => {
    setTogglingLocation(true);
    try {
      await onToggleLocationVisibility();
    } finally {
      setTogglingLocation(false);
    }
  };

  const upgrade = (): void => setDialog(hideUpgradeUI ? null : 'plans');

  const sections: SectionConfig[] = [
    { key: 'info', icon: Store, title: 'معلومات المتجر' },
    { key: 'announcement', icon: Megaphone, title: 'الشريط الإعلاني', badge: storeAnnouncement?.enabled ? 'مفعّل' : null },
    { key: 'social', icon: Share2, title: 'التواصل الاجتماعي', badge: isAnnualPlan ? (storeSocialLinks?.enabled ? 'مفعّل' : null) : 'سنوي' },
    { key: 'notifications', icon: Bell, title: 'الإشعارات الفورية', badge: isAnnualPlan ? null : 'سنوي' },
    { key: 'payments', icon: CreditCard, title: 'طرق الدفع', badge: isAnnualPlan ? null : 'سنوي' },
    { key: 'subscription', icon: RefreshCw, title: 'الاشتراك', badge: `${daysLeft} يوم` },
    { key: 'location', icon: MapPin, title: 'موقع المتجر', badge: storeLocation?.lat ? (storeLocation.enabled !== false ? 'مفعّل' : 'معطّل') : null },
    { key: 'currency', icon: Coins, title: 'العملة', badge: storeCurrency },
    { key: 'tour', icon: PlayCircle, title: 'العرض التعليمي' },
    { key: 'app', icon: Smartphone, title: 'حوّل متجرك لتطبيق' },
  ];

  const annualGate = (description: string): React.JSX.Element => (
    <FeatureGateCard
      title="ميزة حصرية للخطة السنوية"
      description={description}
      featureName="السنوية"
      hideUpgradeUI={hideUpgradeUI}
      onUpgrade={upgrade}
    />
  );

  return (
    <div className="mx-0 flex w-full flex-col gap-4">
      <StoreStatusCard
        ready={isStoreReady}
        active={storeIsActive}
        storeUrl={storeUrl}
        onAddProduct={() => onNavigate?.('products')}
      />

      <div className="border-t border-border">
        {sections.map((section) => {
          const isOpen = expanded === section.key;
          return (
            <AccordionItem
              key={section.key}
              id={section.key}
              icon={section.icon}
              title={section.title}
              badge={section.badge}
              expanded={isOpen}
              onToggle={() => toggle(section.key)}
              sectionRef={getRef(section.key)}
            >
              {section.key === 'info' ? (
                <StoreInfoSection adminData={adminData} onUpdateStoreInfo={onUpdateStoreInfo} />
              ) : null}

              {section.key === 'announcement' ? (
                <AnnouncementSettings
                  announcement={storeAnnouncement}
                  saving={savingAnnouncement}
                  onSave={(data) => void saveAnnouncement(data)}
                />
              ) : null}

              {section.key === 'social' ? (
                isAnnualPlan ? (
                  <SocialLinksSettings
                    socialLinks={storeSocialLinks}
                    saving={savingSocial}
                    onSave={saveSocial}
                  />
                ) : (
                  annualGate('أضف روابط انستقرام وتيك توك وسناب شات وغيرها أسفل متجرك.')
                )
              ) : null}

              {section.key === 'notifications' ? (
                isAnnualPlan ? (
                  <NotificationSettings
                    storeId={adminData?.uid}
                    storeName={adminData?.storeName}
                    storeLogo={adminData?.logo}
                  />
                ) : (
                  annualGate('استلم إشعاراً فورياً على هاتفك أو حاسوبك عند وصول طلب جديد.')
                )
              ) : null}

              {section.key === 'payments' ? (
                isAnnualPlan ? (
                  <PaymentSettings />
                ) : (
                  annualGate('أضف محافظ وبنوكاً وطرق دفع متعددة، واطلب إيصال التحويل من العميل.')
                )
              ) : null}

              {section.key === 'subscription' ? (
                <SubscriptionSection
                  daysLeft={daysLeft}
                  subscriptionEnd={adminData?.subscriptionEnd}
                  hideUpgradeUI={hideUpgradeUI}
                  onRenew={() => setDialog('renew')}
                  onUpgrade={upgrade}
                />
              ) : null}

              {section.key === 'location' ? (
                <LocationSection
                  location={storeLocation}
                  toggling={togglingLocation}
                  onEdit={() => setShowLocationPicker(true)}
                  onToggle={() => void toggleLocation()}
                />
              ) : null}

              {section.key === 'currency' ? (
                <CurrencySection storeCurrency={storeCurrency} onSaveCurrency={onSaveCurrency} />
              ) : null}

              {section.key === 'tour' ? <TourSection onShowTour={onShowTour} /> : null}

              {section.key === 'app' ? <AppSection storeName={adminData?.storeName} /> : null}
            </AccordionItem>
          );
        })}
      </div>

      {onLogout ? (
        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className="mt-1 w-full text-danger hover:bg-danger/10 hover:text-danger lg:hidden"
        >
          تسجيل الخروج
        </Button>
      ) : null}

      {showLocationPicker ? (
        <LocationPicker
          currentLocation={storeLocation}
          onSave={async (location) => {
            await onSaveLocation(location);
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      ) : null}

      <UpgradeDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        plan={currentPlan}
        storeName={adminData?.storeName}
        hideUpgradeUI={hideUpgradeUI}
        reason={dialog === 'renew' ? 'renew' : 'plans'}
        onRenewalSuccess={(data) => {
          setDialog(null);
          onRenewalSuccess?.(data);
        }}
      />
    </div>
  );
}

export default SettingsTab;
