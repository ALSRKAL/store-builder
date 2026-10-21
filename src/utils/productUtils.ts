import type { Product } from '../schemas/product';

/**
 * The API persists the discount percentage but not an absolute old price.
 * Reconstruct the old price from `discount` so the storefront can show the
 * strike-through price consistently for real products (demo data already has
 * `originalPrice`).
 */
export function withDerivedOriginalPrice(product: Product): Product {
  if (product.originalPrice != null && product.originalPrice > product.price) return product;
  const discount = product.discount ?? 0;
  if (discount <= 0 || discount >= 100 || product.price <= 0) return product;
  const original = product.price / (1 - discount / 100);
  return { ...product, originalPrice: Math.round(original * 100) / 100 };
}

export function withDerivedPrices(products: Product[]): Product[] {
  return products.map(withDerivedOriginalPrice);
}
