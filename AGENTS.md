# AGENTS.md: SabkiDukaan

Guide for anyone (human or AI agent) working on this codebase: what the product is, how it is built, what has been done so far, and the rules to follow.

---

## 1. Product

A hyperlocal marketplace for Indian neighbourhood shops.

- **Shop owners (sellers)** register their shop (kirana, medical, dairy, etc.), list products with photo and price, optionally track stock quantities (with a stock log), take orders, optionally offer **home delivery done by the shop itself** (own fee, free-above amount, minimum order, area), and share their own shop link and QR code.
- **Customers** browse nearby shops and products without logging in, add to cart and place a **pickup order** (pay at the counter) or, if the shop delivers, a **delivery order** (pay on delivery). There is no online payment, and the platform has no delivery partners.
- **Admins** approve, reject or suspend shops and see platform stats.

Most users are on **phones**, so every UI change must be checked at phone width (390px) first.

The owner's preferences:
- **All UI text and code comments in English** (no Hindi/Hinglish).
- Keep it **free to run** (free tiers only).
- Stack must stay **Node + Express + React**.
- Customer UI should match the **seller panel style** (see section 6).

---

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 8, React Router 8, TanStack Query 5, Tailwind CSS 4, lucide-react icons, sonner toasts, Leaflet + OpenStreetMap, `qrcode` |
| Backend | Node 22+ (dev uses Node 25 via nvm), Express 5, Knex 3 + `pg`, Zod 4, JWT, google-auth-library, express-rate-limit, helmet |
| Database | PostgreSQL + PostGIS (location search) + pg_trgm |
| Auth | **Google Sign-In only** → server-issued JWT (dev login was removed on purpose) |
| Images | Cloudinary signed uploads (browser uploads directly; server only signs) |
| Language | Plain JavaScript (ESM), no TypeScript |

Knex was chosen over Prisma (Prisma 8 was RC-only and weak on PostGIS).

---

## 3. Repository layout

```
SabkiDukaan/                 npm workspaces: server, client
├── AGENTS.md                this file
├── README.md                setup + API + deploy guide
├── render.yaml              Render Blueprint for the API
├── netlify.toml             Netlify build + SPA redirect for the React app
├── server/
│   ├── .env                 real secrets (git-ignored). Points at Supabase.
│   ├── .env.example
│   └── src/
│       ├── app.js, server.js
│       ├── config/env.js    Zod-validated env
│       ├── db/              knex.js, cli.js, migrations/, seeds/ (01_categories, 02_catalog), catalog-data.js (starter list)
│       ├── middlewares/     auth (JWT), validate (Zod), error, rateLimit
│       ├── shared/          errors, events (in-process bus), validators, slug
│       └── modules/
│           ├── auth/        /auth/config, /auth/google, /auth/me
│           ├── users/       PATCH /users/me
│           ├── categories/
│           ├── shops/       nearby/latest search, by id or slug, seller register/update, delivery.js (fee rules)
│           ├── products/    shop products CRUD, GET /products (across nearby shops)
│           ├── orders/      pickup/delivery orders + state machine (orders.status.js)
│           ├── stock/       stock adjustments, stock log, order stock hooks (stock.rules.js)
│           ├── catalog/     master catalog: suggestions, requests, admin CRUD, CSV import
│           ├── ratings/     PUT /orders/:id/rating (1-5 stars)
│           ├── stats/       seller + admin dashboards
│           ├── admin/       shop approval
│           ├── uploads/     Cloudinary signature
│           └── notifications/ event listeners (only log for now)
└── client/src/
    ├── App.jsx              routes; seller/admin pages are lazy-loaded
    ├── main.jsx             providers: Query, Router, Auth, Location, Cart, Dialog, Toaster
    ├── index.css            Tailwind theme + design tokens (see section 6)
    ├── api/client.js        fetch wrapper, token, friendly error messages
    ├── layouts/             CustomerLayout, SellerLayout, AdminLayout, PanelLayout
    ├── components/          ui.jsx (kit), Dialog (Modal + confirm), Logo, ShareShop,
    │                        LocationPicker, LocationSheet, ImageInput, UserMenu
    ├── lib/                 format.js (money/time/category colours), queries.js,
    │                        useUserLocation.jsx, image.js (compress + upload)
    └── features/
        ├── customer/        HomePage, ShopPage, productParts (ProductTile, QuantityControl,
        │                    ProductDetailModal, useAddToCart)
        ├── cart/            CartContext (localStorage, one shop per cart), CartPage
        ├── orders/          OrdersPage, OrderDetailPage, OrderComponents
        ├── auth/            LoginPage, ProfilePage (menu), ProfileDetailsPage (edit), AuthContext
        ├── seller/          Onboarding (3-step), Dashboard, Orders, Products,
        │                    Share kit, Shop settings (menu) + section edit pages, ShopFields,
        │                    DeliveryFields, SellerStockLogPage, stockParts (StockModal, StockPill)
        └── admin/           Dashboard, Shops, Catalog (requests | catalog | CSV import)
```

