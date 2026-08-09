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
| **Landing** (`/`) | Built as a magazine rather than a catalogue. A hero told as a story: every image from Settings → Storefront becomes a frame with its own progress segment, advancing itself, tappable left and right. Categories sit under it as large soft-cornered squares you flick sideways through, each showing its own photograph from Settings → Categories and its icon until one is uploaded; the rail fades towards whichever side still has something behind it, and gives a cursor buttons to press. Featured pieces are a deck of cards you throw sideways, one at a time, on the one dark panel in an ivory page. Then the shop's own words, beside a picture or a clip it chose — by that point a reader has decided they like the look of the place, which is when they will read a paragraph about who chose it. Then what just landed, as tall tiles, because clothes are photographed head to hem and a wide box of a dress is a crop of the hem and the ceiling. Then best sellers and the way into the shop, whose big line counts everything actually in stock — units, not catalogue rows — until someone writes their own, over two slow clouds of brand colour that are the only moving thing on the page after the hero. Every heading, every line under one, and every button on the page is written in the dashboard. |
| **Shop** (`/shop`) | The catalogue, with a rail of category pictures pinned under the header, and the category's icon at the head of its own page. The unfiltered view carries its own line under the count, written in the dashboard, since a category introduces itself with its description and a search with the words that were typed. Subcategory chips, an on-sale filter, search, and five ways to sort. Any row of filters wider than the screen fades at the edge it can still be scrolled towards, and stops fading once you reach the end. Every choice lives in the URL, so a narrowed shop is a link you can send someone and the back button undoes a filter. |
| **A product** | Opens as a pop-up over whatever you were reading, never a page — the grid stays scrolled where it was, filters still on. Swiping sideways walks the row it was tapped out of, so a shopper can go through a rail or a wall of new arrivals without closing anything, and the row goes round — the last piece swipes back to the first, because a flick that does nothing reads as a broken pop-up rather than as an end. Each card arrives from the side it was pulled from rather than simply replacing the last one. A swipe that starts on the pictures still belongs to the pictures. Pictures swipe and snap one frame at a time, with the count on a dark pill so it survives a white studio backdrop; a cursor drags them across instead, or presses the dots, which are the position and the control at once; a double-tap saves; add to bag / save / share sit in a bar that never scrolls away. Once something is added the pop-up folds down to a small receipt — what went in, what the bag now holds, and the way back to shopping. `/product/[slug]` renders the same thing as a real page, for shared links and search engines. |
| **Saved** (`/saved`) | Everything hearted on this device. No account needed. |
| **Any sheet** | The bag and the product pop-up both rise from the bottom of a phone, and both are put away the same way: drag down and it follows your thumb, let go past the halfway point — or flick it — and it goes. Sideways is a different sentence, which a caller can claim. A sheet whose contents are scrolled is being read, so the pull scrolls it back to the top first and only then becomes a dismissal. |
| **Bag** | A drawer, not a page, so adding something never costs anyone their place. It shows the delivery charge from the same rules checkout uses, and how much more buys free delivery. |
| **Checkout** (`/checkout`) | Asked one step at a time — how it reaches them, who they are, where it goes, anything else — each step opening as the one before it is answered and folding into a card of what was said, which reopens with a press, so the form is a short conversation rather than three screens of boxes. A bar across the top says how far through it is and names what is being asked, because a form that reveals itself one question at a time is kinder to answer and harder to estimate. The order and the Pay button arrive together at the end, once there is an address to price them against. Filled in from last time, because a returning customer should not retype their address to buy a second dress. Phone numbers carry a dialling code, Nigeria already chosen, and there is room for a second one so a courier who can't get through has somewhere else to ring. The state is a list you type your way into rather than a wheel to spin, and choosing Lagos asks which part of Lagos, because Ikoyi and Ikorodu are not the same journey. Choosing collection asks which counter, from the addresses the shop keeps in Settings → Shipping. Picking a destination prices the delivery from the shop's own zones, live. A coupon code from a sale goes in beside the order summary and says what it takes off before anyone commits to it. Every figure is re-derived on the server, so what the browser sends is only ever ids, quantities and a code. Pays through Paystack; the order exists before payment starts. |
| **Order** (`/order/[reference]`) | Where Paystack sends a shopper back to. It verifies the payment directly rather than waiting on the webhook, so the page is right immediately, and empties the bag only once the money has actually arrived. It also shows how far the shop has moved the order — paid, being packed, on its way, delivered — so the status the dashboard sets is the status the customer sees. |
| **Track** (`/track`) | The same page, found again with the reference from the confirmation. No account, no login: the reference is unguessable and it is the only thing anyone needs to see where their parcel is. |

