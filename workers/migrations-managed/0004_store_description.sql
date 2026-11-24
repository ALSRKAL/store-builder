-- Merchant-editable store description used by public storefront metadata
-- (social previews, canonical descriptions and structured data).
ALTER TABLE stores ADD COLUMN description TEXT;
