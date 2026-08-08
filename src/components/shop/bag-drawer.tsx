"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { Media } from "@/components/shop/media";
import { Sheet } from "@/components/shop/sheet";
import { useShop } from "@/components/shop/shop-provider";
import { formatNairaShort } from "@/lib/format";
import { cheapestFee, type ShippingSettings } from "@/lib/shipping";
import { lineKey } from "@/lib/shop";

/**
 * The bag, as a drawer over whatever you were looking at.
 *
 * Adding something should never cost a shopper their place in the grid, so the
 * bag never takes over the page until they choose to check out.
 *
 * It quotes delivery "from" rather than exactly, because the exact figure
 * depends on where the parcel is going and nobody has said yet. Checkout asks,
 * and the number settles there.
 */
export function BagDrawer({ shipping }: { shipping: ShippingSettings }) {
  const { bag, bagOpen, closeBag, subtotalKobo, setQuantity, removeLine, count } =
    useShop();

  const from = cheapestFee(shipping);
  const freeEverywhere =
    shipping.freeOverKobo > 0 && subtotalKobo >= shipping.freeOverKobo;
  const toFreeDelivery = shipping.freeOverKobo - subtotalKobo;

  return (
    <Sheet
      open={bagOpen}
      onClose={closeBag}
      label="Your bag"
      side="right"
      className="max-h-[88dvh] w-full rounded-t-3xl bg-canvas sm:h-full sm:max-h-none sm:w-[26rem] sm:rounded-none"
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">
          Your bag
          {count > 0 && (
            <span className="ml-2 text-sm font-normal text-ink-muted tabular-nums">
              {count} item{count === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={closeBag}
          aria-label="Close bag"
          className="flex size-9 items-center justify-center rounded-full text-ink-secondary transition hover:bg-canvas-deep"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      {bag.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
            <ShoppingBag className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Your bag is empty</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Everything you add lands here, and stays put until you come back.
            </p>
          </div>
          <Link
            href="/shop"
            onClick={closeBag}
            className="mt-1 inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {bag.map((line) => {
              const key = lineKey(line);
              return (
                <li key={key} className="flex gap-3 py-4">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={closeBag}
                    className="shrink-0"
                  >
                    <Media
                      url={line.image}
                      alt={line.name}
                      className="size-20 rounded-xl bg-canvas-deep"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">
                        {line.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLine(key)}
                        aria-label={`Remove ${line.name}`}
                        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-canvas-deep hover:text-critical"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>

                    {(line.color || line.size) && (
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {[line.color, line.size ? `UK ${line.size}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-canvas-deep p-1">
                        <Stepper
                          label={`Fewer ${line.name}`}
                          onClick={() => setQuantity(key, line.quantity - 1)}
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </Stepper>
                        <span className="min-w-6 text-center text-[13px] font-medium tabular-nums">
                          {line.quantity}
                        </span>
                        <Stepper
                          label={`More ${line.name}`}
                          onClick={() => setQuantity(key, line.quantity + 1)}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </Stepper>
                      </div>

                      <p className="text-sm font-semibold text-ink tabular-nums">
                        {formatNairaShort(line.priceKobo * line.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <footer className="border-t border-line bg-canvas px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
            {shipping.freeOverKobo > 0 && toFreeDelivery > 0 && (
              <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand">
                {formatNairaShort(toFreeDelivery)} more for free delivery.
              </p>
            )}

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-secondary">
                  {count} item{count === 1 ? "" : "s"}
                </dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatNairaShort(subtotalKobo)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Delivery</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {freeEverywhere
                    ? "Free"
                    : from === 0
                      ? "Free"
                      : `from ${formatNairaShort(from)}`}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-semibold text-ink">Subtotal</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {formatNairaShort(subtotalKobo)}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              onClick={closeBag}
              className="mt-4 flex h-12 items-center justify-center rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand"
            >
              Checkout
            </Link>
            <button
              type="button"
              onClick={closeBag}
              className="mt-2 h-10 w-full text-sm text-ink-secondary transition hover:text-ink"
            >
              Keep shopping
            </button>
          </footer>
        </>
      )}
    </Sheet>
  );
}

function Stepper({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-white active:scale-90"
    >
      {children}
    </button>
  );
}
