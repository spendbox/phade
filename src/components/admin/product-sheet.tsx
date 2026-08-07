"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Images,
  Loader2,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  Ruler,
  Search,
  Trash2,
} from "lucide-react";

import {
  addSheetRow,
  deleteSheetRows,
  updateCell,
  type SheetState,
} from "@/app/admin/(dashboard)/database/actions";
import { ColorDots, ColorPicker } from "@/components/admin/color-picker";
import { ImageUploader } from "@/components/admin/image-uploader";
import { MediaThumb } from "@/components/admin/media-thumb";
import { SelectCell, TextCell } from "@/components/admin/sheet-cells";
import { SizePicker } from "@/components/admin/size-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StockDot } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatNaira, koboToNairaInput } from "@/lib/format";
import type { SheetRow } from "@/lib/queries";
import {
  DELETE_CONFIRMATION,
  PRODUCT_STATUSES,
  type ProductColor,
} from "@/lib/types";

/** How often the sheet pulls fresh server data while it's on screen. */
const REFRESH_MS = 20_000;

type Category = { id: string; name: string };

export function ProductSheet({
  rows,
  categories,
  aiEnabled,
}: {
  rows: SheetRow[];
  categories: Category[];
  aiEnabled: boolean;
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [full, setFull] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Which row has a picker open, and which one. Only ever one at a time — the
  // sheet stays the focus, the dialog is a detour.
  const [editing, setEditing] = useState<{
    row: SheetRow;
    panel: "media" | "colors" | "sizes";
  } | null>(null);

  const [addState, addAction, adding] = useActionState(addSheetRow, {
    ok: null,
  } as SheetState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteSheetRows, {
    ok: null,
  } as SheetState);

  const [lastDelete, setLastDelete] = useState(deleteState);
  if (deleteState !== lastDelete) {
    setLastDelete(deleteState);
    if (deleteState.ok === true) {
      setConfirming(false);
      setSelected([]);
    }
  }

  /**
   * Live-ness without a socket: RLS has no policies, so the browser's anon key
   * can't subscribe to anything — the server holds the only credentials. A
   * timed refresh of the server component gets the same result. It pauses on a
   * hidden tab and while a dialog is open, so it never yanks a row out from
   * under an edit in progress.
   */
  const paused = editing !== null || confirming;

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      // A hidden tab has nobody watching, and a focused input is mid-edit.
      if (document.hidden) return;
      if (document.activeElement?.tagName === "INPUT") return;
      router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router, paused]);

  const visible = search
    ? rows.filter((row) =>
        `${row.name} ${row.sku ?? ""} ${row.category?.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : rows;

  const allChecked = visible.length > 0 && selected.length === visible.length;

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        full && "fixed inset-0 z-50 bg-plane p-4",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the sheet"
            className="h-9 pl-9"
          />
        </div>

        <span className="text-xs text-ink-muted">
          {visible.length} of {rows.length} rows
        </span>

        <span className="ml-auto flex items-center gap-2">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-critical transition hover:bg-critical-soft"
            >
              <Trash2 className="size-3.5" />
              Delete {selected.length}
            </button>
          )}

          <form action={addAction}>
            <Button type="submit" variant="secondary" disabled={adding}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add row
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setFull((value) => !value)}
            aria-label={full ? "Exit full screen" : "Full screen"}
            title={full ? "Exit full screen" : "Full screen"}
            className="flex size-9 items-center justify-center rounded-lg bg-surface text-ink-secondary shadow-[0_0_0_1px_rgb(11_11_12_/_0.08)] transition hover:text-ink"
          >
            {full ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </span>
      </div>

      {addState.ok === false && (
        <p role="alert" className="text-sm text-critical">
          {addState.error}
        </p>
      )}

      <div
        className={cn(
          "card min-h-0 flex-1 overflow-auto",
          full ? "" : "max-h-[70vh]",
        )}
      >
        <table className="w-full min-w-[86rem] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-xs font-medium text-ink-secondary">
              <Th className="w-10 pl-4">
                <Checkbox
                  checked={allChecked}
                  indeterminate={selected.length > 0 && !allChecked}
                  onChange={() =>
                    setSelected(
                      allChecked ? [] : visible.map((row) => row.id),
                    )
                  }
                  label="Select all rows"
                />
              </Th>
              <Th className="min-w-[13rem]">Name</Th>
              <Th className="w-28">Colour</Th>
              <Th className="w-32">Size</Th>
              <Th className="w-24 text-right">Qty</Th>
              <Th className="w-20 text-right">Sold</Th>
              <Th className="w-20">Media</Th>
              <Th className="w-44">Category</Th>
              <Th className="w-32 text-right">Price</Th>
              <Th className="w-32">Status</Th>
              <Th className="w-36">SKU</Th>
              <Th className="w-32">Subcategory</Th>
              <Th className="w-28 text-right">Revenue</Th>
              <Th className="w-12" />
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-center text-sm text-ink-muted"
                >
                  {search
                    ? "No rows match that search."
                    : "No products yet. Add a row to start one."}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const checked = selected.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-line",
                      checked ? "bg-brand-soft/50" : "hover:bg-plane/50",
                    )}
                  >
                    <Td className="pl-4">
                      <Checkbox
                        checked={checked}
                        onChange={() =>
                          setSelected((current) =>
                            checked
                              ? current.filter((id) => id !== row.id)
                              : [...current, row.id],
                          )
                        }
                        label={`Select ${row.name}`}
                      />
                    </Td>

                    <Td>
                      <TextCell id={row.id} field="name" value={row.name} />
                    </Td>

                    <Td>
                      <PanelButton
                        onClick={() => setEditing({ row, panel: "colors" })}
                        label={`Colours for ${row.name}`}
                      >
                        {row.colors?.length ? (
                          <ColorDots colors={row.colors} limit={3} />
                        ) : (
                          <Palette className="size-3.5 text-ink-muted" />
                        )}
                      </PanelButton>
                    </Td>

                    <Td>
                      <PanelButton
                        onClick={() => setEditing({ row, panel: "sizes" })}
                        label={`Sizes for ${row.name}`}
                      >
                        {row.sizes?.length ? (
                          <span className="truncate tabular-nums">
                            {row.sizes.join(" · ")}
                          </span>
                        ) : (
                          <Ruler className="size-3.5 text-ink-muted" />
                        )}
                      </PanelButton>
                    </Td>

                    <Td>
                      <span className="flex items-center gap-1.5">
                        <StockDot
                          stock={row.stock}
                          threshold={row.low_stock_threshold}
                        />
                        <TextCell
                          id={row.id}
                          field="stock"
                          type="number"
                          align="right"
                          value={String(row.stock)}
                        />
                      </span>
                    </Td>

                    <Td className="text-right tabular-nums text-ink-secondary">
                      {row.sold}
                    </Td>

                    <Td>
                      <PanelButton
                        onClick={() => setEditing({ row, panel: "media" })}
                        label={`Media for ${row.name}`}
                      >
                        {row.images?.length ? (
                          <>
                            <MediaThumb
                              url={row.images[0]}
                              className="size-6 rounded ring-1 ring-inset ring-line"
                            />
                            {row.images.length > 1 && (
                              <span className="text-xs text-ink-muted">
                                +{row.images.length - 1}
                              </span>
                            )}
                          </>
                        ) : (
                          <Images className="size-3.5 text-ink-muted" />
                        )}
                      </PanelButton>
                    </Td>

                    <Td>
                      <SelectCell
                        id={row.id}
                        field="category_id"
                        value={row.category_id ?? ""}
                        options={[
                          { value: "", label: "—" },
                          ...categories.map((category) => ({
                            value: category.id,
                            label: category.name,
                          })),
                        ]}
                      />
                    </Td>

                    <Td>
                      <TextCell
                        id={row.id}
                        field="price"
                        align="right"
                        value={koboToNairaInput(row.price_kobo)}
                      />
                    </Td>

                    <Td>
                      <SelectCell
                        id={row.id}
                        field="status"
                        value={row.status}
                        options={PRODUCT_STATUSES.map((status) => ({
                          value: status,
                          label: status[0].toUpperCase() + status.slice(1),
                        }))}
                      />
                    </Td>

                    <Td>
                      <TextCell
                        id={row.id}
                        field="sku"
                        value={row.sku ?? ""}
                        placeholder="—"
                      />
                    </Td>

                    <Td>
                      <TextCell
                        id={row.id}
                        field="subcategory"
                        value={row.subcategory ?? ""}
                        placeholder="—"
                      />
                    </Td>

                    <Td className="text-right tabular-nums text-ink-secondary">
                      {formatNaira(row.revenueKobo)}
                    </Td>

                    <Td>
                      <Link
                        href={`/admin/products/${row.id}`}
                        title="Open the full product page"
                        className="flex size-7 items-center justify-center rounded text-ink-muted transition hover:bg-plane hover:text-ink"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EditorModal
        editing={editing}
        aiEnabled={aiEnabled}
        onClose={() => setEditing(null)}
      />

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title={`Delete ${selected.length} row${selected.length === 1 ? "" : "s"}?`}
      >
        <form action={deleteAction} className="space-y-3 p-5">
          <input type="hidden" name="ids" value={selected.join(",")} />
          <p className="text-sm leading-relaxed text-ink-secondary">
            This can&apos;t be undone. Order history stays, but the products
            themselves are gone for good.
          </p>

          <label className="block text-[13px] font-medium text-ink-secondary">
            Type{" "}
            <span className="font-mono text-ink">{DELETE_CONFIRMATION}</span> to
            confirm
            <Input
              name="confirmation"
              autoComplete="off"
              placeholder={DELETE_CONFIRMATION}
              className="mt-1.5"
            />
          </label>

          {deleteState.ok === false && (
            <p role="alert" className="text-sm text-critical">
              {deleteState.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete {selected.length}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/**
 * The three rich columns — media, colours, sizes — don't fit in a cell, so the
 * cell is a button and the editing happens here. Saving writes the same single
 * field the inline cells do.
 */
function EditorModal({
  editing,
  aiEnabled,
  onClose,
}: {
  editing: { row: SheetRow; panel: "media" | "colors" | "sizes" } | null;
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef<string | null>(null);

  const row = editing?.row;
  const panel = editing?.panel;

  const title =
    panel === "media"
      ? `Media — ${row?.name ?? ""}`
      : panel === "colors"
        ? `Colours — ${row?.name ?? ""}`
        : `Sizes — ${row?.name ?? ""}`;

  async function save() {
    if (!row || !panel || valueRef.current === null) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("field", panel);
    formData.set("value", valueRef.current);

    const result = await updateCell({ ok: null }, formData);
    setSaving(false);

    if (result.ok === false) {
      setError(result.error);
      return;
    }
    valueRef.current = null;
    onClose();
  }

  return (
    <Modal open={editing !== null} onClose={onClose} title={title}>
      {row && panel && (
        <div className="space-y-4 p-5">
          {panel === "media" && (
            <ImageUploader
              key={`media-${row.id}`}
              initial={row.images ?? []}
              onChange={(images) => {
                valueRef.current = JSON.stringify(images);
              }}
            />
          )}

          {panel === "colors" && (
            <ColorPicker
              key={`colors-${row.id}`}
              initial={row.colors ?? []}
              aiEnabled={aiEnabled}
              onChange={(colors: ProductColor[]) => {
                valueRef.current = JSON.stringify(colors);
              }}
            />
          )}

          {panel === "sizes" && (
            <SizePicker
              key={`sizes-${row.id}`}
              initial={row.sizes ?? []}
              onChange={(sizes) => {
                valueRef.current = JSON.stringify(sizes);
              }}
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PanelButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-full items-center gap-1.5 rounded border border-transparent px-1.5 text-left text-[13px] text-ink transition hover:border-line-strong hover:bg-surface"
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      // Sticky so the column names stay put through a long catalogue; the
      // background is opaque or rows would show through as they scroll under.
      className={cn(
        "sticky top-0 z-10 border-b border-line bg-surface px-2 py-2.5 font-medium",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-2 py-1.5 align-middle", className)}>{children}</td>;
}
