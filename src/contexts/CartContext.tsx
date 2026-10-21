/**
 * CartContext - Shopping Cart Management
 * Type-safe implementation with localStorage persistence
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// Cart item interface
export interface CartItem {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null | undefined;
  image: string | null;
  images: string[];
  selectedColor?: string | undefined;
  selectedSize?: string | undefined;
  quantity: number;
  addedAt: string;
}

// Product input for adding to cart
export interface CartProductInput {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null | undefined;
  image?: string | null | undefined;
  images?: string[] | undefined;
}

// Add to cart options
export interface AddToCartOptions {
  selectedColor?: string | undefined;
  selectedSize?: string | undefined;
  quantity?: number | undefined;
}

// Welcome message interface
export interface WelcomeMessage {
  type: 'returning';
  itemsCount: number;
  lastVisit: Date;
}

// Cart context value interface
interface CartContextValue {
  cartItems: CartItem[];
  isCartOpen: boolean;
  /** اكتمل تحميل السلة من التخزين — يمنع قرارات خاطئة قبل معرفة محتواها. */
  isHydrated: boolean;
  welcomeMessage: WelcomeMessage | null;
  isReturningCustomer: boolean;
  addToCart: (product: CartProductInput, options?: AddToCartOptions) => void;
  updateQuantity: (itemIndex: number, newQuantity: number) => void;
  removeFromCart: (itemIndex: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemsCount: () => number;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  dismissWelcome: () => void;
}

// Create context
const CartContext = createContext<CartContextValue | undefined>(undefined);

// Custom hook
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// Props interface
interface CartProviderProps {
  children: ReactNode;
  storeId?: string;
}

// مفاتيح localStorage
const CART_KEY = 'smart_cart';
const LAST_VISIT_KEY = 'last_visit';
const WELCOME_SHOWN_KEY = 'welcome_shown';

