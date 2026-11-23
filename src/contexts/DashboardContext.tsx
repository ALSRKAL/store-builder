/**
 * DashboardContext — الحالة المشتركة للوحة التحكم.
 *
 * لماذا هذا الملف موجود:
 * كان `Dashboard.tsx` ملفاً واحداً بحجم 993 سطراً يحتوي القشرة + كل الجلب +
 * كل المعالجات + قسم المنتجات كاملاً. تحويل التبويبات إلى مسارات حقيقية يعني
 * أن كل تبويب أصبح مكوّناً مستقلاً يُركَّب ويُفكّ عند التنقل. لو وضعنا الجلب
 * داخل كل تبويب، لحدث ما يلي عند كل ضغطة تنقّل:
 *   - طلب `products` + `categories` من جديد،
 *   - وميض تحميل يقفل الشاشة،
 *   - إعادة تحميل ثيم المتجر والعملة والإعلانات والموقع،
 *   - فقدان cache الطلبات (كان يُحتفظ به في `useRef` داخل Dashboard).
 *
 * الحل: المزوّد يعيش في المسار الأب `/admin/dashboard`، و`<Outlet />` يستبدل
 * التبويب فقط. حالة هذا الملف لا تُعاد تهيئتها عند التنقل، فالجلب يحدث مرة
 * واحدة عند الدخول — تماماً كما كان، لكن من دون ملف عملاق.
 *
 * قاعدة الاستخدام: أي بيانات أو إجراء تحتاجه أكثر من شاشة واحدة يعيش هنا؛
 * أي شيء خاص بشاشة واحدة يبقى محلياً في تلك الشاشة.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import {
  uploadImage,
  uploadImages,
  deleteImages,
  getDeletedImages,
} from '../utils/r2Service';
import {
  startOrderReminder,
  stopOrderReminder,
  checkImmediateReminder,
  updatePendingOrdersCount,
} from '../utils/orderReminder';
import { fetchAllOrders } from '../utils/orderUtils';
import type { Product, Category } from '../schemas';
import { withDerivedPrices } from '../utils/productUtils';
import type { ThemeInput } from '../utils/themeUtils';
import type { LocationData } from '../components/admin/LocationPicker';
import type { AnnouncementData } from '../components/admin/AnnouncementSettings';
import type { SocialLinksData } from '../components/admin/SocialLinksSettings';
import { isDashboardTab, type DashboardTab } from '../lib/dashboardTabs';
import { ConfirmDialog, toast } from '../components/ui';

/** التبويبات المتاحة في اللوحة — معرَّفة في `lib/dashboardTabs` لتُستخدم بلا تبعيات. */
export type { DashboardTab };
export { isDashboardTab };

export type LimitAlertType = 'products' | 'categories';

/** cache الطلبات: كان `useRef` داخل Dashboard، نُقل كما هو. */
export interface OrdersCache {
  data: unknown[] | null;
  stats: unknown | null;
  loaded: boolean;
}

/** بيانات نموذج المنتج كما يرسلها `ProductForm`. */
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  categoryId: string;
  colors: string[];
  sizes: string[];
  discount: number;
  inStock: boolean;
}

/** بيانات نموذج التصنيف كما يرسلها `CategoryForm`. */
export interface CategoryFormData {
  name: string;
  description?: string;
  image?: string;
  order?: number;
  isActive?: boolean;
}

export interface StoreInfoUpdate {
  whatsapp?: string;
  logoFile?: File;
}

