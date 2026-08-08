# phadewoman

Ecommerce site for phadewoman — a customer-facing storefront at `/` and an admin
dashboard at `/admin`. Built with Next.js (App Router) on Vercel, with Supabase
for the database and image storage, and Paystack for payments. All money is in
naira.

The storefront and the dashboard are both complete: shoppers browse, save and
buy at `/`, and everything they do shows up at `/admin`.

---

## What's in the shop

| Page | What it does |
| --- | --- |
| **Landing** (`/`) | A hero told as a story: every image from Settings → Storefront becomes a frame with its own progress segment, advancing itself, tappable left and right. Categories sit under it as story rings. Featured products are posts. Then best sellers, new in, and everything else. |
| **Shop** (`/shop`) | The catalogue, with a rail of category rings pinned under the header — it collapses to a chip row once you're into the grid, so navigation you've already read stops taking up a third of the screen. Subcategory chips, an on-sale filter, search, and five ways to sort. Every choice lives in the URL, so a narrowed shop is a link you can send someone and the back button undoes a filter. |
| **A product** | Opens as a pop-up over whatever you were reading, never a page — the grid stays scrolled where it was, filters still on. Pictures swipe and snap, a double-tap saves, and Add to bag / Buy it now / save / share sit in a bar that never scrolls away. `/product/[slug]` renders the same thing as a real page, for shared links and search engines. |
| **Saved** (`/saved`) | Everything hearted on this device. No account needed. |
| **Bag** | A drawer, not a page, so adding something never costs anyone their place. It shows the delivery charge from the same rules checkout uses, and how much more buys free delivery. |
| **Checkout** (`/checkout`) | Delivery or pickup, contact details, address, note — filled in from last time, because a returning customer should not retype their address to buy a second dress. Prices are re-derived on the server from the catalogue, so what the browser sends is only ever ids and quantities. Pays through Paystack; the order exists before payment starts. |
| **Order** (`/order/[reference]`) | Where Paystack sends a shopper back to. It verifies the payment directly rather than waiting on the webhook, so the page is right immediately, and empties the bag only once the money has actually arrived. |

Navigation on a phone is a tab bar along the bottom — home, shop, saved, bag —
because that is where a thumb is. On a wider screen the header takes over.

---

## What's in the dashboard

| Page | What it does |
| --- | --- |
| **Dashboard** | Revenue over time, order status mix, top sellers, recent orders, low-stock alerts. Switchable 7 / 30 / 90 day window. |
| **Orders** | Filter by status and type, open an order to see items, totals, payments, delivery address, and change its status. |
| **Checkouts** | Carts that were started but never paid for, what was left in them, and how many made it through. Needs `STOREFRONT_API_KEY`. |
| **Products** | Category, price, stock and status edit in place — changing a price shouldn't mean opening a product. Bulk uploader: pick a category, drop in photos and videos, and every file becomes its own product to name, price and stock side by side — autosaved as you work. Optional colourways and sizes, bulk-select rows to change status or delete. AI writes descriptions and suggests tags. SKUs generate themselves. |
| **Database** | The whole catalogue as one editable spreadsheet — name, colour, size, quantity, sold, media, category, price, cost, status, SKU, subcategory, revenue and when it was added. Cells save as you leave them, new rows arrive as drafts, media / colours / sizes open in a dialog. Download the column template, import a CSV or Excel file with a progress bar, or open the sheet full screen. Falls back to cards on a phone. |
| **Inventory** | Featured image, stock on hand and stock value, red/amber/green level indicators, one-click ±1, and a full adjustment dialog that records the reason. The five most recent movements sit on the page, with the full history one click away. |
| **Sales** | Start a sale across everything, chosen categories, or individual products — percentage or naira off, with an optional coupon code, schedule, minimum order and usage cap. |
| **Payments** | Gross, fees, net and success rate from Paystack, a breakdown by channel, and the full transaction list. "Sync from Paystack" backfills on demand. |
| **Customers** | Order counts, lifetime spend, last order, plus editable contact details and private notes. |
| **Settings** | **General** — the default low-stock alert level. **Categories** — categories with a chosen icon (AI can grow a short description into a fuller one) and the subcategory list. **Catalogue** — the shop's colour palette and size run. **Storefront** — announcement bar, hero copy, hero images, call-to-action, featured products, and what delivery costs. **Developers** — which integrations are connected, the environment variables behind them, and the Paystack webhook endpoint. |

The layout is a fixed left sidebar on desktop (collapsible, remembered between
visits) and an off-canvas drawer on mobile, with every table falling back to a
card list on small screens.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates every
   table, the `product-images` storage bucket, and a few starter categories.
3. Go to **Project Settings → API** and copy:
   - the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - the **`service_role`** secret → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key is server-only. Row Level Security is enabled on every
> table with no policies, so the public/anon key cannot read or write anything —
> all access goes through the server, behind the admin session.

