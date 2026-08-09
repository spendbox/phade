export type ProductStatus = "draft" | "active" | "archived";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type Fulfilment = "shipping" | "pickup";

export type PaymentStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "refunded"
  | "pending";

export type InventoryReason =
  | "manual"
  | "restock"
  | "sale"
  | "return"
  | "correction"
  | "damage";

export type ProductColor = {
  name: string;
  hex: string;
  /**
   * How many of this colourway are on the shelf.
   *
   * Optional, because plenty of shops keep one number for a piece and always
   * will. When every colour carries one, the product's `stock` is their sum —
   * a shop that has three emerald and none in black can say so, and the black
   * swatch stops being something a shopper can choose.
   */
  stock?: number;
};

/** The size run phadewoman stocks. Sizes are optional per product. */
export const PRODUCT_SIZES = [6, 8, 10, 12, 14, 16, 18] as const;

export type Subcategory = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SubcategoryWithCategory = Subcategory & {
  category: Pick<Category, "id" | "name"> | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  /** Key into CATEGORY_ICONS — see src/lib/category-icons.tsx. */
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price_kobo: number;
  compare_at_price_kobo: number | null;
  cost_price_kobo: number | null;
  sku: string | null;
  /** Optional free-text refinement inside a category ("Totes", "Heels"). */
  subcategory: string | null;
  stock: number;
  low_stock_threshold: number;
  status: ProductStatus;
  images: string[];
  tags: string[];
  /** Optional colourways offered for this product. */
  colors: ProductColor[];
  sizes: number[];
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithCategory = Product & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
};

export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  unit_price_kobo: number;
  quantity: number;
  image_url: string | null;
  created_at: string;
};

export type ShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  /** Which part of Lagos, where that is how delivery is priced. */
  area?: string;
  country?: string;
  /** Where a collected order is being picked up from. */
  pickup?: { name: string; address: string; note?: string };
  /** The number to ring first. */
  phone?: string;
  /** Every number given, including the first — a courier's second chance. */
  phones?: string[];
};

export type Order = {
  id: string;
  reference: string;
  customer_id: string | null;
  status: OrderStatus;
  fulfilment: Fulfilment;
  subtotal_kobo: number;
  shipping_kobo: number;
  /** What a coupon took off, and which one. Zero on most orders. */
  discount_kobo: number;
  discount_code: string | null;
  discount_id: string | null;
  total_kobo: number;
  shipping_address: ShippingAddress | null;
  note: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
};

export type OrderWithRelations = Order & {
  customer: Customer | null;
  items: OrderItem[];
};

export type Payment = {
  id: string;
  order_id: string | null;
  reference: string;
  paystack_id: number | null;
  channel: string | null;
  amount_kobo: number;
  fees_kobo: number;
  currency: string;
  status: PaymentStatus;
  customer_email: string | null;
  paid_at: string | null;
  raw: unknown;
  created_at: string;
};

export type InventoryMovement = {
  id: string;
  product_id: string;
  delta: number;
  reason: InventoryReason;
  note: string | null;
  created_at: string;
};

export type InventoryMovementWithProduct = InventoryMovement & {
  product: Pick<Product, "id" | "name" | "sku"> | null;
};

/** Every mutating server action resolves to this shape. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const PRODUCT_STATUSES: ProductStatus[] = [
  "draft",
  "active",
  "archived",
];

export const INVENTORY_REASONS: InventoryReason[] = [
  "restock",
  "sale",
  "return",
  "correction",
  "damage",
  "manual",
];

/**
 * The word an admin must type to confirm a bulk delete. Lives here rather than
 * with the action because a "use server" file may only export async functions.
 */
export const DELETE_CONFIRMATION = "DELETE";

// ---------------------------------------------------------------------------
// Sales and coupons
// ---------------------------------------------------------------------------

export type DiscountKind = "percentage" | "fixed";
export type DiscountScope = "all" | "categories" | "products";

export type Discount = {
  id: string;
  name: string;
  /** Null for an automatic sale; set when a coupon code is required. */
  code: string | null;
  description: string | null;
  kind: DiscountKind;
  /** Percent (1-100) for a percentage sale, kobo for a fixed one. */
  value: number;
  scope: DiscountScope;
  min_order_kobo: number;
  usage_limit: number | null;
  used_count: number;
  enabled: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscountWithTargets = Discount & {
  categoryIds: string[];
  productIds: string[];
  /** Names for display, resolved from the join tables. */
  targetNames: string[];
};

/** Derived from dates and the enabled flag rather than stored. */
export type DiscountState = "active" | "scheduled" | "ended" | "paused";

export function discountState(discount: Discount, now = new Date()): DiscountState {
  if (!discount.enabled) return "paused";
  if (new Date(discount.starts_at) > now) return "scheduled";
  if (discount.ends_at && new Date(discount.ends_at) < now) return "ended";
  return "active";
}

// ---------------------------------------------------------------------------
// Carts (uncompleted checkouts)
// ---------------------------------------------------------------------------

export type CartStatus = "active" | "converted" | "abandoned";

export type CartItem = {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price_kobo: number;
  image_url: string | null;
};

export type Cart = {
  id: string;
  token: string;
  customer_id: string | null;
  email: string | null;
  phone: string | null;
  status: CartStatus;
  items: CartItem[];
  subtotal_kobo: number;
  order_id: string | null;
  converted_at: string | null;
  created_at: string;
  last_active_at: string;
};
