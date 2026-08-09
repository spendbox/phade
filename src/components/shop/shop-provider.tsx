"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { syncCart } from "@/app/(shop)/actions";
import {
  persistentStore,
  useIsHydrated,
  usePersistent,
} from "@/lib/browser-store";
import {
  bagCount,
  bagSubtotal,
  lineKey,
  MAX_LINE_QUANTITY,
  type BagLine,
  type ShopProduct,
} from "@/lib/shop";

/**
 * The shopper's session: what's in the bag, what's saved, and which product is
 * open in front of them.
 *
 * It lives in the browser. There are no shopper accounts, so a bag that
 * survives a refresh has to survive in localStorage — and a copy is posted to
 * the server so the Checkouts page can see carts that never became orders.
 *
 * The open product is held here rather than in a route because tapping a
 * product opens a pop-up over whatever you were looking at, and coming back
 * from it must not lose your place in a grid you scrolled halfway down. The
 * address bar still follows along through the `#p=` hash, so a product can be
 * shared and the back button closes the pop-up rather than leaving the shop.
 */

const TOKEN_KEY = "phade.cart.v1";
const HASH_PREFIX = "#p=";

function isBag(raw: unknown): raw is BagLine[] {
  return (
    Array.isArray(raw) &&
    raw.every(
      (line) =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as BagLine).productId === "string" &&
        typeof (line as BagLine).quantity === "number",
    )
  );
}

function isIdList(raw: unknown): raw is string[] {
  return Array.isArray(raw) && raw.every((id) => typeof id === "string");
}

const bagStore = persistentStore<BagLine[]>("phade.bag.v1", [], isBag);
const savedStore = persistentStore<string[]>("phade.saved.v1", [], isIdList);

/**
 * This browser's cart token, made once and kept.
 *
 * It is not a store like the other two because nothing ever changes it — it is
 * minted on first read and then just exists, which is why the subscription is
 * a no-op.
 */
let token: string | null = null;

function cartTokenSnapshot(): string {
  if (token) return token;

  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (existing) {
      token = existing;
      return token;
    }
  } catch {
    // Blocked storage: a token that lasts this session is still better than
    // none, because the shop's cart record stays one row while they browse.
  }

  token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // As above.
  }

  return token;
}

const noSubscription = () => () => {};

export type AddToBagInput = {
  product: ShopProduct;
  color?: string | null;
  size?: number | null;
  quantity?: number;
  /**
   * Skips the toast. For callers that confirm the addition themselves — the
   * pop-up folds down into a receipt — where a toast on top of it would be the
   * same news twice.
   */
  quiet?: boolean;
};