Backend modules follow **routes → service → repository**. Business logic goes in services and SQL in repositories. Modules talk via `shared/events.js` (`order.placed`, `order.status_changed`, `shop.registered`, `shop.status_changed`) instead of calling each other.

---

## 4. Data model (key rules)

Tables: `users`, `categories`, `shops`, `products` (master catalog), `catalog_requests`, `shop_products`, `stock_movements`, `orders`, `order_items`, `order_status_history`, `shop_ratings`.

- **Master catalog** (`products`): name, brand, unit, category, approx `mrp_paise`, `keywords` (Hindi/local words), `is_active`, `source` (seed/admin/request/import), generated `search_text` (also stores "5 kg" as "5kg") with a trigram index. Unique on lower(name) + lower(unit). `shop_products.product_id` links a listing to it; a shop can't list the same catalog item twice (partial unique index → 409). Search = every word must match by substring or `word_similarity >= 0.45` (typos like "ashirvad"), shop's own category first.
- **Adding a product:** a picked suggestion sends `catalogProductId`; otherwise an exact name + pack match auto-links. If nothing matches, the product is **live immediately** and a `catalog_requests` row is created (one per shop product; kept in sync while pending; removed if the product is deleted). Requests are grouped by `match_key` (lowercase, single spaces, "200 g" = "200g") so the admin sees "N shops asked". Approve creates the catalog item and links every shop in the group; Merge links them to an existing item; Reject leaves the seller's product listed but unlinked. Linking skips a shop that already lists that item. Sellers keep their own name/price.
- **Ratings:** `shop_ratings` has one row per order (unique `order_id`), 1-5 stars, only by that order's customer and only when PICKED_UP/DELIVERED; changing it updates the same row. `shops.rating_count/rating_total` are recounted from the table in the same transaction. Shop DTO `rating: { average, count }`; order DTO `rating`, `canRate`.

- **Money is always integer paise** (`price_paise`, `total_paise`). Never floats.
- **Order items snapshot** the name and price at order time.
- `orders.payment_status` (`none` for now) exists for future payments. `orders.fulfilment_type` is `pickup` or `delivery`, and `total_paise = subtotal_paise + delivery_fee_paise`.
- **Order state machine** (`server/src/modules/orders/orders.status.js`), per `fulfilment_type`: pickup `PLACED → ACCEPTED → READY → PICKED_UP`, delivery `PLACED → ACCEPTED → OUT_FOR_DELIVERY → DELIVERED`. The seller can `REJECTED` from PLACED or `CANCELLED` later. The customer can only cancel while PLACED. The status change uses a row lock. "Completed" = PICKED_UP or DELIVERED (stats).
- **Stock** is optional per product (`track_stock`). When on, `stock_qty` is the truth and `in_stock` is kept equal to `stock_qty > 0` (a sent `inStock` is ignored). Every change writes a `stock_movements` row (`type`, `change`, `balance_after`, `order_id`, `note`, `created_by`); never update `stock_qty` without one. Placing an order locks product rows (`FOR UPDATE`, id order) and records `sale`; REJECTED/CANCELLED restores exactly the order's net (`order_cancelled`), so it is safe to call twice and skips products whose tracking was turned off. Editing the count in the product form is logged as `correction`, and the client only sends `stockQty` when it changed. Customers see `stockLeft` only; `lowStockThreshold` is seller-only. The `stock.low` event fires when an item becomes low or runs out.
- **Delivery** is done by the shop. Settings live on `shops` (`delivery_enabled`, `delivery_fee_paise`, `free_delivery_above_paise` = free at or above, `delivery_min_order_paise`, `delivery_radius_m`, `delivery_note`). The server computes the fee (`shops/delivery.js`, mirrored in `client/src/lib/delivery.js`), checks the radius with PostGIS, snapshots address/phone/location/distance/fee on the order, and returns 409 `DELIVERY_FEE_CHANGED` if `expectedDeliveryFeePaise` differs. Turning delivery off keeps the settings and doesn't affect existing orders. Pickup is always available.
- `shops.location` is `geography(Point,4326)` with a GIST index. `shops.slug` is unique and permanent (share links `/s/:slug`). It is generated as `slugify(name city)-xxxx`.
- One shop per seller (`MAX_SHOPS_PER_OWNER = 1` in shops.service.js). Registering a shop turns a customer into a seller.
- Products are soft-deleted (`is_active = false`).
- Prices always come from the DB when placing an order, never from the client.