/** طلب تأكيد يُعرض بنافذة موحّدة بدل `window.confirm`. */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface DashboardContextValue {
  /* ===== الهوية والخطة (تمرير من AuthContext) ===== */
  user: ReturnType<typeof useAuth>['user'];
  adminData: ReturnType<typeof useAuth>['adminData'];
  currentPlan: ReturnType<typeof useAuth>['currentPlan'];
  isTrial: boolean;
  hideUpgradeUI: boolean;
  getLimits: ReturnType<typeof useAuth>['getLimits'];
  logout: () => Promise<void>;

  /* ===== بيانات اللوحة ===== */
  products: Product[];
  categories: Category[];
  loading: boolean;
  /** رسالة فشل جلب البيانات — تفصل فشل الشبكة عن حالة "لا توجد منتجات". */
  loadError: string | null;
  storeCurrency: string;
  storeTheme: ThemeInput | null;
  storeLocation: LocationData | null;
  storeAnnouncement: AnnouncementData | null;
  storeSocialLinks: SocialLinksData | null;
  pendingOrdersCount: number;
  daysRemaining: number;
  /** رابط المتجر العام، مبني من slug (وليس من storeId). */
  publicStoreUrl: string | null;

  /* ===== إجراءات الجلب ===== */
  reloadData: () => Promise<void>;
  reloadStoreData: () => Promise<void>;

  /* ===== نموذج المنتج ===== */
  showProductForm: boolean;
  editingProduct: Product | null;
  openProductForm: (product?: Product | null) => void;
  closeProductForm: () => void;
  saveProduct: (
    data: ProductFormData,
    images: (string | File)[],
    onStage?: (stage: 'uploading' | 'saving') => void,
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  /* ===== نموذج التصنيف ===== */
  showCategoryForm: boolean;
  editingCategory: Category | null;
  openCategoryForm: (category?: Category | null) => void;
  closeCategoryForm: () => void;
  saveCategory: (data: CategoryFormData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  /* ===== مولّد الإعلانات ===== */
  adGeneratorProduct: Product | null;
  openAdGenerator: (product: Product) => void;
  closeAdGenerator: () => void;

  /* ===== المظهر ===== */
  savingTheme: boolean;
  saveTheme: (theme: ThemeInput) => Promise<void>;

  /* ===== الإعدادات ===== */
  saveCurrency: (currency: string) => Promise<void>;
  saveLocation: (location: LocationData) => Promise<void>;
  toggleLocationVisibility: () => Promise<void>;
  updateStoreInfo: (data: StoreInfoUpdate) => Promise<void>;
  saveAnnouncement: (data: AnnouncementData) => Promise<void>;
  saveSocialLinks: (data: SocialLinksData) => Promise<void>;

  /* ===== حدود الخطة وبوابات الترقية ===== */
  limitAlert: { show: boolean; type: LimitAlertType | null };
  showLimitAlert: (type: LimitAlertType) => void;
  closeLimitAlert: () => void;
  /** تأكيد موحّد (Radix) — يعيد `true` عند الموافقة. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;

  /* ===== الطلبات ===== */
  ordersCache: OrdersCache;
  handleOrdersUpdate: (orders: unknown[], stats: unknown) => void;

  /* ===== جولة التعريف ===== */
  showOnboarding: boolean;
  startTour: () => void;
  completeOnboarding: () => void;

  /* ===== مساعدات ===== */
  getCategoryName: (categoryId: string | null | undefined) => string;
  /** تنقّل بين تبويبات اللوحة عبر المسار الفرعي. */
  navigateToTab: (tab: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/**
 * DashboardProvider — المزوّد الوحيد لكل بيانات اللوحة.
 * يجب أن يُركَّب في المسار الأب مرة واحدة (لا داخل كل تبويب).
 */
export function DashboardProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const {
    user,
    adminData,
    currentPlan,
    isTrial,
    getLimits,
    hideUpgradeUI,
    logout,
    refreshAdminData,
  } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [storeTheme, setStoreTheme] = useState<ThemeInput | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState('SAR');
  const [storeLocation, setStoreLocation] = useState<LocationData | null>(null);
  const [storeAnnouncement, setStoreAnnouncement] = useState<AnnouncementData | null>(null);
  const [storeSocialLinks, setStoreSocialLinks] = useState<SocialLinksData | null>(null);

  const [limitAlert, setLimitAlert] = useState<{ show: boolean; type: LimitAlertType | null }>({
    show: false,
    type: null,
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [adGeneratorProduct, setAdGeneratorProduct] = useState<Product | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // cache الطلبات — يُحمّل مرة واحدة فقط (نفس سلوك ما قبل التفكيك)
  const ordersCache = useRef<OrdersCache>({ data: null, stats: null, loaded: false });

  /* ===== الجلب ===== */

  const fetchData = useCallback(async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [productList, categoriesData] = await Promise.all([
        api.products.getAllLegacy(),
        api.categories.getAll(),
      ]);
      // Array guards: a drifted payload degrades to empty lists instead of
      // crashing product/category renders downstream.
      const categoryList = categoriesData;
      setProducts(Array.isArray(productList) ? withDerivedPrices(productList) : []);
      setCategories(Array.isArray(categoryList) ? categoryList : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadError(error instanceof Error ? error.message : 'تعذّر تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => setConfirmRequest({ ...options, resolve })),
    [],
  );

  const resolveConfirm = useCallback(
    (value: boolean): void => {
      setConfirmRequest((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [],
  );

  const fetchStoreData = useCallback(async (): Promise<void> => {
    if (!user || !adminData?.storeId) return;
    try {
      const store = await api.stores.getById(adminData.storeId);
      if (store) {
        setStoreTheme((store.theme as ThemeInput | undefined) ?? null);
        setStoreCurrency(store.currency || 'SAR');
        setStoreLocation((store.location as LocationData | undefined) ?? null);
        setStoreAnnouncement((store.announcement as AnnouncementData | undefined) ?? null);
        setStoreSocialLinks((store.socialLinks as SocialLinksData | undefined) ?? null);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  }, [user, adminData?.storeId]);

  const prefetchOrders = useCallback(async (): Promise<void> => {
    if (ordersCache.current.loaded || currentPlan.id !== 'annual') return;
    try {
      const [prefetched, statsData] = await Promise.all([
        fetchAllOrders(),
        api.orders.getStats(),
      ]);
      ordersCache.current = {
        data: Array.isArray(prefetched) ? prefetched : [],
        stats: statsData,
        loaded: true,
      };

      const newOrdersCount = (statsData as { newOrders?: number } | null)?.newOrders ?? 0;
      setPendingOrdersCount(newOrdersCount);

      if (newOrdersCount > 0 && user?.uid) {
        void checkImmediateReminder(user.uid, newOrdersCount);
      }
      updatePendingOrdersCount(newOrdersCount);
    } catch (error) {
      console.error('Error prefetching orders:', error);
    }
  }, [currentPlan.id, user?.uid]);

  /* ===== التأثيرات ===== */

  // نظام تذكير الطلبات
  useEffect(() => {
    if (user?.uid && currentPlan.id === 'annual') {
      const getNewOrdersCount = async (): Promise<number> => {
        try {
          const stats = await api.orders.getStats();
          return (stats as { newOrders?: number } | null)?.newOrders ?? 0;
        } catch {
          return 0;
        }
      };

      void startOrderReminder(user.uid, getNewOrdersCount);
      return () => {
        stopOrderReminder();
      };
    }
    return undefined;
  }, [user?.uid, currentPlan.id]);

  // إظهار جولة التعريف مرة واحدة للتاجر الجديد
  useEffect(() => {
    if (user && adminData) {
      const onboardingKey = `onboarding_completed_${user.uid}`;
      const hasCompletedOnboarding = localStorage.getItem(onboardingKey);
      if (!hasCompletedOnboarding && adminData.createdAt) {
        const createdAt = new Date(adminData.createdAt);
        const diffMinutes = (new Date().getTime() - createdAt.getTime()) / (1000 * 60);
        if (diffMinutes <= 5) setShowOnboarding(true);
      }
    }
  }, [user, adminData]);

  // الجلب الأولي — يحدث مرة واحدة لأن المزوّد لا يُفكّ عند تبديل التبويب
  useEffect(() => {
    if (user && adminData?.storeId) {
      void fetchData();
      void fetchStoreData();
      void api.admin.updateLastLogin().catch(console.error);
      void prefetchOrders();
    }
  }, [user, adminData?.storeId, fetchData, fetchStoreData, prefetchOrders]);

  /* ===== معالجات الإعدادات ===== */

  const handleLogout = useCallback(async (): Promise<void> => {
    await logout();
    navigate('/admin');
  }, [logout, navigate]);

  const daysRemaining = useMemo((): number => {
    if (!adminData?.subscriptionEnd) return 0;
    const end = new Date(adminData.subscriptionEnd);
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [adminData?.subscriptionEnd]);

  const publicStoreUrl = useMemo((): string | null => {
    const slug = adminData?.slug ?? adminData?.storeSlug ?? adminData?.storeId;
    return slug ? `/store/${slug}` : null;
  }, [adminData?.slug, adminData?.storeSlug, adminData?.storeId]);

  const handleSaveCurrency = async (currencyCode: string): Promise<void> => {
    if (!adminData?.storeId) return;
    try {
      await api.stores.update(adminData.storeId, { currency: currencyCode });
      setStoreCurrency(currencyCode);
      toast.success('تم حفظ العملة');
    } catch (error) {
      console.error('Error saving currency:', error);
      toast.error('تعذّر حفظ العملة', 'تحقّق من الاتصال وأعد المحاولة.');
    }
  };

  const handleSaveLocation = async (location: LocationData): Promise<void> => {
    if (!adminData?.storeId) return;
    try {
      const locationData = { ...location, enabled: location.enabled ?? storeLocation?.enabled ?? true };
      await api.stores.updateLocation(adminData.storeId, locationData);
      setStoreLocation(locationData);
      toast.success('تم حفظ موقع المتجر');
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('تعذّر حفظ الموقع', 'تحقّق من الاتصال وأعد المحاولة.');
      throw error;
    }
  };

  const handleToggleLocationVisibility = async (): Promise<void> => {
    if (!adminData?.storeId || !storeLocation) return;
    try {
      const updatedLocation = { ...storeLocation, enabled: storeLocation.enabled === false };
      await api.stores.updateLocation(adminData.storeId, updatedLocation);
      setStoreLocation(updatedLocation);
    } catch (error) {
      console.error('Error toggling location:', error);
      toast.error('تعذّر تغيير حالة الموقع');
    }
  };

  const handleSaveAnnouncement = async (announcementData: AnnouncementData): Promise<void> => {
    if (!adminData?.storeId) return;
    try {
      await api.stores.updateAnnouncement(
        adminData.storeId,
        announcementData as Parameters<typeof api.stores.updateAnnouncement>[1],
      );
      setStoreAnnouncement(announcementData);
      toast.success('تم حفظ الشريط الإعلاني');
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('تعذّر حفظ الشريط الإعلاني');
      throw error;
    }
  };

  const handleSaveSocialLinks = async (socialData: SocialLinksData): Promise<void> => {
    if (!adminData?.storeId) return;
    try {
      await api.stores.updateSocialLinks(
        adminData.storeId,
        socialData as Parameters<typeof api.stores.updateSocialLinks>[1],
      );
      setStoreSocialLinks(socialData);
      toast.success('تم حفظ روابط التواصل');
    } catch (error) {
      console.error('Error saving social links:', error);
      toast.error('تعذّر حفظ روابط التواصل');
      throw error;
    }
  };

  const handleUpdateStoreInfo = async ({
    whatsapp,
    logoFile,
  }: StoreInfoUpdate): Promise<void> => {
    if (!adminData?.storeId) return;
    try {
      const updates: Record<string, string> = {};
      const oldLogo = adminData.logo ?? adminData.storeLogo;
      if (whatsapp) updates['whatsapp'] = whatsapp;
      if (logoFile && user) {
        const result = await uploadImage(logoFile, {
          folder: `stores/${user.uid}/logo`,
          maxWidth: 500,
          maxHeight: 500,
          quality: 0.9,
        });
        if (result?.url) {
          updates['logo'] = result.url;
        } else throw new Error('فشل رفع الشعار الجديد');
      }
      if (Object.keys(updates).length > 0) {
        await api.stores.update(adminData.storeId, updates);
        await api.admin.updateProfile(updates);
        // بعد نجاح تحديث المتجر والملف فقط، حتى لا يُفقد الشعار القديم عند الفشل.
        if (oldLogo && updates['logo']) void deleteImages([oldLogo]);
        // حدّث adminData محلياً كي تظهر القيم الجديدة في الإعدادات فوراً.
        await refreshAdminData();
      }
      toast.success('تم تحديث معلومات المتجر');
    } catch (error) {
      console.error('Error updating store info:', error);
      toast.error('تعذّر تحديث المعلومات');
      throw error;
    }
  };

  const handleSaveTheme = async (theme: ThemeInput): Promise<void> => {
    if (!adminData?.storeId) {
      toast.error('لم يتم العثور على معرف المتجر');
      return;
    }
    setSavingTheme(true);
    try {
      await api.stores.updateTheme(
        adminData.storeId,
        theme as Parameters<typeof api.stores.updateTheme>[1],
      );
      setStoreTheme(theme);
      toast.success('تم حفظ المظهر');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('تعذّر حفظ المظهر', 'تحقّق من الاتصال وأعد المحاولة.');
      throw error;
    } finally {
      setSavingTheme(false);
    }
  };

  /* ===== معالجات المنتجات ===== */

  const handleSaveProduct = async (
    productData: ProductFormData,
    images: (string | File)[],
    onStage?: (stage: 'uploading' | 'saving') => void,
  ): Promise<void> => {
    try {
      const oldImages = editingProduct?.images || [];
      if (images.some((image) => typeof image !== 'string')) onStage?.('uploading');
      const { urls: imageUrls, failed } = await uploadImages(images, {
        folder: `stores/${user?.uid}/products`,
      });
      // لا تحفظ منتجاً ناقص الصور بصمت: النموذج يبقى مفتوحاً ويعيد المحاولة.
      if (failed > 0) throw new Error('تعذّر رفع بعض الصور');
      onStage?.('saving');
      const deletedImages = getDeletedImages(oldImages, imageUrls);
      const data = { ...productData, images: imageUrls };
      if (editingProduct) await api.products.update(editingProduct.id, data);
      else await api.products.create(data as unknown as Parameters<typeof api.products.create>[0]);
      // لا نحذف الصور القديمة قبل نجاح الحفظ، حتى لا يبقى المنتج بصور مفقودة.
      if (deletedImages.length > 0) void deleteImages(deletedImages);
      setShowProductForm(false);
      setEditingProduct(null);
      void fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('تعذّر حفظ المنتج', 'لم تُفقد بيانات النموذج — أعد المحاولة.');
      throw error;
    }
  };

  const handleDeleteProduct = async (id: string): Promise<void> => {
    const approved = await confirm({
      title: 'حذف المنتج',
      description: 'سيُحذف المنتج وجميع صوره نهائياً. لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف المنتج',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      const product = products.find((p) => p.id === id);
      await api.products.delete(id);
      // بعد نجاح الحذف فقط، حتى لا تُفقد صور منتج ما زال موجوداً إن فشل الطلب.
      if (product?.images && product.images.length > 0) void deleteImages(product.images);
      toast.success('تم حذف المنتج');
      void fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('تعذّر حذف المنتج');
    }
  };

  /* ===== معالجات التصنيفات ===== */

  const handleSaveCategory = async (categoryData: CategoryFormData): Promise<void> => {
    try {
      if (editingCategory) await api.categories.update(editingCategory.id, categoryData);
      else
        await api.categories.create(
          categoryData as Parameters<typeof api.categories.create>[0],
        );
      setShowCategoryForm(false);
      setEditingCategory(null);
      toast.success(editingCategory ? 'تم تحديث التصنيف' : 'تم إنشاء التصنيف');
      void fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('تعذّر حفظ التصنيف');
      throw error;
    }
  };

  const handleDeleteCategory = async (id: string): Promise<void> => {
    const productsInCategory = products.filter((p) => p.categoryId === id);
    const approved = await confirm({
      title: 'حذف التصنيف',
      description:
        productsInCategory.length > 0
          ? `هذا التصنيف يحتوي على ${productsInCategory.length} منتج. سيُحذف التصنيف فقط وتبقى المنتجات بدون تصنيف.`
          : 'سيُحذف التصنيف نهائياً. لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف التصنيف',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await api.categories.delete(id);
      toast.success('تم حذف التصنيف');
      void fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('تعذّر حذف التصنيف');
    }
  };

  /* ===== مساعدات ===== */

  const handleOrdersUpdate = useCallback((newOrders: unknown[], newStats: unknown): void => {
    ordersCache.current = { data: newOrders, stats: newStats, loaded: true };
    setPendingOrdersCount((newStats as { newOrders?: number } | null)?.newOrders ?? 0);
  }, []);

  const getCategoryName = useCallback(
    (categoryId: string | null | undefined): string =>
      categories.find((c) => c.id === categoryId)?.name || 'بدون تصنيف',
    [categories],
  );

  const navigateToTab = useCallback(
    (tab: string): void => {
      // مسار نسبي: يُحلّ مقابل مسار اللوحة الأب، فلا نكرّر البادئة هنا.
      if (isDashboardTab(tab)) navigate(tab);
    },
    [navigate],
  );

  const startTour = useCallback((): void => setShowOnboarding(true), []);

  const completeOnboarding = useCallback((): void => {
    if (user) localStorage.setItem(`onboarding_completed_${user.uid}`, 'true');
    setShowOnboarding(false);
  }, [user]);

  const openProductForm = useCallback((product?: Product | null): void => {
    setEditingProduct(product ?? null);
    setShowProductForm(true);
  }, []);

  const openCategoryForm = useCallback((category?: Category | null): void => {
    setEditingCategory(category ?? null);
    setShowCategoryForm(true);
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      user,
      adminData,
      currentPlan,
      isTrial,
      hideUpgradeUI,
      getLimits,
      logout: handleLogout,

      products,
      categories,
      loading,
      loadError,
      storeCurrency,
      storeTheme,
      storeLocation,
      storeAnnouncement,
      storeSocialLinks,
      pendingOrdersCount,
      daysRemaining,
      publicStoreUrl,

      reloadData: fetchData,
      reloadStoreData: fetchStoreData,

      showProductForm,
      editingProduct,
      openProductForm,
      closeProductForm: () => {
        setShowProductForm(false);
        setEditingProduct(null);
      },
      saveProduct: handleSaveProduct,
      deleteProduct: handleDeleteProduct,

      showCategoryForm,
      editingCategory,
      openCategoryForm,
      closeCategoryForm: () => {
        setShowCategoryForm(false);
        setEditingCategory(null);
      },
      saveCategory: handleSaveCategory,
      deleteCategory: handleDeleteCategory,

      adGeneratorProduct,
      openAdGenerator: setAdGeneratorProduct,
      closeAdGenerator: () => setAdGeneratorProduct(null),

      savingTheme,
      saveTheme: handleSaveTheme,

      saveCurrency: handleSaveCurrency,
      saveLocation: handleSaveLocation,
      toggleLocationVisibility: handleToggleLocationVisibility,
      updateStoreInfo: handleUpdateStoreInfo,
      saveAnnouncement: handleSaveAnnouncement,
      saveSocialLinks: handleSaveSocialLinks,

      limitAlert,
      showLimitAlert: (type: LimitAlertType) => setLimitAlert({ show: true, type }),
      closeLimitAlert: () => setLimitAlert({ show: false, type: null }),
      confirm,

      ordersCache: ordersCache.current,
      handleOrdersUpdate,

      showOnboarding,
      startTour,
      completeOnboarding,

      getCategoryName,
      navigateToTab,
    }),
    // كل الاعتماديات primitives أو دوال مغلّفة بـ useCallback، فيبقى المرجع
    // مستقراً ولا يعيد المزوّد رسم كل التبويبات بلا داعٍ.
    [
      user, adminData, currentPlan, isTrial, hideUpgradeUI, getLimits, handleLogout,
      products, categories, loading, loadError, storeCurrency, storeTheme, storeLocation,
      storeAnnouncement, storeSocialLinks, pendingOrdersCount, daysRemaining, publicStoreUrl,
      fetchData, fetchStoreData,
      showProductForm, editingProduct, openProductForm, adGeneratorProduct,
      showCategoryForm, editingCategory, openCategoryForm,
      savingTheme, limitAlert, confirm,
      handleOrdersUpdate, showOnboarding, startTour, completeOnboarding,
      getCategoryName, navigateToTab,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={confirmRequest !== null}
        onOpenChange={(open) => {
          if (!open) resolveConfirm(false);
        }}
        title={confirmRequest?.title ?? ''}
        description={confirmRequest?.description}
        confirmLabel={confirmRequest?.confirmLabel}
        cancelLabel={confirmRequest?.cancelLabel}
        tone={confirmRequest?.tone}
        onConfirm={() => resolveConfirm(true)}
      />
    </DashboardContext.Provider>
  );
}

/**
 * useDashboard — الوصول إلى حالة اللوحة من أي تبويب.
 * يرمي خطأ واضحاً إن استُخدم خارج المزوّد (خطأ برمجي لا حالة تشغيلية).
 */
export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used inside <DashboardProvider>');
  }
  return context;
}

export { DashboardContext };