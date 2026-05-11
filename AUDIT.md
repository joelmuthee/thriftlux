# ThriftLux audit — against catalog standards in CLAUDE.md

Date: 2026-05-09
Reference: `~/.claude/CLAUDE.md` "Catalog site standard feature set", "Admin panel standard pattern", "WhatsApp Marketing", "Analytics", "Worker endpoint conventions", "Catalog data model — thrift vs new-stock", and `Website Designs/ryker-luxury/` as the reference implementation.

ThriftLux is a **thrift store** (each bag is one-of-one), so the data model is `sold: boolean`, no stock grid, no restock, no "Only N left", no size guide, no "back in stock" broadcasts. Everything else from the standard should land.

---

## Public site (`index.html` + `main.js`)

| Feature                                  | Status        | Notes |
|------------------------------------------|---------------|-------|
| Hero (eyebrow + serif title + italic accent + subhead + 2 CTAs) | ✓ done        | |
| Availability filter pills (All / Available / Sold) | ✓ done        | |
| Branch pills                             | n/a           | Single seller, single branch (CBD) |
| Category pills                           | ✗ missing     | Need categories: Crossbody, Shoulder, Tote, Hobo, Clutch, Bucket, Top-Handle |
| Search input (debounced ~180ms, name+desc+category, × clear) | ✗ missing     | |
| Sort dropdown (Featured / Newest / Price ↑ / Price ↓) | ✗ missing     | Needs `createdAt` on each bag |
| NEW badge (gold ribbon, last 7 days)     | ✗ missing     | Needs `createdAt` |
| One-of-one badge (replaces "Only N left")| ✗ missing     | Subtle "1 of 1" or no badge — thrift implicit |
| Sold badge                                | ✓ done        | |
| Wishlist (♥ icon, localStorage, drawer, bundled WhatsApp enquiry) | ✗ missing     | |
| Multi-image carousels (per-bag `images: []`, dot indicators, swipe) | ✗ missing     | Each bag in IG often has multiple angles |
| Lightbox                                  | ✓ done        | |
| "View on IG" button                      | partial       | Currently labelled "360° View" — fine, but should add IG icon |
| WhatsApp Enquire button (pre-filled)     | ✓ done        | |
| Pagination (15 / page, numbered, ellipsis) | n/a           | Only 24 bags; not needed yet. Add when catalogue >40 |
| Size guide modal                          | n/a           | Bags don't have sizes |
| Embedded Google map (CBD drop-off)       | ✗ missing     | CLAUDE.md flags this as mandatory for physical-shop clients |
| OG / social sharing meta tags (full set) | partial       | Have basic OG, missing `og:image:secure_url`, `og:image:alt`, `twitter:card`, `og:locale`, canonical link |
| Mobile single-row scrolling pills        | partial       | Filter pills wrap; should single-row scroll on mobile |
| Per-browser analytics (lightbox opens, enquiries, wishlist adds, IG clicks) | ✗ missing     | |

---

## Admin (`admin.html` + `admin.js`)

| Feature                                  | Status        | Notes |
|------------------------------------------|---------------|-------|
| Login form polish (≥440px wide, 16px input padding, 16px font, 0.06em letter-spacing) | ✓ done in this pass | |
| Sticky sub-nav with count badges          | ✓ done in this pass | + Add new · Sales · Inventory · WhatsApp Marketing · Analytics · All bags |
| `+ Add new bag` gold-CTA in nav           | ✓ done in this pass | |
| Sales dashboard (Today/Week/Month/All-time KPI + Top categories + Recent sales) | ✓ done in this pass | KPI cards were already on remote; this pass added Top categories + Recent sales |
| Inventory dashboard adapted for thrift    | ✓ done in this pass | KPIs: Total / Sold / Total revenue / Avg sale price. No low-stock. Filterable table (All / Available / Sold) |
| WhatsApp Marketing (subject, item picker, recipient toggles, sequenced WA Web tabs, copy fallback) | ✓ done in this pass | Adapted copy: "new drops, not back in stock" |
| Analytics dashboard (localStorage events + Most viewed / Most enquired) | partial | Dashboard UI is live; the public-side event emitter is pending |
| IG quick-add (URL → fetch caption + image via Worker `/api/ig-fetch`) | partial | UI is live in admin form; falls back to friendly message until worker endpoint ships |
| Add/edit form: main image upload          | ✓ done        | Uploads via worker `/api/image` already wired |
| Add/edit form: additional images (up to 8 with previews + remove) | ✓ done in this pass | Mixes existing URL strings + new staged uploads when editing |
| Add/edit form: category dropdown          | ✓ done in this pass | 10 thrift-relevant categories |
| Add/edit form: Instagram URL field        | ✓ done        | `reel` field; mirrored to `instagramUrl` for standard alignment |
| Add/edit form: stock grid                 | n/a — thrift  | Each bag is 1 of 1 |
| Add/edit form: branch dropdown            | n/a           | Single shop |
| Bulk actions (checkbox + sticky bar: Set category / Mark sold / Mark available / Delete / Clear) | ✓ done in this pass | |
| Mark-as-sold flow + buyer capture modal   | ✓ done        | Already on remote: name + phone + notes + reCAPTCHA + GHL proxy. Buyer info now also drives WhatsApp Marketing recipients list. |
| Restock modal                              | n/a — thrift  | One of one |
| Connected to backend (Worker + KV)        | ✓ done        | `https://thriftlux-api.stawisystems.workers.dev` — bulk publish, image upload, GHL buyer proxy all live |

