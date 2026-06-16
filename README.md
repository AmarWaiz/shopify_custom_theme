# Aurora — Shopify Online Store 2.0 Theme

A modern, fast, mobile-first Shopify OS 2.0 theme. Built with Liquid, JSON
templates, the Sections Everywhere architecture, vanilla ES6, and a tokenized
CSS design system. No build step, no framework dependencies.

Theme Check: **0 offenses**.

---

## Highlights

- **OS 2.0**: JSON templates, section groups (`header-group`, `footer-group`),
  app-block ready.
- **Performance**: single deferred JS file, per-section scoped CSS, lazy images
  with `srcset`/`sizes`, fluid type via `clamp()`, system-font fallback.
- **AJAX cart** with slide-out drawer, free-shipping progress bar, quantity
  steppers, order notes — powered by the Section Rendering API.
- **Predictive search** drawer (products, collections, pages, articles).
- **Product page**: media gallery + thumbnails + click-to-zoom, variant picker
  with color swatches, live price/SKU/inventory, sticky add-to-cart,
  collapsible rows, share, related products, recently viewed (localStorage).
- **Collection page**: storefront filters (list, price range, boolean),
  sorting, pagination, mobile filter panel.
- **Accessibility**: skip link, focus-visible rings, ARIA on drawers/dialogs,
  `prefers-reduced-motion` support, semantic landmarks.
- **SEO**: canonical, Open Graph/Twitter, JSON-LD via Shopify `structured_data`.
- **i18n & multi-currency**: locale + country selectors (localization form),
  all UI strings in `locales/en.default.json`.
- **Theme editor**: every content section exposes text, colors, layout, and
  padding controls. No hardcoded copy.

---

## File structure

```
layout/        theme.liquid, password.liquid, (gift_card via template)
templates/     *.json page templates + customers/*.liquid + page.* variants
sections/      header, footer, cart-drawer, main-*, and content sections
snippets/      icon, price, product-card, article-card, cart-bubble, …
assets/        base.css (design system), global.js (behavior)
config/        settings_schema.json, settings_data.json
locales/       en.default.json, en.default.schema.json
```

### Page templates included
Home, Collection, Product, Cart, Search, List collections, Blog, Article,
Page, 404, Password, Gift card. Customer: login, register, account, order,
addresses, reset/activate password. Custom: `page.about`, `page.contact`,
`page.faq`, `page.landing`, `page.lookbook`, `page.size-guide`,
`page.wholesale`, `page.affiliate`.

---

## Installation

### Option A — Shopify CLI (recommended)
```bash
# from this folder
shopify theme dev          # live preview against your store (login prompt)
shopify theme push         # upload as a new unpublished theme
shopify theme check        # lint (expect: no offenses)
```

### Option B — Manual upload
1. Zip the theme folder (the folder that contains `layout/`, `templates/`, …).
2. Shopify admin → **Online Store → Themes → Add theme → Upload zip**.
3. **Customize** to configure sections, then **Publish**.

---

## Configuration

| Where | What to set |
|-------|-------------|
| **Theme settings → Colors / Typography / Layout** | brand palette, fonts, page width, radius |
| **Theme settings → Cart** | drawer vs page, free-shipping threshold, notes |
| **Theme settings → Social media** | profile URLs (drive footer icons + sharing) |
| **Header section** | logo, menu (supports 3-level mega menu), sticky toggle |
| **Footer section** | brand / menu / text / newsletter blocks |
| **Navigation** (admin) | create `main-menu` and `footer` link lists |

### Metafields used (optional, auto-detected)
- `reviews.rating` (rating) + `reviews.rating_count` — product card & PDP stars
- `custom.specifications` (rich text) — PDP "Specifications" block

### Filters
Collection filters come from **Settings → Search & discovery → Filters** in the
Shopify admin; the collection page renders whatever you enable there.

### Wishlist
Built-in, self-contained: the PDP heart button (`[data-wishlist-add]`) saves the
product handle to `localStorage` (`aurora:wishlist`), and the **Wishlist** page
template (`templates/page.wishlist.json` → `sections/main-wishlist.liquid`)
renders the saved products client-side. The header heart shows a live count and
links to `/pages/wishlist` by default.

**Setup:** create a Page in the Shopify admin (Online Store → Pages → Add page),
give it any title, and set its **Theme template** to `wishlist`. Make sure the
page handle is `wishlist` so `/pages/wishlist` resolves (or override the header
"Wishlist page link" to match, or to point at a third-party wishlist app).

---

## Browser support
Evergreen Chrome, Firefox, Safari, Edge. Graceful degradation: filters and
search work without JS; `backdrop-filter` and `color-mix` degrade to solid
colors.