### 2. Deploy to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Next.js is
detected automatically; no build settings to change.

### 3. Environment variables

In Vercel, go to **Settings → Environment Variables** and add the following, then
**redeploy** (variables only take effect on a new deployment):

| Variable | Required | What it's for |
| --- | --- | --- |
| `ADMIN_EMAIL` | ✅ | The email you sign in with at `/admin`. |
| `ADMIN_PASSWORD` | ✅ | The password you sign in with. |
| `ADMIN_SESSION_SECRET` | ✅ | Signs the session cookie. At least 32 characters — generate with `openssl rand -base64 48`. |
| `ADMIN_SESSION_HOURS` | — | How long a session lasts. Defaults to 12. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase `service_role` secret. Server-only. |
| `PAYSTACK_SECRET_KEY` | — | Enables revenue tracking and payment sync. |
| `OPENAI_API_KEY` | — | Enables the AI description assistant. |
| `OPENAI_MODEL` | — | Which model writes descriptions. Defaults to `gpt-4o-mini`. |
| `STOREFRONT_API_KEY` | — | Shared secret the storefront sends as `x-storefront-key` when it POSTs cart changes to `/api/cart`. Unset means the endpoint stays closed and the Checkouts page stays empty. |

**To change the admin login later**, edit `ADMIN_EMAIL` / `ADMIN_PASSWORD` in
Vercel and redeploy. There is no sign-up, no user table, and no password reset
flow to secure — the credentials live only in the environment.

Anything optional simply switches its feature off: without `PAYSTACK_SECRET_KEY`
the Payments page explains what to add; without `OPENAI_API_KEY` the AI
buttons don't appear.

### 4. Paystack

1. **Dashboard → Settings → API Keys & Webhooks**.
2. Copy the **Secret Key** into `PAYSTACK_SECRET_KEY`.
3. Set the webhook URL to `https://<your-domain>/api/paystack/webhook`.

Deliveries are verified against your secret key (HMAC SHA-512 of the raw body),
and records upsert on the transaction reference, so retries and replays are
safe. Use **Sync from Paystack** on the Payments page to backfill transactions
that predate the webhook.

---

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

The dashboard is at http://localhost:3000/admin.

`npm run build` for a production build, `npm run lint` to lint.

---

## How it fits together

```
src/
  app/
    (shop)/                      Everything a shopper sees
      page.tsx                   Landing page — story hero, category rings, feed
      shop/                      The catalogue: categories, filters, sorting
      product/[slug]/            One product, for shared links and search engines
      saved/  checkout/          Saved pieces, and the way to pay
      order/[reference]/         Confirmation, after Paystack sends them back
    admin/
      login/                     Sign-in (outside the dashboard shell)
      (dashboard)/               Every dashboard page + its server actions
    api/
      admin/ai/describe/         AI description assistant
      admin/upload-url/          Signed URLs for direct media upload
      cart/                      Storefront cart tracking (shared-secret gated)
      paystack/webhook/          Paystack webhook receiver
  components/
    admin/                       Shell, charts, forms, dialogs
    shop/                        Hero, rings, cards, pop-up, bag, checkout
    ui/                          Buttons, fields, badges, panels
  lib/
    auth.ts  session.ts          Admin credentials and session cookie
    queries.ts                   All dashboard reads
    shop-queries.ts  shop.ts     All storefront reads, and what a shopper pays
    cart-store.ts                Writing a shopping session, from either caller
    browser-store.ts             localStorage and media queries, as React reads them
    supabase.ts  paystack.ts     Service clients
    format.ts                    Naira, dates, slugs
    storefront.ts                Shop-front copy, stored as one settings row
    catalogue-settings.ts        The shop's colour palette and size run
    spreadsheet.ts               CSV and .xlsx reader, no dependencies
    xlsx-writer.ts               .xlsx writer for the import template
  proxy.ts                       Gates /admin behind a valid session
supabase/schema.sql              Database schema — run once
```

A few decisions worth knowing:

- **Money is stored in kobo** (integers). Paystack works in kobo too, so amounts
  pass through untouched, and there is no floating-point drift. `src/lib/format.ts`
  is the only place that converts for display or parses admin input.
- **Auth is environment-based.** The proxy gates `/admin`, and the dashboard
  layout and every server action independently re-check the session, so nothing
  depends on the proxy alone.
- **Stock changes are always logged.** Editing stock on the product page, using
  ±1, or using the adjustment dialog all write an `inventory_movements` row, so
  the history is a complete account rather than just a current number.
- **Media uploads go straight to Supabase.** The browser asks the server for a
  signed URL and PUTs the file itself, so videos aren't limited by the
  serverless request body size. Images are downscaled before they leave the
  browser; videos are stored as-is.
- **The bulk uploader autosaves to the browser.** Drafts live in `localStorage`
  until you publish, so a closed tab or a refresh doesn't lose a batch. Nothing
  is written to the database until you hit Publish.