---

## Data model

Current `data.json` schema:
```json
{
  "id": "DYDQo8Pt0xH",
  "name": "...",
  "description": "...",
  "price": 1500,
  "sold": true,
  "image": "images/bags/reel_DYDQo8Pt0xH.jpg",
  "reel": "https://www.instagram.com/reel/.../"
}
```

Target thrift schema (backward compatible):
```json
{
  "id": "DYDQo8Pt0xH",
  "name": "...",
  "description": "...",
  "category": "Bucket",                              // NEW: filter & analytics
  "price": 1500,
  "sold": true,
  "image": "images/bags/reel_DYDQo8Pt0xH.jpg",
  "images": ["images/bags/.../front.jpg", "..."],    // NEW: optional, multi-angle
  "reel": "https://www.instagram.com/reel/.../",     // keep
  "instagramUrl": "https://...",                      // NEW alias for consistency
  "createdAt": "2026-05-08T13:00:00Z",                // NEW: NEW-badge + sort
  "sales": [                                          // NEW: drives Sales + Marketing dashboards
    {
      "salePrice": 1500,
      "buyerName": "Brian Kamau",
      "buyerPhone": "254712345678",
      "notes": "delivered to Westlands",
      "soldAt": "2026-05-09T08:30:00Z"
    }
  ]
}
```

For thrift: `sales` is always length 0 or 1. The `sold: true` flag stays as the canonical sold marker (cheap to filter on). When the toggle is flipped, optionally record a sale entry; when un-flipped, drop it.

---

## Worker / API

| Endpoint                  | Status      | Notes |
|---------------------------|-------------|-------|
| `GET /api/bags`           | ✓ deployed    | Frontend reads from here, not from `data.json` |
| `GET /api/health`         | ✓ deployed    | |
| `POST /api/bulk` (auth)   | ✓ deployed    | |
| `POST /api/image` (auth)  | ✓ deployed    | Base64 → KV. Returns `/img/<file>`. Bags reference these absolute URLs in `image` and `images[]`. |
| `GET /img/<file>`         | ✓ deployed    | |
| `POST /api/buyer`         | ✓ deployed    | Proxies buyer capture to GHL form endpoint with reCAPTCHA Enterprise token. |
| `GET /api/ig-fetch?url=`  | ✗ missing     | UI is wired in this pass; needs worker route. Pattern: /embed/captioned/ scrape returning `{ imageUrl, caption, postUrl }`. |
| Wrangler secret `ADMIN_TOKEN` | ✓ set     | Encoded in admin.js for the live Worker. |

---

## What I shipped in this pass

1. **Audit doc** (this file).
2. **Admin rebuild on top of the live API** — sticky sub-nav, Top categories + Recent sales added to the existing Sales Overview, new Inventory / WhatsApp Marketing / Analytics dashboards, IG quick-add panel, bulk actions, login form polish, multi-image upload, category dropdown. **Preserved** the existing buyer capture modal, GHL/reCAPTCHA proxy, and Worker-backed image upload + bulk publish.
3. **No stock grid, no restock modal, no "Only N left", no size guide** — explicitly skipped per thrift model.
4. **Backward-compatible data model** — `category`, `images: []`, `instagramUrl`, `createdAt` backfilled on load; existing bags with `soldTo` keep working.

## What stays for a follow-up pass

- **Public-side**: search input · sort dropdown · NEW badge · wishlist · multi-image carousels · embedded map · per-browser analytics tracking · full OG meta set.
- **Worker `/api/ig-fetch`** route so the IG quick-add panel actually works (UI is already wired with graceful failure).
- **Public-site analytics emitter** writing to `localStorage.thriftlux_analytics` so the admin Analytics dashboard shows real visitor data, not just owner browsing.