Migrations: `20261117000000_initial_schema.js`, `20261118000000_shop_slug.js`, `20261120000000_stock_and_delivery.js`, `20261121000000_master_catalog.js`, `20261121010000_shop_ratings.js`, `20261121020000_catalog_backfill.js` (links/requests for products listed before the catalog). All applied on Supabase, and `npm run db:seed` loaded ~340 starter products (approximate MRPs). Never edit an applied migration; add a new one with `npm run migrate:make -- <name> --workspace server`.

---

## 5. API summary (`/api/v1`)

Public: `GET /categories`, `GET /shops` (with `lat&lng` → nearby + `distanceM`, without → newest), `GET /shops/:idOrSlug`, `GET /shops/:shopId/products`, `GET /products` (products across nearby active shops, `sort=nearest|price|discount`), `GET /auth/config`, `POST /auth/google`.

Logged in: `GET /auth/me`, `PATCH /users/me`, `POST/GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /uploads/sign` (purposes: product, shop, catalog), `GET /catalog/search?q&shopId`, `PUT /orders/:id/rating`.

Seller: `/seller/shops` (GET/POST/PATCH; PATCH also takes delivery settings), `/seller/shops/:id/products`, `/seller/products/:id` (PATCH/DELETE), `POST /seller/products/:id/stock` (`restock|sold_offline|returned|damaged|expired|correction`), `/seller/products/:id/stock-log`, `/seller/shops/:id/stock-log?type=a,b&productId`, `/seller/shops/:id/orders?status=A,B`, `/seller/shops/:id/stats`.

`POST /orders` takes `fulfilmentType` (`pickup` default | `delivery`) and, for delivery, `delivery: { addressLine, phone, latitude, longitude }` plus optional `expectedDeliveryFeePaise`. Stock errors return `details: [{ field, message, productId, available }]` so the cart can fix itself.

Admin: `/admin/stats` (includes `catalog: { products, pendingRequests }`), `/admin/shops?status=`, `PATCH /admin/shops/:id/status`, `/admin/catalog` (GET search/category/includeHidden, POST, PATCH `/:id` incl. `isActive`), `POST /admin/catalog/import` (≤300 rows per call; the browser parses the CSV and sends batches), `GET /admin/catalog/requests`, `POST /admin/catalog/requests/approve|merge|reject` (by `matchKey`).

Rate limits (`middlewares/rateLimit.js`): placing orders is limited to **10/min per user**, not per IP, because Indian mobile carriers share IPs. Login is limited to 200 per 15 minutes per IP. 429 responses carry a friendly message.

Errors always have the shape `{ error: { code, message, details? } }`.

---

## 6. Design system (important)

The owner rejected generic, light/minimal and "too empty" designs. The approved look is the **seller panel style**, applied to the customer side too:

- **Dark header** (`bg-ink-900`) with a small lime-green eyebrow label (e.g. "SHOPS NEAR", "SELLER PANEL") and white bold title.
- **Floating dark bottom tab bar** on phones. The active tab is a lime pill showing its label.
- **Cream background** (`bg-cream`), **white rounded cards** (`rounded-3xl bg-white shadow-soft`).
- Colours: saffron `brand-500` (#ff5b14) for primary/ADD/cart bar, `lime-400` accent, `ink-*` warm neutrals, `marigold-*` for awnings.
- **Striped awning** (`.awning` class, colour per category via `awningStyle()` in `lib/format.js`) on shop cards, shop page, share poster.
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body).
- Logo: a map pin containing a small shop with a striped awning (`components/Logo.jsx`, `public/icon.svg`).

