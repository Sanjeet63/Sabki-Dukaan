# SabkiDukaan

Local shops in one place. Shop owners list their shop and products (photos and prices). Customers browse nearby shops, compare prices and place pickup or home-delivery orders.

**Stack:** React (Vite) · Node + Express · PostgreSQL + PostGIS · Knex

## Three separate apps in one codebase

| App | URL | Who | What they get |
|---|---|---|---|
| **Customer app** | `/` | Everyone (no login needed to browse) | Nearby shops, categories, shop storefront, cart, pickup or delivery orders, order tracking, **star ratings** |
| **Seller panel** | `/seller` | Shop owners | Registration wizard, dashboard (sales, new orders, 7-day chart), orders, products with **catalog suggestions**, **stock tracking + stock log**, **shop rating**, **delivery settings**, **share kit** (link, WhatsApp, QR poster), shop settings |
| **Admin panel** | `/admin` | Admins | Platform stats, shop approvals (approve / reject / suspend), **product catalog** (seller requests, edit, CSV import) |

Every shop gets its own share link, e.g. `/s/sharma-kirana-store-jaipur`. Anyone can open it without logging in.

Each one has its own layout and navigation: a top header plus bottom tabs for customers, and a sidebar (bottom tabs on mobile) for the seller and admin panels. The seller and admin panels are lazy-loaded, so customers never download that code.

```
SabkiDukaan/
├── client/                      React app (Vite + Tailwind + React Query + Leaflet)
│   └── src/
│       ├── layouts/             CustomerLayout, SellerLayout, AdminLayout, PanelLayout
│       ├── features/
│       │   ├── customer/        HomePage, ShopPage
│       │   ├── cart/            CartContext, CartPage
│       │   ├── orders/          OrdersPage, OrderDetailPage, status components
│       │   ├── seller/          Onboarding, Dashboard, Orders, Products, Shop settings
│       │   ├── admin/           Dashboard, Shops
│       │   └── auth/            Login, Profile, AuthContext
│       ├── components/          ui kit, Logo, Dialog, ShareShop (link/QR/poster), LocationPicker, ImageInput
│       ├── lib/                 format (paise → ₹), queries, location, image upload
│       └── api/client.js        fetch wrapper (token, errors)
├── server/                      Express API
│   └── src/
│       ├── config/env.js        env validation (zod)
│       ├── db/                  knex, migrations, seeds
│       ├── middlewares/         auth (JWT), validate (zod), error handler
│       ├── shared/              errors, event bus, validators, slugs
│       └── modules/
│           ├── auth/            Google login, /me
│           ├── users/
│           ├── categories/
│           ├── shops/           register, nearby search (PostGIS), seller update
│           ├── products/        shop products CRUD + search
│           ├── orders/          pickup/delivery orders + status state machine
│           ├── stock/           stock quantities + stock log (stock_movements)
│           ├── catalog/         master product list, suggestions, seller requests, CSV import
│           ├── ratings/         1-5 star shop ratings on completed orders
│           ├── stats/           seller and admin dashboards
│           ├── admin/           shop approval
│           ├── uploads/         Cloudinary signed uploads
│           └── notifications/   listens to events (logs for now, FCM/SMS later)
```

Each backend module follows `routes → service → repository`: business logic lives in the service, SQL in the repository.

---

## Local setup

Requirements: Node 22+ and a Supabase project (free) with PostGIS. The database is Supabase, there is no local DB.

```bash
npm install
cp server/.env.example server/.env      # Supabase DATABASE_URL (DB_SSL=true), JWT_SECRET: openssl rand -hex 32
npm run db:migrate
npm run db:seed                         # categories + ~340 starter catalog products
npm run dev                             # API on :4000, React on :5173
```

Open http://localhost:5173. Login is **Google only**, so set `GOOGLE_CLIENT_ID` and add `http://localhost:5173` to the client's authorized JavaScript origins. Put your Gmail in `ADMIN_EMAILS` to become admin.

---