type ShopContextValue = {
  /** False until localStorage has been read — counts render as 0 before it. */
  ready: boolean;
  bag: BagLine[];
  count: number;
  subtotalKobo: number;
  addToBag: (input: AddToBagInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearBag: () => void;

  saved: string[];
  isSaved: (productId: string) => boolean;
  toggleSaved: (productId: string) => void;

  bagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;

  viewing: ShopProduct | null;
  /**
   * Opens a product. `siblings` is the list it was tapped out of — the rail,
   * the grid, the deck — so the pop-up can be swiped along it.
   */
  openProduct: (product: ShopProduct, siblings?: ShopProduct[]) => void;
  closeProduct: () => void;
  /** Moves to the next or previous product in the list it came from. */
  stepProduct: (by: 1 | -1) => void;
  /** Where the open product sits in that list, and how long the list is. */
  viewingAt: number;
  viewingOf: number;
  /** Lets a pop-up be re-opened from a shared `#p=slug` link. */
  registerProducts: (products: ShopProduct[]) => void;

  toast: { id: number; message: string } | null;
  say: (message: string) => void;

  /** This browser's cart token, so checkout can close the same cart record. */
  cartToken: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop must be used inside <ShopProvider>.");
  return value;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  // The bag and the saved list are the browser's, not React's — they are read
  // through a subscription rather than copied into state on mount, so the
  // first paint after hydration already has them.
  const ready = useIsHydrated();
  const bag = usePersistent(bagStore);
  const saved = usePersistent(savedStore);
  const cartToken = useSyncExternalStore(
    noSubscription,
    cartTokenSnapshot,
    () => "",
  );

  const [bagOpen, setBagOpen] = useState(false);
  const [viewing, setViewing] = useState<ShopProduct | null>(null);
  /** The list the open product came from, for swiping along. */
  const [queue, setQueue] = useState<ShopProduct[]>([]);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );

  const known = useRef(new Map<string, ShopProduct>());
  /** A slug from the address that no page has been able to resolve yet. */
  const wanted = useRef<string | null>(null);
  const hashRead = useRef(false);
  const pushedHash = useRef(false);
  const posted = useRef(false);

  // ---- keep the server's copy of the cart roughly in step ------------------
  useEffect(() => {
    if (!ready || !cartToken) return;
    // Don't open a cart record for someone who has only ever browsed.
    if (bag.length === 0 && !posted.current) return;

    const timer = setTimeout(() => {
      posted.current = true;
      void syncCart(cartToken, bag).catch(() => {
        // Tracking is a shop-owner convenience, never the shopper's problem.
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [bag, ready, cartToken]);

  // ---- the pop-up follows the address bar ----------------------------------
  const openProduct = useCallback(
    (product: ShopProduct, siblings?: ShopProduct[]) => {
      // The list the product was tapped out of, so the pop-up can be swiped
      // along it the way the grid underneath would have been scrolled.
      const list =
        siblings && siblings.some((item) => item.id === product.id)
          ? siblings
          : [product];
      for (const item of list) known.current.set(item.slug, item);

      setQueue(list);
      setViewing(product);
      setBagOpen(false);

      const target = `${HASH_PREFIX}${encodeURIComponent(product.slug)}`;
      if (window.location.hash !== target) {
        window.history.pushState(null, "", target);
        pushedHash.current = true;
      }
    },
    [],
  );

  /**
   * The next piece along, without leaving the pop-up.
   *
   * It wraps. A rail is a loop, not a corridor with walls at both ends: a
   * shopper flicking through a row of eight and hitting a swipe that does
   * nothing reads it as the pop-up having broken, not as having reached the
   * end — and going round is what every feed they use all day already does.
   *
   * The address bar is corrected rather than added to: a shopper who swiped
   * through nine dresses should get back to the grid with one press of Back,
   * not nine.
   */
  const stepProduct = useCallback(
    (by: 1 | -1) => {
      setViewing((current) => {
        if (!current || queue.length < 2) return current;
        const at = queue.findIndex((item) => item.id === current.id);
        if (at === -1) return current;
        const next = queue[(at + by + queue.length) % queue.length];
        if (!next || next.id === current.id) return current;

        window.history.replaceState(
          null,
          "",
          `${HASH_PREFIX}${encodeURIComponent(next.slug)}`,
        );
        return next;
      });
    },
    [queue],
  );

  const closeProduct = useCallback(() => {
    setViewing(null);
    if (!window.location.hash.startsWith(HASH_PREFIX)) return;

    if (pushedHash.current) {
      pushedHash.current = false;
      window.history.back();
    } else {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
    }
  }, []);

  /** Only one overlay at a time: opening the bag puts the pop-up away. */
  const openBag = useCallback(() => {
    closeProduct();
    setBagOpen(true);
  }, [closeProduct]);

  const closeBag = useCallback(() => setBagOpen(false), []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (!hash.startsWith(HASH_PREFIX)) {
        pushedHash.current = false;
        setViewing(null);
        return;
      }
      const slug = decodeURIComponent(hash.slice(HASH_PREFIX.length));
      const product = known.current.get(slug);
      if (product) {
        setViewing((current) => {
          // Stepping through the queue rewrites the hash itself; reacting to
          // that would be the pop-up chasing its own tail.
          if (current?.slug === slug) return current;
          setQueue([product]);
          return product;
        });
      } else wanted.current = slug;
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /**
   * Called by every page that lists products. It also settles a `#p=` link
   * someone arrived on: the hash is known before the products are, so the slug
   * waits here until the page that can resolve it shows up.
   */
  const registerProducts = useCallback((products: ShopProduct[]) => {
    for (const product of products) known.current.set(product.slug, product);

    // The address may already name a product. Read it once, on the first list
    // to arrive, then leave the address bar to the hashchange listener.
    if (!hashRead.current) {
      hashRead.current = true;
      const hash = window.location.hash;
      wanted.current = hash.startsWith(HASH_PREFIX)
        ? decodeURIComponent(hash.slice(HASH_PREFIX.length))
        : null;
    }

    const slug = wanted.current;
    if (!slug) return;
    const match = known.current.get(slug);
    if (!match) return;

    wanted.current = null;
    setQueue([match]);
    setViewing(match);
  }, []);

  // ---- bag -----------------------------------------------------------------
  const say = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const addToBag = useCallback(
    ({
      product,
      color = null,
      size = null,
      quantity = 1,
      quiet = false,
    }: AddToBagInput) => {
      const line: BagLine = {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.media[0] ?? null,
        priceKobo: product.priceKobo,
        quantity: Math.max(1, Math.trunc(quantity)),
        color,
        size,
      };
      const key = lineKey(line);

      bagStore.update((current) => {
        const index = current.findIndex((entry) => lineKey(entry) === key);
        if (index === -1) return [...current, line];

        const next = [...current];
        next[index] = {
          ...next[index],
          // The price on the line always reflects today's price, so a sale that
          // started after something was added is honoured rather than lost.
          priceKobo: line.priceKobo,
          quantity: Math.min(
            next[index].quantity + line.quantity,
            MAX_LINE_QUANTITY,
          ),
        };
        return next;
      });

      if (!quiet) say(`${product.name} added to your bag`);
    },
    [say],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    bagStore.update((current) =>
      current.flatMap((line) => {
        if (lineKey(line) !== key) return [line];
        const next = Math.min(Math.trunc(quantity), MAX_LINE_QUANTITY);
        return next < 1 ? [] : [{ ...line, quantity: next }];
      }),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    bagStore.update((current) =>
      current.filter((line) => lineKey(line) !== key),
    );
  }, []);

  const clearBag = useCallback(() => bagStore.set([]), []);

  const toggleSaved = useCallback(
    (productId: string) => {
      savedStore.update((current) => {
        const has = current.includes(productId);
        say(has ? "Removed from saved" : "Saved");
        return has
          ? current.filter((id) => id !== productId)
          : [...current, productId];
      });
    },
    [say],
  );

  const isSaved = useCallback(
    (productId: string) => saved.includes(productId),
    [saved],
  );

  const value = useMemo<ShopContextValue>(
    () => ({
      ready,
      bag,
      count: bagCount(bag),
      subtotalKobo: bagSubtotal(bag),
      addToBag,
      setQuantity,
      removeLine,
      clearBag,
      saved,
      isSaved,
      toggleSaved,
      bagOpen,
      openBag,
      closeBag,
      viewing,
      openProduct,
      closeProduct,
      stepProduct,
      viewingAt: viewing
        ? queue.findIndex((item) => item.id === viewing.id)
        : -1,
      viewingOf: queue.length,
      registerProducts,
      toast,
      say,
      cartToken,
    }),
    [
      ready,
      bag,
      addToBag,
      setQuantity,
      removeLine,
      clearBag,
      saved,
      isSaved,
      toggleSaved,
      bagOpen,
      openBag,
      closeBag,
      viewing,
      openProduct,
      closeProduct,
      stepProduct,
      queue,
      registerProducts,
      toast,
      say,
      cartToken,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

/**
 * Teaches the pop-up about the products on this page, so a link like
 * `/shop#p=silk-slip` opens straight into it. Render it beside any list.
 */
export function ProductRegistry({ products }: { products: ShopProduct[] }) {
  const { registerProducts } = useShop();

  useEffect(() => {
    registerProducts(products);
  }, [products, registerProducts]);

  return null;
}
