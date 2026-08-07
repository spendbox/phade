import { getSupabase } from "@/lib/supabase";
import type {
  Cart,
  CartStatus,
  Category,
  Customer,
  Discount,
  DiscountWithTargets,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  ProductWithCategory,
} from "@/lib/types";

/**
 * Read-side queries for the admin dashboard.
 *
 * Every function returns `{ data, error }` rather than throwing, so one
 * unavailable table renders an inline notice instead of a 500 for the page.
 */

export type QueryResult<T> = { data: T; error: string | null };

function empty<T>(fallback: T, error: string | null = null): QueryResult<T> {
  return { data: fallback, error };
}

const NOT_CONFIGURED = "Supabase is not configured yet.";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DailyPoint = { date: string; revenueKobo: number; orders: number };

export type StatusSlice = { status: OrderStatus; count: number };

export type TopProduct = {
  productId: string | null;
  name: string;
  quantity: number;
  revenueKobo: number;
  imageUrl: string | null;
};

export type DashboardData = {
  revenueKobo: number;
  previousRevenueKobo: number;
  orderCount: number;
  previousOrderCount: number;
  averageOrderKobo: number;
  customerCount: number;
  newCustomerCount: number;
  paidRate: number;
  pendingOrders: number;
  lowStockCount: number;
  productCount: number;
  series: DailyPoint[];
  statusBreakdown: StatusSlice[];
  topProducts: TopProduct[];
  recentOrders: (Order & { customer: Pick<Customer, "full_name" | "email"> | null })[];
  lowStock: Pick<Product, "id" | "name" | "sku" | "stock" | "low_stock_threshold">[];
};

const EMPTY_DASHBOARD: DashboardData = {
  revenueKobo: 0,
  previousRevenueKobo: 0,
  orderCount: 0,
  previousOrderCount: 0,
  averageOrderKobo: 0,
  customerCount: 0,
  newCustomerCount: 0,
  paidRate: 0,
  pendingOrders: 0,
  lowStockCount: 0,
  productCount: 0,
  series: [],
  statusBreakdown: [],
  topProducts: [],
  recentOrders: [],
  lowStock: [],
};

function dayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export async function getDashboard(
  days = 30,
): Promise<QueryResult<DashboardData>> {
  const supabase = getSupabase();
  if (!supabase) return empty(EMPTY_DASHBOARD, NOT_CONFIGURED);

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 86_400_000);
  const previousStart = new Date(now.getTime() - days * 2 * 86_400_000);

  const [payments, orders, products, customers, items, recent] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount_kobo, status, paid_at, created_at")
        .gte("created_at", previousStart.toISOString()),
      supabase
        .from("orders")
        .select("id, status, total_kobo, placed_at")
        .gte("placed_at", previousStart.toISOString()),
      supabase
        .from("products")
        .select("id, name, sku, stock, low_stock_threshold, status"),
      supabase.from("customers").select("id, created_at"),
      supabase
        .from("order_items")
        .select(
          "product_id, name, quantity, unit_price_kobo, image_url, order:orders!inner(status, placed_at)",
        )
        .gte("order.placed_at", windowStart.toISOString()),
      supabase
        .from("orders")
        .select(
          "*, customer:customers(full_name, email)",
        )
        .order("placed_at", { ascending: false })
        .limit(8),
    ]);

  const firstError =
    payments.error ??
    orders.error ??
    products.error ??
    customers.error ??
    items.error ??
    recent.error;
  if (firstError) return empty(EMPTY_DASHBOARD, firstError.message);

  type PaymentRow = Pick<Payment, "amount_kobo" | "status" | "paid_at" | "created_at">;
  type OrderRow = Pick<Order, "id" | "status" | "total_kobo" | "placed_at">;

  const paymentRows = (payments.data ?? []) as PaymentRow[];
  const orderRows = (orders.data ?? []) as OrderRow[];
  const productRows = (products.data ?? []) as Pick<
    Product,
    "id" | "name" | "sku" | "stock" | "low_stock_threshold" | "status"
  >[];

  const inWindow = (value: string | null) =>
    value ? new Date(value) >= windowStart : false;

  const successful = paymentRows.filter((row) => row.status === "success");
  const revenueKobo = successful
    .filter((row) => inWindow(row.paid_at ?? row.created_at))
    .reduce((sum, row) => sum + row.amount_kobo, 0);
  const previousRevenueKobo = successful
    .filter((row) => !inWindow(row.paid_at ?? row.created_at))
    .reduce((sum, row) => sum + row.amount_kobo, 0);

  const currentOrders = orderRows.filter((row) => inWindow(row.placed_at));
  const previousOrders = orderRows.filter((row) => !inWindow(row.placed_at));

  // Daily series, zero-filled so the axis is continuous even on quiet days.
  const buckets = new Map<string, DailyPoint>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const key = dayKey(new Date(now.getTime() - index * 86_400_000));
    buckets.set(key, { date: key, revenueKobo: 0, orders: 0 });
  }
  for (const row of successful) {
    const key = dayKey(row.paid_at ?? row.created_at);
    const bucket = buckets.get(key);
    if (bucket) bucket.revenueKobo += row.amount_kobo;
  }
  for (const row of currentOrders) {
    const bucket = buckets.get(dayKey(row.placed_at));
    if (bucket) bucket.orders += 1;
  }

  const statusCounts = new Map<OrderStatus, number>();
  for (const row of currentOrders) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  type ItemRow = Pick<
    OrderItem,
    "product_id" | "name" | "quantity" | "unit_price_kobo" | "image_url"
  > & { order: { status: OrderStatus } | null };

  const soldStatuses: OrderStatus[] = [
    "paid",
    "processing",
    "shipped",
    "delivered",
  ];
  const topMap = new Map<string, TopProduct>();
  for (const row of (items.data ?? []) as unknown as ItemRow[]) {
    if (!row.order || !soldStatuses.includes(row.order.status)) continue;
    const key = row.product_id ?? row.name;
    const entry = topMap.get(key) ?? {
      productId: row.product_id,
      name: row.name,
      quantity: 0,
      revenueKobo: 0,
      imageUrl: row.image_url,
    };
    entry.quantity += row.quantity;
    entry.revenueKobo += row.quantity * row.unit_price_kobo;
    topMap.set(key, entry);
  }

  const lowStock = productRows
    .filter(
      (row) => row.status !== "archived" && row.stock <= row.low_stock_threshold,
    )
    .sort((a, b) => a.stock - b.stock);

  const customerRows = (customers.data ?? []) as Pick<
    Customer,
    "id" | "created_at"
  >[];

  const paidCount = currentOrders.filter((row) =>
    soldStatuses.includes(row.status),
  ).length;

  return empty({
    revenueKobo,
    previousRevenueKobo,
    orderCount: currentOrders.length,
    previousOrderCount: previousOrders.length,
    averageOrderKobo:
      currentOrders.length > 0
        ? Math.round(
            currentOrders.reduce((sum, row) => sum + row.total_kobo, 0) /
              currentOrders.length,
          )
        : 0,
    customerCount: customerRows.length,
    newCustomerCount: customerRows.filter((row) => inWindow(row.created_at))
      .length,
    paidRate:
      currentOrders.length > 0 ? (paidCount / currentOrders.length) * 100 : 0,
    pendingOrders: currentOrders.filter((row) => row.status === "pending")
      .length,
    lowStockCount: lowStock.length,
    productCount: productRows.filter((row) => row.status === "active").length,
    series: [...buckets.values()],
    statusBreakdown: [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    topProducts: [...topMap.values()]
      .sort((a, b) => b.revenueKobo - a.revenueKobo)
      .slice(0, 5),
    recentOrders: (recent.data ?? []) as DashboardData["recentOrders"],
    lowStock: lowStock.slice(0, 5),
  });
}

// ---------------------------------------------------------------------------
// Products & categories
// ---------------------------------------------------------------------------

export type ProductRow = ProductWithCategory & {
  /** Units sold across paid-and-beyond orders. */
  orderCount: number;
};

