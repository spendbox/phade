-- =============================================================================
-- phadewoman — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: everything is create-if-not-exists / idempotent.
--
-- Money is stored in KOBO (integer). 1 naira = 100 kobo. Never use floats.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  -- Key into the icon set in src/lib/category-icons.tsx, chosen by the admin.
  icon        text not null default 'tag',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- For projects created before category icons existed.
alter table public.categories
  add column if not exists icon text not null default 'tag';

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  description           text,
  category_id           uuid references public.categories(id) on delete set null,
  price_kobo            bigint not null default 0,
  compare_at_price_kobo bigint,
  cost_price_kobo       bigint,
  sku                   text,
  stock                 integer not null default 0,
  low_stock_threshold   integer not null default 5,
  status                text not null default 'draft'
                          check (status in ('draft', 'active', 'archived')),
  images                jsonb not null default '[]'::jsonb,
  tags                  text[] not null default '{}',
  featured              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_status_idx      on public.products (status);
create index if not exists products_created_at_idx  on public.products (created_at desc);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  full_name  text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  customer_id      uuid references public.customers(id) on delete set null,
  status           text not null default 'pending'
                     check (status in ('pending', 'paid', 'processing', 'shipped',
                                       'delivered', 'cancelled', 'refunded')),
  fulfilment       text not null default 'shipping'
                     check (fulfilment in ('shipping', 'pickup')),
  subtotal_kobo    bigint not null default 0,
  shipping_kobo    bigint not null default 0,
  total_kobo       bigint not null default 0,
  shipping_address jsonb,
  note             text,
  placed_at        timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_status_idx      on public.orders (status);
create index if not exists orders_placed_at_idx   on public.orders (placed_at desc);

-- ---------------------------------------------------------------------------
-- Order items (product name/price snapshotted at purchase time)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  name            text not null,
  unit_price_kobo bigint not null default 0,
  quantity        integer not null default 1,
  image_url       text,
  created_at      timestamptz not null default now()
);

create index if not exists order_items_order_id_idx   on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- Payments (mirrors Paystack transactions)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders(id) on delete set null,
  reference      text not null unique,
  paystack_id    bigint,
  channel        text,
  amount_kobo    bigint not null default 0,
  fees_kobo      bigint not null default 0,
  currency       text not null default 'NGN',
  status         text not null default 'success'
                   check (status in ('success', 'failed', 'abandoned', 'refunded', 'pending')),
  customer_email text,
  paid_at        timestamptz,
  raw            jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_status_idx   on public.payments (status);
create index if not exists payments_paid_at_idx  on public.payments (paid_at desc);

-- ---------------------------------------------------------------------------
-- Inventory movements (audit trail for every stock change)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  delta      integer not null,
  reason     text not null default 'manual'
               check (reason in ('manual', 'restock', 'sale', 'return', 'correction', 'damage')),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx on public.inventory_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'products', 'customers', 'orders']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The admin dashboard talks to Supabase with the SERVICE ROLE key from the
-- server only, which bypasses RLS. We enable RLS with no policies so that the
-- anon/public key can never read or write these tables directly.
-- ---------------------------------------------------------------------------
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.inventory_movements enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for product images (public read, service-role write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read for product images" on storage.objects;
create policy "Public read for product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- Starter categories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, icon, sort_order) values
  ('Bags',                   'bags',                   'Handbags, totes and clutches',   'handbag',    1),
  ('Shoes',                  'shoes',                  'Heels, flats and sandals',       'shoes',      2),
  ('Abayas',                 'abayas',                 'Abayas and modest outerwear',    'dress',      3),
  ('Ready to wear outfits',  'ready-to-wear-outfits',  'Complete outfits, ready to go',  'shirt',      4)
on conflict (slug) do nothing;
