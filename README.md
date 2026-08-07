# phadewoman

Ecommerce site for phadewoman — a customer-facing storefront at `/` and an admin
dashboard at `/admin`. Built with Next.js (App Router) on Vercel, with Supabase
for the database and image storage, and Paystack for payments. All money is in
naira.

The storefront currently shows a holding page while the shop is being built. The
admin dashboard is complete and usable.

---

## What's in the dashboard

| Page | What it does |
| --- | --- |
| **Dashboard** | Revenue over time, order status mix, top sellers, recent orders, low-stock alerts. Switchable 7 / 30 / 90 day window. |
| **Orders** | Filter by status and type, open an order to see items, totals, payments, delivery address, and change its status. |
| **Checkouts** | Carts that were started but never paid for, what was left in them, and how many made it through. Needs `STOREFRONT_API_KEY`. |
| **Products** | Bulk uploader: pick a category, drop in photos and videos, and every file becomes its own product to name, price and stock side by side — autosaved as you work. Optional colourways and sizes, bulk-select rows to change status or delete. AI writes descriptions, suggests tags, and matches typed colour names to real shades. SKUs generate themselves. |
| **Database** | The whole catalogue as one editable spreadsheet. Cells save as you leave them, new rows arrive as drafts, media / colours / sizes open in a dialog, and units sold and revenue come along for the ride. Opens full screen. |
| **Categories** | Create and edit categories with a chosen icon, and let AI grow a short description into a fuller one. |
| **Inventory** | Featured image, stock on hand and stock value, red/amber/green level indicators, one-click ±1, and a full adjustment dialog that records the reason. The five most recent movements sit on the page, with the full history one click away. |
| **Sales** | Start a sale across everything, chosen categories, or individual products — percentage or naira off, with an optional coupon code, schedule, minimum order and usage cap. |
| **Payments** | Gross, fees, net and success rate from Paystack, a breakdown by channel, and the full transaction list. "Sync from Paystack" backfills on demand. |
| **Customers** | Order counts, lifetime spend, last order, plus editable contact details and private notes. |
| **Settings** | **General** holds the default low-stock alert level; **Storefront** edits the announcement bar, hero copy, hero images, call-to-action and featured products; **Developers** lists which integrations are connected, the environment variables behind them, and the Paystack webhook endpoint. |

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
    page.tsx                     Storefront holding page
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
    ui/                          Buttons, fields, badges, panels
  lib/
    auth.ts  session.ts          Admin credentials and session cookie
    queries.ts                   All dashboard reads
    supabase.ts  paystack.ts     Service clients
    format.ts                    Naira, dates, slugs
    storefront.ts                Shop-front copy, stored as one settings row
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
- **Cart tracking is opt-in and closed by default.** `/api/cart` is the one route
  that writes without an admin session, so it answers `501` until
  `STOREFRONT_API_KEY` is set and `401` to anyone who doesn't send it. Carts idle
  for over an hour are counted as abandoned — nothing has to mark them.
- **Dialogs are portalled, menus don't unmount.** Every dialog goes through
  `components/ui/modal.tsx`, which renders into `document.body`, and `RowMenu`
  hides its panel rather than tearing it down. A dialog opened from a menu
  therefore outlives the menu — a hand-rolled dialog nested inside a closing
  popover is why the sale editor used to flash and vanish.
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