export function CartProvider({ children, storeId }: CartProviderProps): React.JSX.Element {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  /**
   * المتجر الذي اكتمل تحميل سلته. نستخدم المفتاح لا boolean لأن تبديل
   * المتجر يجب ألا يكتب سلة المتجر السابق في مفتاح المتجر الجديد،
   * ولأن StrictMode يعيد تشغيل التأثيرات فيجب ألا يمسح التخزين قبل القراءة.
   */
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const isHydrated = storeId ? hydratedKey === storeId : true;
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessage | null>(null);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  // مفتاح فريد لكل متجر
  const getStorageKey = useCallback(
    (key: string): string => `${key}_${storeId ?? 'default'}`,
    [storeId]
  );

  // تحميل السلة من localStorage عند بدء التشغيل
  useEffect(() => {
    if (!storeId) return;

    try {
      const savedCart = localStorage.getItem(getStorageKey(CART_KEY));
      const lastVisit = localStorage.getItem(getStorageKey(LAST_VISIT_KEY));
      const welcomeShown = sessionStorage.getItem(getStorageKey(WELCOME_SHOWN_KEY));

      // تحميل السلة المحفوظة
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as unknown;
        if (Array.isArray(parsed)) {
          setCartItems(parsed as CartItem[]);

          // التحقق من آخر زيارة لعرض رسالة الترحيب
          if (parsed.length > 0 && lastVisit && !welcomeShown) {
            const lastVisitDate = new Date(lastVisit);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60);

            // إذا مر أكثر من ساعة منذ آخر زيارة
            if (hoursDiff > 1) {
              setIsReturningCustomer(true);
              setWelcomeMessage({
                type: 'returning',
                itemsCount: parsed.length,
                lastVisit: lastVisitDate,
              });
              // تحديد أن الرسالة عُرضت في هذه الجلسة
              sessionStorage.setItem(getStorageKey(WELCOME_SHOWN_KEY), 'true');
            }
          }
        } else {
          setCartItems([]);
        }
      } else {
        // متجر آخر بلا سلة محفوظة: لا نورّث منتجات المتجر السابق.
        setCartItems([]);
      }

      // تحديث وقت الزيارة
      localStorage.setItem(getStorageKey(LAST_VISIT_KEY), new Date().toISOString());
    } catch (e) {
      // التخزين قد يكون معطلاً (وضع خاص) أو ممتلئاً؛ لا نُسقط المتجر بسببه.
      console.error('Error loading cart:', e);
    } finally {
      setHydratedKey(storeId);
    }
  }, [storeId, getStorageKey]);

  // حفظ السلة في localStorage عند كل تغيير
  useEffect(() => {
    // لا نكتب قبل اكتمال تحميل سلة هذا المتجر تحديداً.
    if (!storeId || hydratedKey !== storeId) return;

    try {
      if (cartItems.length > 0) {
        localStorage.setItem(getStorageKey(CART_KEY), JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(getStorageKey(CART_KEY));
      }
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [cartItems, storeId, hydratedKey, getStorageKey]);

  // إضافة منتج للسلة
  const addToCart = useCallback(
    (product: CartProductInput, options: AddToCartOptions = {}): void => {
      const { selectedColor, selectedSize, quantity = 1 } = options;

      setCartItems((prev) => {
        // البحث عن منتج مطابق (نفس المنتج + اللون + المقاس)
        const existingIndex = prev.findIndex(
          (item) =>
            item.id === product.id &&
            item.selectedColor === selectedColor &&
            item.selectedSize === selectedSize
        );

        if (existingIndex > -1) {
          // تحديث الكمية
          const updated = [...prev];
          const existingItem = updated[existingIndex];
          if (existingItem) {
            updated[existingIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + quantity,
            };
          }
          return updated;
        }

        // إضافة منتج جديد
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          oldPrice: product.oldPrice,
          image: product.image ?? product.images?.[0] ?? null,
          images: product.images ?? [],
          selectedColor,
          selectedSize,
          quantity,
          addedAt: new Date().toISOString(),
        };

        return [...prev, newItem];
      });
    },
    []
  );

  // حذف منتج من السلة
  const removeFromCart = useCallback((itemIndex: number): void => {
    setCartItems((prev) => prev.filter((_, i) => i !== itemIndex));
  }, []);

  // تحديث كمية منتج
  const updateQuantity = useCallback(
    (itemIndex: number, newQuantity: number): void => {
      if (newQuantity < 1) {
        removeFromCart(itemIndex);
        return;
      }
      // نفس سقف الخادم (100) حتى لا تختلف الإجماليات المعروضة عن المحفوظة.
      const cappedQuantity = Math.min(newQuantity, 100);

      setCartItems((prev) => {
        const updated = [...prev];
        const item = updated[itemIndex];
        if (item) {
          updated[itemIndex] = { ...item, quantity: cappedQuantity };
        }
        return updated;
      });
    },
    [removeFromCart]
  );

  // تفريغ السلة
  const clearCart = useCallback((): void => {
    setCartItems([]);
    if (storeId) {
      try {
        localStorage.removeItem(getStorageKey(CART_KEY));
      } catch {
        // التخزين معطّل: السلة في الذاكرة أُفرغت بالفعل.
      }
    }
  }, [storeId, getStorageKey]);

  // حساب المجموع
  const getTotal = useCallback((): number => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  // حساب عدد العناصر
  const getItemsCount = useCallback((): number => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // إخفاء رسالة الترحيب
  const dismissWelcome = useCallback((): void => {
    setWelcomeMessage(null);
  }, []);

  // فتح/إغلاق السلة
  const toggleCart = useCallback((): void => {
    setIsCartOpen((prev) => !prev);
  }, []);

  const openCart = useCallback((): void => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback((): void => {
    setIsCartOpen(false);
  }, []);

  const value: CartContextValue = {
    cartItems,
    isCartOpen,
    isHydrated,
    welcomeMessage,
    isReturningCustomer,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotal,
    getItemsCount,
    toggleCart,
    openCart,
    closeCart,
    dismissWelcome,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartContext;
