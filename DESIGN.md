# StoreBuilder — Design Language

## Direction: "دفتر التاجر" (The Merchant's Ledger)

The product is Arabic commerce software. The interface should feel like a precise
working ledger: paper, ink, rules, numbers that line up. It should not look like a
generic SaaS template (no indigo/violet, no glass, no glowing gradients, no
icon-tile feature cards).

Two surfaces share one structural language:

- **Platform surfaces** (landing, auth, admin) use the ink/paper platform palette.
- **Storefront** uses the merchant's `--store-*` colors, but the same rules,
  typography, and flat surfaces. Merchant color is applied to actions, active
  states, and prices — not used as a wash over the whole page.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#F4F1E8` | App/page background (warm paper) |
| `--surface` | `#FCFAF3` | Cards, inputs, bars |
| `--surface-raised` | `#FFFFFF` | Dialogs, popovers |
| `--surface-sunken` | `#EAE5D8` | Wells, table headers, active nav |
| `--fg` | `#191710` | Primary text (ink) |
| `--fg-muted` | `#5A5446` | Secondary text (7.2:1 on surface) |
| `--fg-subtle` | `#6A6353` | Tertiary text (4.7:1 on sunken, 5.3:1 on paper) |
| `--border` | `#D8D2C2` | 1px rules and card edges |
| `--border-strong` | `#B5AC97` | Hover/focus edges |
| `--primary` | `#191710` | Primary action (ink), active states |
| `--accent` | `#A8470A` | Links, focus ring, selected accents (5.6:1) |
| `--highlight` | `#F2C14E` | Marker highlight behind one phrase only |
| `--danger` | `#A32A1E` | Destructive, errors |
| `--warning` | `#8A5A00` | Expiring, caution |
| `--success` | `#1E6B4A` | Paid, delivered, success |
| `--info` | `#1F4E6B` | Informational |

Rules:

- Never use a gradient as decoration. No radial glows, no gradient text.
- No glass/backdrop-blur surfaces.
- No shadow on flat cards. Shadows belong only to overlays (dialog/sheet/popover).
- Saffron highlight appears **once** per screen, behind a single phrase. It is not
  a button color and not a status color.
- Merchant storefront primaries come from `--store-primary`; platform accent never
  leaks into the storefront.

## Typography

- Display/headings: **Alexandria** (`font-display`), weights 500–700.
- Body/UI/data: **IBM Plex Sans Arabic** (`font-sans`), weights 300–700.
- Body minimum 16px. Labels 13px. Prices and counters use `tabular-nums` and
  `dir="ltr"` where they are standalone numbers.
- Headings: line-height 1.35–1.45, no negative tracking on Arabic.
- Line length: 46–70 characters for prose. Section descriptions never centered.

Scale (Tailwind):

- `text-display`: 2.5rem / 1.3 (fluid via `clamp` in page-level usage)
- `text-h1`: 2rem / 1.4
- `text-h2`: 1.5rem / 1.45
- `text-h3`: 1.125rem / 1.55
- `text-body`: 1rem / 1.75
- `text-label`: 0.8125rem / 1.35
- `text-data`: 0.875rem / 1.35, tabular

## Shape and surface

- Radius: 4px controls, 6px cards, 8px dialogs, 10px maximum.
- Cards are defined by a 1px `--border`; no shadow, no gradient border.
- Separators are 1px rules, not side-accent stripes on every card.
- Nested cards are forbidden. Flatten with rules and spacing.
- Content widths: 1200px marketing, 1152px admin. Page gutters 16/24/32px.

## Layout

- Start-aligned by default. Centered text is reserved for short empty states and
  compact dialogs.
- Section headers are split: title at the start, description at the end on
  desktop, with a rule above. No kicker label above a heading.
- Equal 3-column feature-card grids are not used. Features are a ruled ledger list.
- Step sequences may use numerals because they encode order; they are not circles
  and not decorative section labels.

## Components

- Buttons: 44px minimum height, 4px radius, solid ink primary, 1px outline
  secondary, no resting shadow. Icon buttons are 44×44.
- Inputs: 44px, 1px border, surface background, 6px radius, label above field,
  errors as 12px danger text under the field.
- Status: 6px dot + text label. Pills are only for counts or compact status, never
  for navigation.
- Dialogs/sheets: Radix only, 1px border, overlay shadow, no blur, close button
  44×44, sticky footer for forms.
- Icons: `lucide-react`, `strokeWidth={1.75}`, 16–20px, monochrome. No emoji in UI,
  toasts, empty states, or provider logos.

## Motion

- Tokens from `src/lib/motion.ts` only. 150–300ms, ease-out.
- Motion communicates entry/exit or state change. No floating, pulsing, shimmering,
  marquee, or auto-rotating content. Carousels advance only on user action.

## Storefront specifics

- Structure is editorial, not "marketplace template": solid header with a rule,
  category text tabs, featured product split panel, product grid at 2/3 columns,
  square imagery, flat cards.
- Cart is reachable from the header. No floating cart blob.
- Photos are never covered by decorative gradients. Story captions use a solid
  scrim bar for legibility.