Customer screens:
- **Home** (`features/customer/HomePage.jsx`), in this order: location prompt (only if no location) → category row → "Shops near you" horizontal row → one product row per category with "See all". **No "Best deals" section** (removed on request). **No "Own a shop?" promo on customer home** (removed on request).
- **Shop page** (`ShopPage.jsx`): the version the owner likes. Full-bleed category-coloured cover with awning, name/badges over it, back + share buttons, an overlapping cream sheet with **4 round action tiles (Call, WhatsApp, Directions, Share)**, address/timings card, sticky search + sort chips, 2-column product grid, orange floating "View cart" bar. Don't redesign it without asking.
- Product tiles: ADD button sits on the bottom-right corner of the photo. Products without photos show a coloured first-letter tile.

**Menu pattern** (requested): account and settings pages are menus of rows (`MenuRow` in `ui.jsx`). Tapping a row opens a separate edit page with a back button. No inline edit forms on menu pages. Examples: `/profile` → `/profile/details`, `/seller/shop` → `/seller/shop/:section` (details | location | timings | delivery). The stock log is `/seller/stock?product=&type=` (linked from Products).

Use the shared components (`Modal`, `useConfirm`, `Badge`, `StatCard`, `Segmented`, `Toggle`, `EmptyState`, `PageHeader` with `back`). Never use `window.confirm/prompt`.

Grids that contain wide content must use `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_...]` to avoid horizontal overflow on phones.

**Customer desktop (lg+ only, phone layout untouched):** Home has a dark `DesktopHero` (awning, headline, location button, 3 feature tiles), categories as a 10-column tile grid, shops as a 5-column grid, and each category row as 6 products in a grid (`HScroll desktop=...`; phones keep horizontal scroll). The shop page info sheet is two columns (actions + description | address/timings/delivery card). The profile is two columns. The footer (md+) has an awning, Shop links and How it works; no "Own a shop?" promo. Keep any desktop change behind `lg:` classes.

**Stock UI** (`stockParts.jsx`, `lib/stock.js`): **neutral + brand orange only** (owner rejected dark, lime/green and multi-colour versions). Pill: white with ink-200 ring and dark number = in stock; brand-300 ring + orange number and dot = low; red-200 ring + red text = out. Update-stock sheet: light ink-50 product card with Now → New (new in brand orange); type tiles are white with a grey +/−/= chip, the selected tile has a brand-500 border on brand-50 and an orange chip; the quantity box focuses orange. Recent changes / stock log tags are grey (slate) except App order (brand); + changes in dark ink, − changes in red. No green, blue, yellow or black blocks for stock.

**Ratings UI:** stars use `fill-marigold-400`. `RatingBadge` (ui.jsx) shows "★ 4.3 (27)" and renders nothing for shops without ratings; `StarInput` is the tap-to-rate control. The catalog suggestion dropdown is `CatalogNameInput` (seller/catalogParts.jsx); a linked product shows a lime "From SabkiDukaan catalog" chip.

---

## 7. Environments and running

- **Real dev DB = Supabase** (Mumbai, `ap-south-1`, Session pooler), set in `server/.env` with `DB_SSL=true`. Cloudinary and Google Client ID are configured and verified. `ADMIN_EMAILS` is the owner's `@iiitd.ac.in` address.
- Passwords in `DATABASE_URL` must be URL-encoded (e.g. `@` → `%40`).
- There is **no local DB** any more (Docker setup and demo-data script were removed on request). Everything runs on Supabase.

Start the app:
```bash
nvm use 25            # the agent shell may lose PATH; Node lives in ~/.nvm/versions/node/v25.4.0/bin
npm run dev           # API :4000 + web :5173 (uses server/.env → Supabase)
```