## API (v1)

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/auth/config` | public |
| POST | `/api/v1/auth/google` `{ credential }` | public |
| GET | `/api/v1/auth/me` | logged in |
| PATCH | `/api/v1/users/me` `{ name, phone }` | logged in |
| GET | `/api/v1/categories` | public |
| GET | `/api/v1/shops?lat&lng&radius&category&search&limit&offset` | public (without lat/lng: newest shops) |
| GET | `/api/v1/shops/:idOrSlug` | public (active) / owner |
| GET | `/api/v1/shops/:shopId/products?search` | public |
| GET / POST | `/api/v1/seller/shops` | logged in |
| PATCH | `/api/v1/seller/shops/:shopId` | owner |
| GET | `/api/v1/seller/shops/:shopId/stats` | owner |
| GET / POST | `/api/v1/seller/shops/:shopId/products` | owner |
| PATCH / DELETE | `/api/v1/seller/products/:productId` | owner |
| POST | `/api/v1/seller/products/:productId/stock` `{ type, quantity, note }` | owner |
| GET | `/api/v1/seller/products/:productId/stock-log`, `/api/v1/seller/shops/:shopId/stock-log?type&productId` | owner |
| GET | `/api/v1/seller/shops/:shopId/orders?status=A,B` | owner |
| POST | `/api/v1/orders` `{ shopId, items:[{productId, quantity}], note, fulfilmentType, delivery?, expectedDeliveryFeePaise? }` | logged in |
| GET | `/api/v1/orders`, `/api/v1/orders/:orderId` | customer / seller |
| PATCH | `/api/v1/orders/:orderId/status` `{ status, note }` | customer (cancel) / seller |
| GET | `/api/v1/catalog/search?q&shopId` | logged in (suggestions while adding a product) |
| PUT | `/api/v1/orders/:orderId/rating` `{ stars }` | customer of a picked up / delivered order |
| GET | `/api/v1/admin/stats` | admin |
| GET / POST / PATCH | `/api/v1/admin/catalog`, `/api/v1/admin/catalog/:productId`, `POST /api/v1/admin/catalog/import` | admin |
| GET / POST | `/api/v1/admin/catalog/requests`, `.../requests/approve`, `.../requests/merge`, `.../requests/reject` | admin |
| GET / PATCH | `/api/v1/admin/shops`, `/api/v1/admin/shops/:shopId/status` | admin |
| GET / POST | `/api/v1/uploads/config`, `/api/v1/uploads/sign` | logged in |

**Order states** (`server/src/modules/orders/orders.status.js`):
Pickup: `PLACED → ACCEPTED → READY → PICKED_UP`. Delivery: `PLACED → ACCEPTED → OUT_FOR_DELIVERY → DELIVERED`. The seller can reject a `PLACED` order or cancel later. The customer can only cancel while it is `PLACED`. Rejecting or cancelling puts tracked stock back.

### Built to grow
- All money is stored in **paise (integer)**: ₹45.50 = `4550`.
- Order items store a **snapshot** of name and price, so later price changes don't alter past orders.
- `orders.payment_status` (`none/pending/paid/...`) and `fulfilment_type` (`pickup/delivery`) already exist, so payments and delivery need no table changes.
- A master `products` catalog table is ready for cross-shop **price comparison**.
- Modules communicate through `shared/events.js` (`order.placed`, `order.status_changed`). Notifications and payments plug in as listeners.
- UUID ids, PostGIS GIST index and trigram search indexes are in place.

---

## Free deployment

The repo has ready configs: **`render.yaml`** (API) and **`netlify.toml`** (React app). Steps:

1. Push the repo to GitHub (`server/.env` is git-ignored, secrets stay on your machine).
2. **Render** → New → **Blueprint** → pick the repo. It reads `render.yaml` (free plan, Singapore, root `server`, health check `/health`) and asks for the secret values: copy them from `server/.env`. `JWT_SECRET` is generated. For `CORS_ORIGINS` put the Netlify URL (you can fill it after step 3 and redeploy).
3. **Netlify** → Add new site → Import from Git → pick the repo. It reads `netlify.toml`. Add env `VITE_API_URL=https://<your-api>.onrender.com` and deploy.
4. Set Render `CORS_ORIGINS` to the Netlify URL, and add the Netlify URL to Google Cloud → OAuth client → **Authorized JavaScript origins**.
5. On [cron-job.org](https://cron-job.org), call `https://<your-api>.onrender.com/health` every 10 minutes so the free API doesn't sleep (this also keeps Supabase active).

| What | Where | Notes |
|---|---|---|
| Database | [Supabase](https://supabase.com) free | Create a project, then copy the connection string (Session pooler). The migration enables PostGIS. |
| API | [Render](https://render.com) free Web Service | `render.yaml`: root `server`, build `npm install && npm run migrate && npm run seed`, start `npm start` |
| React | [Netlify](https://netlify.com) | `netlify.toml`: base `client`, build `npm run build`, publish `dist`, SPA redirect |
| Photos | [Cloudinary](https://cloudinary.com) free | Add cloud name, API key and secret to the Render env |
| Google login | [Google Cloud Console](https://console.cloud.google.com) → OAuth Client ID (Web) | Add the Netlify URL as an authorized JavaScript origin |
| Keep API awake | [cron-job.org](https://cron-job.org) | Ping `https://<api>/health` every 10 minutes |

**Render env vars:** `NODE_ENV=production`, `DATABASE_URL=<supabase>`, `DB_SSL=true`, `JWT_SECRET=<random 64 chars>`, `CORS_ORIGINS=https://<netlify-site>`, `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `CLOUDINARY_*`.
The build command runs migrations and seeds on every deploy. Both are safe to re-run.

**Netlify env:** `VITE_API_URL=https://<render-api>.onrender.com`

---

## Roadmap
- [ ] PWA (manifest + service worker) so the app installs on phones
- [ ] Push notifications (FCM) in `notifications.handlers.js`
- [ ] Phone OTP login (MSG91)
- [x] Master catalog with suggestions, seller requests and admin CSV import
- [ ] Price comparison across shops (uses the catalog links)
- [ ] Bulk product upload for sellers (CSV/Excel)
- [x] Star ratings · [ ] written reviews
- [ ] Online payments (Razorpay) as a `payments` module
- [ ] Delivery
