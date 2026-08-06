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

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
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
  stock: number;
  low_stock_threshold: number;
  status: ProductStatus;
  images: string[];
  tags: string[];
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
  country?: string;
  phone?: string;
};

export type Order = {
  id: string;
  reference: string;
  customer_id: string | null;
  status: OrderStatus;
  fulfilment: Fulfilment;
  subtotal_kobo: number;
  shipping_kobo: number;
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