Navigation on a phone is a tab bar along the bottom — home, shop, saved, bag —
because that is where a thumb is. On a wider screen the header takes over. A
menu is written in the dashboard — Home, Shop, Saved, Track order and Contact
us to begin with, whatever the shop wants after that, and one button to put the
defaults back. It sits behind a ☰ on a phone, where there is no room for a row
of words beside a wordmark and three icons, and centred across the header on a
desktop, where there is.

Every page ends with three promises, and each is a button rather than a
paragraph, because each is really a question. **Delivered nationwide** opens
the price of every zone with how long it takes, the free-delivery threshold and
whether collection is offered — all from Settings → Shipping, so it cannot
promise something checkout won't honour. Lagos is priced and timed
separately: ₦3,500 within 24 hours by default, against ₦5,000 and three to four
days for the rest of Nigeria, because a rider crosses the city in an afternoon
and a parcel to Sokoto goes on a bus — and one figure for both is either a loss
on every Sokoto order or a Lagos price nobody in Lagos will pay. **Paid securely** shows the channels
Paystack handles and says plainly that the card number never reaches this shop.
**Here to help** is a message form that goes to the address in the dashboard,
with a WhatsApp button beside it where the shop offers one.

---

## What's in the dashboard

| Page | What it does |
| --- | --- |
| **Dashboard** | Revenue over time, order status mix, top sellers, recent orders, low-stock alerts. Switchable 7 / 30 / 90 day window. |
| **Orders** | Filter by status and type, open an order to see items, totals, payments, delivery address, and change its status. |
| **Checkouts** | Carts that were started but never paid for, what was left in them, and how many made it through. Needs `STOREFRONT_API_KEY`. |
| **Products** | Category, price, stock and status edit in place — changing a price shouldn't mean opening a product. Bulk uploader: pick a category, drop in photos and videos, and every file becomes its own product to name, price and stock side by side — autosaved as you work. Optional colourways — each with its own count, which adds up to the stock on hand and takes a sold-out colour off the swatch row — and sizes, bulk-select rows to change status or delete. AI writes descriptions and suggests tags. SKUs generate themselves. |
| **Database** | The whole catalogue as one editable spreadsheet — name, colour, size, quantity, sold, media, category, price, cost, status, SKU, subcategory, revenue and when it was added. Cells save as you leave them, new rows arrive as drafts, media / colours / sizes open in a dialog. Download the column template, import a CSV or Excel file with a progress bar, or open the sheet full screen. Falls back to cards on a phone. |
| **Inventory** | Featured image, stock on hand and stock value, red/amber/green level indicators, and one adjustment dialog with three ways in: add or remove, set an exact figure, or count by colourway. That last one edits each colour's number and makes their total the product's stock, which is the only way the two stay in step. Every change records its reason. The five most recent movements sit on the page, with the full history one click away. |
| **Sales** | Start a sale across everything, chosen categories, or individual products — percentage or naira off, with an optional coupon code, schedule, minimum order and usage cap. |
| **Payments** | Gross, fees, net and success rate from Paystack, a breakdown by channel, and the full transaction list. "Sync from Paystack" backfills on demand. |
| **Customers** | Order counts, lifetime spend, last order, plus editable contact details and private notes. |
| **Settings** | **General** — the default low-stock alert level. **Team** — who else can sign in, what they can do, and what the limited role is called. **Categories** — categories with a chosen icon and a photograph of their own (both rails show the photograph; the icon heads the category's own page), AI to grow a short description into a fuller one, and the subcategory list. **Catalogue** — the shop's colour palette and its size runs: name a run per type of product, put any whole number from 1 to 100 in it, and a product picks which run it belongs to rather than being offered a 12 and a 38 on the same row. Clothing and shoe runs ship as standard, and one button puts them back. **Storefront** — laid out in the order the front page reads, one panel per section: the announcement bar, the hero — whose every image and clip is framed for a desktop and for a phone separately, or marked for only one of them, in an editor that opens as the file lands — the strip under it, then Collections, Featured, New in, About, Best sellers and the last block, each with its heading, its subtext and its button, and the about section carrying its own words plus a picture or a video with the placeholder frame of your choosing. Then the menu, the line under &ldquo;Everything&rdquo; at the head of the shop, the footer blurb, social links, and where a message from "Here to help" goes — an address, and a WhatsApp number if the shop wants one offered. A heading cleared to nothing takes its default back; a subtext or a button cleared to nothing stays gone. **Shipping** — two base prices with a delivery window each, one for Lagos and one for everywhere else (in hours, so "within 24 hours" is sayable), a free-delivery threshold, delivery zones by state — or as many separate Lagos zones as a shop wants, naming the parts each one covers so it prices only those and leaves the rest of Lagos for the next zone — each zone able to promise its own delivery window, whether collection is offered, and the addresses customers collect from. **Developers** — which integrations are connected, the environment variables behind them, and the Paystack webhook endpoint. |

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
    shop/                        Hero, collections, deck, wall, pop-up, bag, checkout
    ui/                          Buttons, fields, badges, panels
  lib/
    auth.ts  session.ts          Admin credentials, roles and session cookie
    passwords.ts                 scrypt hashing for team logins
    team.ts                      Who can sign in, and what they're called
    queries.ts                   All dashboard reads
    shop-queries.ts  shop.ts     All storefront reads, and what a shopper pays
    coupons.ts                   What a code is worth against a given bag
    cart-store.ts                Writing a shopping session, from either caller
    browser-store.ts             localStorage and media queries, as React reads them
    supabase.ts  paystack.ts     Service clients
    format.ts                    Naira, dates, slugs
    storefront.ts                Shop-front copy — one settings row, no migration
    catalogue.ts                 The shop's colour palette and size runs
    catalogue-settings.ts        …as this shop has saved them
    spreadsheet.ts               CSV and .xlsx reader, no dependencies
    xlsx-writer.ts               .xlsx writer for the import template
  proxy.ts                       Gates /admin behind a valid session
supabase/schema.sql              Database schema — run once
```

A few decisions worth knowing:

- **Money is stored in kobo** (integers). Paystack works in kobo too, so amounts
  pass through untouched, and there is no floating-point drift. `src/lib/format.ts`
  is the only place that converts for display or parses admin input.
- **The owner is an environment variable; everyone else is a row.** That login
  works with no database at all and cannot be deleted from inside the
  dashboard, which is what stops a shop locking itself out of its own shop.
  Anyone else the owner adds signs in with a username and a password stored as
  a salted scrypt hash — never recoverable, only replaceable.
- **Two roles, one rule.** An owner sees everything; the limited role (called
  "Sales manager" until the shop renames it) sees the order book and nothing
  else. `canReach` in `src/lib/session.ts` is the single answer to "can they
  see this", used by the middleware, the sidebar and the pages, so a menu can
  never offer a door the server will refuse. The refusal that matters is
  `requireOwner` next to each mutation: a server action is a URL, and a URL can
  be called by anything.
- **Stock changes are always logged.** Editing stock on the product page, using
  ±1, or using the adjustment dialog all write an `inventory_movements` row, so
  the history is a complete account rather than just a current number.
- **Media uploads go straight to Supabase.** The browser asks the server for a
  signed URL and PUTs the file itself, so videos aren't limited by the
  serverless request body size. Images are downscaled before they leave the
  browser; videos are stored as-is.
- **A web address is not a text box.** A slug is made from the name and never
  shown while something is being created — there is nothing to decide yet. Once
  it exists the address is out in the world, so it is displayed locked, and
  changing it takes a deliberate press and a dialog that says what breaks:
  every link already shared, and the search results that had found the page.
- **Buttons point at pages, not at paths.** Every link a shop owner sets on
  the front page is chosen from a searchable list of the shop's own pages —
  collections, products, the shop, saved, tracking — rather than typed. A
  mistyped path is a button that goes nowhere, found by a customer rather than
  by the person who wrote it. Pasting a full address still works.
- **Clips are trimmed without being re-encoded.** The in and out points ride
  in the URL as a media fragment (`#t=1.4,8.2`) — the standard way to name a
  range of a video, which browsers play by themselves — so cutting the wobbly
  first second off a clip is instant, works from a phone on mobile data, and
  can be undone later with nothing lost. The file in storage is never touched.
  The placeholder is a real still: scrub to the frame worth showing, and it is
  drawn to a canvas, encoded as WebP and uploaded like any other picture.
- **A clip is never a black box.** A product whose cover is a video borrows the
  next photograph in the same product as its poster, and where there isn't one
  the browser is asked for the frame a tenth of a second in — a few kilobytes,
  and a picture instead of a black rectangle. The dashboard's thumbnails do the
  same.
- **Playback is driven, not requested.** `autoplay` is answered once, when the
  element is created, and browsers routinely decline it for a video that
  appears inside a pop-up or becomes the frame in view after a swipe — which
  left clips sitting on their posters. So whichever frame is being looked at is
  told to play and every other one is told to stop, and the ask is repeated
  each time that changes. Always muted, which is both good manners and the one
  case every browser allows without a tap. The file streams at whatever it was
  uploaded at; nothing is re-encoded or downscaled.
- **The hero is cropped twice.** A photograph shot for a shop is usually
  portrait, so a 16:9 slice of it keeps the waist and loses the face, while the
  same file in a phone's frame keeps the whole model. Showing the whole picture
  over a blurred copy of itself was a workaround for a decision nobody had been
  given a way to make; now the shop makes it, once per shape, in an editor that
  opens as the file lands. A shot that only works in one shape can say so and
  simply won't appear on the other. Both answers ride in the URL fragment, and
  a media query picks between them — so the crop is right on the first paint
  rather than after the browser has told us how wide it is.
- **The shop chooses where a picture is framed.** Every surface crops — a
  square tile, a 3:4 card, a hero — and a centred crop takes the head off a
  studio shot as happily as the hem. So each uploaded picture carries a
  framing chosen on a three-by-three grid over the thumbnail itself, and it
  rides in the URL's fragment (`…/dress.webp#pos=top`). A fragment is never
  sent to a server, so the file resolves exactly as it did before, every URL
  already stored keeps working, and no column had to change shape to hold nine
  words.
- **HEIC is converted, not refused.** It is what an iPhone takes photographs
  in, so rejecting it asks a shop owner to do the computer's job. What lands in
  storage is always a WebP, because half the browsers in the world can't
  display a HEIC and a shopper would get a broken picture rather than a
  photograph. Safari decodes it natively; everywhere else lazy-loads a decoder,
  downloaded only by the shop that actually uploads one. A `.heic` whose type
  the browser reports as the empty string — Chrome on Windows does this — is
  recognised by its extension.
- **The bulk uploader autosaves to the browser.** Drafts live in `localStorage`
  until you publish, so a closed tab or a refresh doesn't lose a batch. Nothing
  is written to the database until you hit Publish.
- **The browser never names a price.** Checkout receives product ids and
  quantities and nothing else; every price, every running sale and the delivery
  charge are resolved on the server against the catalogue as it stands. A bag is
  a request, not a quote.
- **A coupon is worth what the shop says it is worth.** The checkout asks the
  server what a code does to this exact bag, and asks again whenever the bag
  changes — but the answer it shows is only a quote. `placeOrder` runs the same
  check on the lines it is about to charge for, and a code that expired or ran
  out in between stops the order rather than quietly billing full price. Usage
  is counted on the pending → paid transition, beside the stock, so a limited
  code isn't spent by a payment nobody completed.
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
- **Delivery is a set of rules, not a number.** Getting a parcel to the next
  street is not what it costs to get it to Maiduguri, so shipping is zones:
  each names some states and carries its own price and free-delivery
  threshold, with a default for anywhere unnamed. The checkout's state field is
  a list rather than a text box for exactly this reason — "Lagos", "lagos
  state" and "LAG" are three strings and one place, and a zone can only match
  the one it was given. `quoteDelivery` is the only thing that prices delivery,
  so the bag, the checkout and the order it becomes cannot disagree.
- **An order marked paid by hand counts like any other.** Revenue is the sum of
  successful payments rather than of orders — an order is a promise, a payment
  is a fact — so marking one paid in the dashboard writes a payment against it,
  channel `manual`, on a reference derived from the order's own so doing it
  twice updates one row instead of inventing a second sale. Stock comes off
  through the same helper the webhook uses.
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
  told about and a broken picture is worse than an unoptimised one. A card
  shows the one photograph the shop chose to lead with and keeps showing it:
  a tile that swaps its picture under a passing cursor makes a grid twitch on
  the way to somewhere else, and downloads a second photo to do it.
- **Nothing waits on a blank screen.** Every route ships a skeleton of itself,
  streamed the moment someone asks for it, so a slow connection shows the shape
  of the page rather than white — which is indistinguishable from a page that
  failed. Photographs load lazily and shimmer while they do, and the shimmer
  sits *under* the picture rather than in place of it, so nothing swaps and
  nothing jumps. An image already in cache is caught by a `complete` check in
  the ref, since its load event fired before React was attached.
- **Uploads report the real figure.** `fetch` cannot say how far a PUT has got —
  it resolves at the end and says nothing before — so a shop owner pushing a
  40MB clip on a phone tether watched a spinner that never distinguished slow
  from stuck. That one call is on XMLHttpRequest, which reports upload
  progress, and the bar is the browser's own number rather than a guess on a
  timer.
- **A button that did something says so.** Add to bag *becomes* a tick for a
  second and then comes back — both glyphs drawn, stacked, cross-faded through
  a quarter-turn, so it is a movement rather than a swap someone has to notice.
  Share and the quick-add on a card do the same. On a phone whatever changed is
  usually off screen, and silence at the moment of pressing is what makes
  someone press again.
- **Messages need a mail provider, and work without one.** "Here to help" sends
  through Resend when `RESEND_API_KEY` is set. When it isn't — which is the
  state a shop is in the day it opens — the answer says so and hands the whole
  message to the shopper's own mail app, already written and addressed. A form
  that silently drops what somebody took the trouble to type is worse than one
  that takes an extra tap.
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