Testing (on Supabase, as the owner asked). There is no automated test suite (the smoke test was removed on request), so test changes by hand through the API or UI. Use `env -u DATABASE_URL -u DB_SSL` so shell variables don't override `server/.env`:
```bash
# test API on 4001
cd server && env -u DATABASE_URL -u DB_SSL PORT=4001 node --env-file-if-exists=.env src/server.js
# test web on 5175 proxying to it (5174 may be taken by the owner's own instance; don't kill it)
cd client && PORT=5175 API_PROXY=http://localhost:4001 npx vite --port 5175 --strictPort
```
- For API or screenshot testing, create temporary `@test.local` users/shops in Supabase with a throwaway script, sign short-lived JWTs with `JWT_SECRET` into `localStorage.sd_token`, and delete everything afterwards (check that 0 `@test.local` users remain). There is no dev login.
- Phone screenshots: headless Chrome via CDP at 390×844 (the in-app browser often can't screenshot).
- **Only stop processes you started.** The owner's servers on 4000/5173/5174 must keep running.
- Run `npm run build` after frontend changes; it must pass.

---

## 8. Deployment (configs ready, not deployed yet)

Free tier: **Render** (API, root `server`, build `npm install && npm run migrate && npm run seed`, start `npm start`), **Netlify** (root `client`, publish `client/dist`, env `VITE_API_URL`), **Supabase** (DB), **Cloudinary**, **cron-job.org** pinging `/health` every 10 minutes so Render doesn't sleep. After deploy: set `CORS_ORIGINS` to the Netlify URL and add the Netlify URL to Google OAuth "Authorized JavaScript origins". Configs: `render.yaml` (Blueprint, free, Singapore, root `server`, `healthCheckPath: /health`, generated `JWT_SECRET`, secrets `sync: false`) and `netlify.toml` (base `client`, publish `dist`, SPA redirect, cache headers; `client/public/_redirects` was removed as a duplicate). Full steps are in README.md. Code is on GitHub: **private** repo https://github.com/Sanjeet63/Sabki-Dukaan (branch `main`, remote `origin`). Repo-local git identity: `Sanjeet <133045496+Sanjeet63@users.noreply.github.com>`. Never commit `server/.env`. Production uses the same Supabase database as development.

---

## 9. History of work so far

1. Planned the scalable architecture (modular monolith, Postgres+PostGIS, event bus, paise money, order snapshots, future payments/delivery).
2. Built the full MVP: auth, shop registration + admin approval, products, nearby search, cart, pickup orders with state machine.
3. Split into three separate apps (customer, seller panel, admin panel) with their own layouts. Added seller/admin stats and English-only text everywhere.
4. Connected real services: Supabase (fixed URL-encoded password and wrong-project issues), Cloudinary (verified signed upload), Google login (fixed "origin not allowed").
5. Removed dev login completely. Fixed the customer/shop-owner switch on login. Customers land on shops (no forced login), and logout goes to home.
6. Added shop share links (`/s/:slug`), share kit (copy link, WhatsApp, QR download, printable poster), owner banner on the shop page, and a new logo and brand.
7. Several UI redesign rounds for phones (Zepto/Blinkit reference). Final direction: the seller-panel style everywhere, the shop page as in the restored design, and home = categories → nearby shops → product rows. A light/minimal variant was tried and **rejected**.
8. Account and Shop settings turned into menus with separate edit pages.
9. Fixed the 429 on placing orders: per-user limit plus a friendly message.
10. Added `GET /api/v1/products` for products across nearby shops (used by home rows).
11. **Stock management**: optional per-product quantity tracking, low-stock alerts, update-stock sheet (add, sold at counter, damaged, expired, returned, exact count), stock log page, automatic deduction on order and restore on reject/cancel, no overselling under concurrent orders.
12. **Shop delivery**: Shop settings → Delivery (on/off, free or fee, free at ₹X+, minimum order, area radius, note). The cart lets customers choose pickup or delivery with address, phone and location, a live fee and a free-delivery nudge. Delivery orders have their own status flow. All stock and delivery edge cases were tested against Supabase.
13. **Master catalog**: ~340 starter products, suggestions in the seller's Add product form (fuzzy + Hindi words, fills name/unit/MRP/photo), unknown products go live and become catalog requests, admin Catalog page (approve/merge/reject grouped requests, browse/edit/hide, CSV import with template).
14. **Shop star ratings**: customers rate 1-5 stars after pickup/delivery (order page, "Rate this shop" in the orders list); ★ rating on shop cards, shop page and the seller dashboard.

## 10. Ideas / next steps

PWA (installable), push notifications (FCM in notifications.handlers.js), phone OTP login, cross-shop price comparison using the catalog links, seller bulk upload (CSV), written reviews, notify sellers when their catalog request is approved, barcode scan to add products, Razorpay payments module, `stock.low` push alerts, delivery partner integration, git + deployment.
