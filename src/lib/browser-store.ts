import { useSyncExternalStore } from "react";

/**
 * Reading the browser's own state — localStorage, media queries — the way
 * React wants it read.
 *
 * The obvious version of this is `useState` plus an effect that fills it in on
 * mount, and it is wrong twice over: it renders once with the wrong answer,
 * and it cascades a second render to correct itself. `useSyncExternalStore` is
 * built for exactly this shape — an external thing React does not own — and it
 * knows the server rendered a different value, so hydration stays quiet.
 *
 * A store keeps one cached snapshot per key. That matters: `getSnapshot` must
 * return the same reference until something actually changes, or React
 * re-renders forever.
 */

export type PersistentStore<T> = {
  subscribe: (onChange: () => void) => () => void;
  /** The value in this browser. Cached, so the reference is stable. */
  get: () => T;
  /** What the server rendered — always the fallback. */
  getServer: () => T;
  set: (next: T) => void;
  update: (change: (current: T) => T) => void;
};

/**
 * A value kept in localStorage under `key`.
 *
 * `accept` is the guard: anything the shopper (or a previous version of the
 * shop) left behind that no longer fits the shape is dropped rather than
 * rendered.
 */
export function persistentStore<T>(
  key: string,
  fallback: T,
  accept: (raw: unknown) => raw is T,
): PersistentStore<T> {
  let cache: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return accept(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function announce(): void {
    for (const listener of listeners) listener();
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange);

      // Another tab of the same shop is the same shopper: keep them in step.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        cache = read();
        announce();
      };
      window.addEventListener("storage", onStorage);

      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },

    get() {
      if (cache === null) cache = read();
      return cache;
    },

    getServer() {
      return fallback;
    },

    set(next) {
      cache = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // A full or blocked store must never stop anyone shopping.
      }
      announce();
    },

    update(change) {
      this.set(change(this.get()));
    },
  };
}

/** Subscribes a component to a persistent store. */
export function usePersistent<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

const noopSubscribe = () => () => {};

/**
 * False on the server and through hydration, true afterwards.
 *
 * Anything that depends on localStorage has to render its empty shape first,
 * and this is how a component knows which of the two it is doing.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Which shape of screen this is — true wide, false narrow, null not yet known.
 *
 * Null on the server and for the first client render, so the markup the server
 * sent and the markup React first produces are the same thing. Anything that
 * branches on this has to have an answer for "don't know yet"; the alternative
 * is a hydration mismatch, which React resolves by throwing the server's work
 * away and rendering the whole subtree again.
 */
const WIDE = "(min-width: 640px)";

function subscribeWidth(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsWide(): boolean | null {
  const hydrated = useIsHydrated();
  const wide = useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return hydrated ? wide : null;
}

/** True when this person has asked their system for less movement. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