export async function getProducts(filters?: {
  search?: string;
  categoryId?: string;
  status?: string;
}): Promise<QueryResult<ProductRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let query = supabase
    .from("products")
    .select("*, category:categories(id, name, slug)")
    .order("created_at", { ascending: false });

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},sku.ilike.${term}`);
  }
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.status) query = query.eq("status", filters.status);

  const [products, items] = await Promise.all([
    query,
    supabase
      .from("order_items")
      .select("product_id, quantity, order:orders!inner(status)"),
  ]);

  if (products.error) return empty([], products.error.message);

  // Order counts are a nice-to-have column: if that join fails, still show the
  // catalogue rather than an error page.
  const sold = new Map<string, number>();
  if (!items.error) {
    const counted: OrderStatus[] = [
      "paid",
      "processing",
      "shipped",
      "delivered",
    ];
    for (const row of (items.data ?? []) as unknown as {
      product_id: string | null;
      quantity: number;
      order: { status: OrderStatus } | null;
    }[]) {
      if (!row.product_id || !row.order) continue;
      if (!counted.includes(row.order.status)) continue;
      sold.set(row.product_id, (sold.get(row.product_id) ?? 0) + row.quantity);
    }
  }

  return empty(
    ((products.data ?? []) as unknown as ProductWithCategory[]).map(
      (product) => ({ ...product, orderCount: sold.get(product.id) ?? 0 }),
    ),
  );
}

/** Existing subcategory values, to suggest while typing a new one. */
export async function getSubcategories(): Promise<QueryResult<string[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("products")
    .select("subcategory")
    .not("subcategory", "is", null);

  if (error) return empty([], error.message);

  const unique = new Set(
    ((data ?? []) as { subcategory: string | null }[])
      .map((row) => row.subcategory?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return empty([...unique].sort((a, b) => a.localeCompare(b)));
}

export async function getProduct(
  id: string,
): Promise<QueryResult<ProductWithCategory | null>> {
  const supabase = getSupabase();
  if (!supabase) return empty(null, NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, name, slug)")
    .eq("id", id)
    .maybeSingle();

  if (error) return empty(null, error.message);
  return empty((data as unknown as ProductWithCategory) ?? null);
}

export async function getCategories(): Promise<QueryResult<Category[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return empty([], error.message);
  return empty((data ?? []) as Category[]);
}

export type CategoryWithCount = Category & { productCount: number };

export async function getCategoriesWithCounts(): Promise<
  QueryResult<CategoryWithCount[]>
> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const [categories, products] = await Promise.all([
    getCategories(),
    supabase.from("products").select("category_id"),
  ]);

  if (categories.error) return empty([], categories.error);
  if (products.error) return empty([], products.error.message);

  const counts = new Map<string, number>();
  for (const row of (products.data ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return empty(
    categories.data.map((category) => ({
      ...category,
      productCount: counts.get(category.id) ?? 0,
    })),
  );
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type InventoryRow = Pick<
  Product,
  | "id"
  | "name"
  | "sku"
  | "stock"
  | "low_stock_threshold"
  | "status"
  | "price_kobo"
  | "cost_price_kobo"
  | "images"
> & { category: Pick<Category, "id" | "name"> | null };

export async function getInventory(filters?: {
  search?: string;
  view?: string;
}): Promise<QueryResult<InventoryRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let query = supabase
    .from("products")
    .select(
      "id, name, sku, stock, low_stock_threshold, status, price_kobo, cost_price_kobo, images, category:categories(id, name)",
    )
    .neq("status", "archived")
    .order("stock", { ascending: true });

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},sku.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) return empty([], error.message);

  let rows = (data ?? []) as unknown as InventoryRow[];
  if (filters?.view === "low") {
    rows = rows.filter(
      (row) => row.stock > 0 && row.stock <= row.low_stock_threshold,
    );
  } else if (filters?.view === "out") {
    rows = rows.filter((row) => row.stock <= 0);
  }
  return empty(rows);
}

export async function getRecentMovements(limit = 5) {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, product:products(id, name, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return empty([], error.message);
  return empty(data ?? []);
}

/** The full movement history, for the "View all" page. */
export async function getMovementHistory(limit = 300) {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, product:products(id, name, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return empty([], error.message);
  return empty(data ?? []);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderListRow = Order & {
  customer: Pick<Customer, "id" | "full_name" | "email"> | null;
  items: Pick<OrderItem, "id" | "name" | "quantity" | "image_url">[];
};

export async function getOrders(filters?: {
  search?: string;
  status?: string;
  fulfilment?: string;
}): Promise<QueryResult<OrderListRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let query = supabase
    .from("orders")
    .select(
      "*, customer:customers(id, full_name, email), items:order_items(id, name, quantity, image_url)",
    )
    .order("placed_at", { ascending: false })
    .limit(200);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.fulfilment) query = query.eq("fulfilment", filters.fulfilment);
  if (filters?.search) query = query.ilike("reference", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) return empty([], error.message);
  return empty((data ?? []) as unknown as OrderListRow[]);
}

export async function getOrder(id: string) {
  const supabase = getSupabase();
  if (!supabase) return empty(null, NOT_CONFIGURED);

  const [order, payments] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customer:customers(*), items:order_items(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (order.error) return empty(null, order.error.message);
  if (!order.data) return empty(null);

  return empty({
    ...(order.data as unknown as OrderListRow & { customer: Customer | null }),
    items: (order.data.items ?? []) as OrderItem[],
    payments: (payments.data ?? []) as Payment[],
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentRow = Payment & {
  order: Pick<Order, "id" | "reference"> | null;
};

export async function getPayments(filters?: {
  search?: string;
  status?: string;
}): Promise<QueryResult<PaymentRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let query = supabase
    .from("payments")
    .select("*, order:orders(id, reference)")
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`reference.ilike.${term},customer_email.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) return empty([], error.message);
  return empty((data ?? []) as unknown as PaymentRow[]);
}

