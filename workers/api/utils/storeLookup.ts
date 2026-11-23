/**
 * Public store identifier resolution shared by routes that are not served
 * through authoritativePublicResponse (orders, receipts, SEO).
 * Priority matches realtime/revisions.ts: current slug, immutable id, then
 * historical alias. Renames therefore never break previously shared links.
 */
export interface StoreIdentity {
  id: string;
  slug: string;
}

export async function resolveStoreIdentity(db: D1Database, identifier: string): Promise<StoreIdentity | null> {
  try {
    return await db.prepare(`
      SELECT s.id, s.slug FROM stores s
      WHERE s.id = COALESCE(
        (SELECT id FROM stores WHERE slug = ?),
        (SELECT id FROM stores WHERE id = ?),
        (SELECT store_id FROM store_slug_aliases WHERE alias = ?),
        (SELECT store_id FROM store_revisions WHERE store_id = ?)
      )
      LIMIT 1
    `).bind(identifier, identifier, identifier, identifier).first<StoreIdentity>();
  } catch {
    // Legacy databases may not have revision tables yet.
    return db.prepare(`
      SELECT s.id, s.slug FROM stores s
      WHERE s.id = COALESCE((SELECT id FROM stores WHERE slug = ?), (SELECT id FROM stores WHERE id = ?))
      LIMIT 1
    `).bind(identifier, identifier).first<StoreIdentity>();
  }
}