- **The browser never names a price.** Checkout receives product ids and
  quantities and nothing else; every price, every running sale and the delivery
  charge are resolved on the server against the catalogue as it stands. A bag is
  a request, not a quote.
- **An order exists before the payment does.** It is written with our own
  reference, then Paystack is opened with that reference — so an abandoned
  payment leaves a pending order the dashboard can chase rather than nothing at
  all, and the webhook finds the order again by the same key. Stock comes off
  the shelf on the pending → paid transition only, which happens once however
  many times a webhook is redelivered.
- **Tapping a product opens a pop-up, not a page.** The address bar still
  follows, through a `#p=slug` hash: a product is shareable, the back button
  closes the pop-up instead of leaving the shop, and the grid behind it keeps
  its scroll position and its filters. A hash rather than a route because a hash
  change is not a navigation, so nothing re-renders underneath.
- **The bag lives in the browser, and a copy reaches the server.** There are no
  shopper accounts, so `localStorage` is the bag — read through
  `useSyncExternalStore` rather than copied into state on mount, so it is right
  on the first paint after hydration. A debounced copy goes to the `carts` table
  so the Checkouts page can see what people left behind. The name, phone and
  address from the last checkout are kept the same way, and stay in that browser:
  there is no account to attach them to, and a server that can't authenticate
  who is asking has no business handing them back. Card details never touch this
  app at all — they are typed on Paystack's own page.
- **The shop is fast because it doesn't ask twice.** The catalogue is cached
  across requests under one tag, so a busy evening isn't five queries per
  visitor — one of them a scan of every order line ever written. Every dashboard
  mutation goes through `src/lib/admin-revalidate.ts`, which drops that tag as
  well as the dashboard's own paths, so there is no way to add an edit that
  refreshes the dashboard and leaves the shop stale. The landing page and
  product pages are rendered once and re-used for up to a minute on top of that.
- **Product photos are served at the size they're shown.** The uploader stores
  at 1600px, which is right for a product page and about eight times what a card
  in a grid needs. `next/image` is pointed at the storage bucket's host — built
  from `NEXT_PUBLIC_SUPABASE_URL` in `next.config.ts` — so each surface gets the
  width it renders at, in AVIF or WebP. Anything from another host, or an SVG,
  falls back to a plain `<img>`, because the optimiser refuses hosts it wasn't
  told about and a broken picture is worse than an unoptimised one. The hover
  image on a card is `hidden lg:block` for the same reason: a phone has no
  hover, and would otherwise download a second photo nobody can see.
- **Cart tracking is opt-in and closed by default.** `/api/cart` is for a
  separate front end: it writes without an admin session, so it answers `501`
  until `STOREFRONT_API_KEY` is set and `401` to anyone who doesn't send it. Our
  own storefront doesn't use it — it is already on the server, and a shared
  secret shipped to a browser is not a secret. Carts idle for over an hour are
  counted as abandoned — nothing has to mark them.
- **Dialogs are portalled, menus don't unmount.** Every dialog goes through
  `components/ui/modal.tsx`, which renders into `document.body`, and `RowMenu`
  hides its panel rather than tearing it down. A dialog opened from a menu
  therefore outlives the menu — a hand-rolled dialog nested inside a closing
  popover is why the sale editor used to flash and vanish.
- **Spreadsheets are read and written without a parser dependency.** Both maintained npm
  xlsx readers ship with unfixed advisories, and a product importer isn't worth
  a known-vulnerable dependency. `src/lib/spreadsheet.ts` reads CSV/TSV directly
  and unpacks `.xlsx` with the platform's own `DecompressionStream` and
  `DOMParser` — a zip of XML, about a hundred lines, no supply chain. Imports
  are sent in batches of ten so the progress bar counts rows the server actually
  wrote rather than guessing at one long request. `src/lib/xlsx-writer.ts` goes
  the other way for the downloadable template, which is generated from the same
  column list the importer reads — so the two can't drift apart — with the four
  columns we ask for highlighted and placed first.
- **Colour names are resolved once per import.** The shop's saved palette answers
  first, so "Wine" is whatever the admin decided wine looks like; only names the
  palette doesn't know go to the assistant, in one request for the whole file. If
  that fails, or no key is set, the name is kept with a neutral swatch — a
  missing hex never loses the colour.
- **The sheet writes one cell at a time.** Each edit sends `{ id, field, value }`
  to a single server action, so a save can't clobber a column the admin didn't
  touch, and stock edits still write an `inventory_movements` row like every
  other stock change. The sheet re-reads on a timer rather than a socket: RLS
  has no policies, so the browser's anon key can't subscribe to anything.
- **Bulk deletes ask for the word.** Deleting a selection needs `DELETE` typed
  into a dialog, and the server re-checks it — a client that skips the prompt
  can't wipe the catalogue.
- **Unconfigured integrations degrade gracefully.** A fresh deployment with no
  Supabase credentials renders setup instructions on each page instead of an
  error.