export type PaymentTotals = {
  successKobo: number;
  feesKobo: number;
  netKobo: number;
  successCount: number;
  failedCount: number;
  refundedKobo: number;
  byChannel: { channel: string; amountKobo: number; count: number }[];
};

export function summarisePayments(rows: Payment[]): PaymentTotals {
  const successful = rows.filter((row) => row.status === "success");
  const successKobo = successful.reduce((sum, row) => sum + row.amount_kobo, 0);
  const feesKobo = successful.reduce((sum, row) => sum + (row.fees_kobo ?? 0), 0);

  const channels = new Map<string, { amountKobo: number; count: number }>();
  for (const row of successful) {
    const key = row.channel ?? "other";
    const entry = channels.get(key) ?? { amountKobo: 0, count: 0 };
    entry.amountKobo += row.amount_kobo;
    entry.count += 1;
    channels.set(key, entry);
  }

  return {
    successKobo,
    feesKobo,
    netKobo: successKobo - feesKobo,
    successCount: successful.length,
    failedCount: rows.filter(
      (row) => row.status === "failed" || row.status === "abandoned",
    ).length,
    refundedKobo: rows
      .filter((row) => row.status === "refunded")
      .reduce((sum, row) => sum + row.amount_kobo, 0),
    byChannel: [...channels.entries()]
      .map(([channel, value]) => ({ channel, ...value }))
      .sort((a, b) => b.amountKobo - a.amountKobo),
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export type CustomerRow = Customer & {
  orderCount: number;
  spendKobo: number;
  lastOrderAt: string | null;
};

export async function getCustomers(
  search?: string,
): Promise<QueryResult<CustomerRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let customerQuery = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (search) {
    const term = `%${search}%`;
    customerQuery = customerQuery.or(
      `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
    );
  }

  const [customers, orders] = await Promise.all([
    customerQuery,
    supabase.from("orders").select("customer_id, total_kobo, status, placed_at"),
  ]);

  if (customers.error) return empty([], customers.error.message);
  if (orders.error) return empty([], orders.error.message);

  const stats = new Map<
    string,
    { orderCount: number; spendKobo: number; lastOrderAt: string | null }
  >();

  const counted: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];
  for (const row of (orders.data ?? []) as Pick<
    Order,
    "customer_id" | "total_kobo" | "status" | "placed_at"
  >[]) {
    if (!row.customer_id) continue;
    const entry = stats.get(row.customer_id) ?? {
      orderCount: 0,
      spendKobo: 0,
      lastOrderAt: null,
    };
    entry.orderCount += 1;
    if (counted.includes(row.status)) entry.spendKobo += row.total_kobo;
    if (!entry.lastOrderAt || row.placed_at > entry.lastOrderAt) {
      entry.lastOrderAt = row.placed_at;
    }
    stats.set(row.customer_id, entry);
  }

  return empty(
    ((customers.data ?? []) as Customer[]).map((customer) => ({
      ...customer,
      ...(stats.get(customer.id) ?? {
        orderCount: 0,
        spendKobo: 0,
        lastOrderAt: null,
      }),
    })),
  );
}

export async function getCustomer(id: string) {
  const supabase = getSupabase();
  if (!supabase) return empty(null, NOT_CONFIGURED);

  const [customer, orders] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("*, items:order_items(id, name, quantity)")
      .eq("customer_id", id)
      .order("placed_at", { ascending: false }),
  ]);

  if (customer.error) return empty(null, customer.error.message);
  if (!customer.data) return empty(null);

  return empty({
    customer: customer.data as Customer,
    orders: (orders.data ?? []) as unknown as OrderListRow[],
  });
}

// ---------------------------------------------------------------------------
// Sales and coupons
// ---------------------------------------------------------------------------

export async function getDiscounts(): Promise<
  QueryResult<DiscountWithTargets[]>
> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const [discounts, categoryLinks, productLinks] = await Promise.all([
    supabase.from("discounts").select("*").order("created_at", { ascending: false }),
    supabase
      .from("discount_categories")
      .select("discount_id, category:categories(id, name)"),
    supabase
      .from("discount_products")
      .select("discount_id, product:products(id, name)"),
  ]);

  if (discounts.error) return empty([], discounts.error.message);

  const categories = new Map<string, { id: string; name: string }[]>();
  for (const row of (categoryLinks.data ?? []) as unknown as {
    discount_id: string;
    category: { id: string; name: string } | null;
  }[]) {
    if (!row.category) continue;
    const list = categories.get(row.discount_id) ?? [];
    list.push(row.category);
    categories.set(row.discount_id, list);
  }

  const products = new Map<string, { id: string; name: string }[]>();
  for (const row of (productLinks.data ?? []) as unknown as {
    discount_id: string;
    product: { id: string; name: string } | null;
  }[]) {
    if (!row.product) continue;
    const list = products.get(row.discount_id) ?? [];
    list.push(row.product);
    products.set(row.discount_id, list);
  }

  return empty(
    ((discounts.data ?? []) as Discount[]).map((discount) => {
      const linkedCategories = categories.get(discount.id) ?? [];
      const linkedProducts = products.get(discount.id) ?? [];
      return {
        ...discount,
        categoryIds: linkedCategories.map((item) => item.id),
        productIds: linkedProducts.map((item) => item.id),
        targetNames:
          discount.scope === "categories"
            ? linkedCategories.map((item) => item.name)
            : discount.scope === "products"
              ? linkedProducts.map((item) => item.name)
              : [],
      };
    }),
  );
}

/** Minimal product list for the sale picker. */
export async function getProductOptions(): Promise<
  QueryResult<{ id: string; name: string }[]>
> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .neq("status", "archived")
    .order("name", { ascending: true })
    .limit(500);

  if (error) return empty([], error.message);
  return empty((data ?? []) as { id: string; name: string }[]);
}

// ---------------------------------------------------------------------------
// Carts (uncompleted checkouts)
// ---------------------------------------------------------------------------

/**
 * A cart counts as abandoned once it has sat untouched past this window without
 * becoming an order. The storefront can also mark one abandoned explicitly.
 */
export const ABANDONED_AFTER_MINUTES = 60;

export type CartRow = Cart & { isAbandoned: boolean };

export async function getCarts(filters?: {
  status?: string;
  search?: string;
}): Promise<QueryResult<CartRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return empty([], NOT_CONFIGURED);

  let query = supabase
    .from("carts")
    .select("*")
    .order("last_active_at", { ascending: false })
    .limit(200);

  if (filters?.status) query = query.eq("status", filters.status as CartStatus);
  if (filters?.search) query = query.ilike("email", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) return empty([], error.message);

  const cutoff = Date.now() - ABANDONED_AFTER_MINUTES * 60_000;

  return empty(
    ((data ?? []) as unknown as Cart[]).map((cart) => ({
      ...cart,
      items: Array.isArray(cart.items) ? cart.items : [],
      isAbandoned:
        cart.status === "abandoned" ||
        (cart.status === "active" &&
          new Date(cart.last_active_at).getTime() < cutoff),
    })),
  );
}
