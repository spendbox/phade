"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

import {
  importSheetRows,
  resolveColorNames,
  type ImportRow,
} from "@/app/admin/(dashboard)/database/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import {
  SPREADSHEET_ACCEPT,
  mapColumns,
  readSpreadsheet,
  splitList,
  type SheetField,
} from "@/lib/spreadsheet";
import type { ProductColor } from "@/lib/types";

/** Rows per request. Small enough that the bar moves, large enough to be quick. */
const BATCH = 10;

type Stage =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "colours"; total: number }
  | { kind: "importing"; done: number; total: number }
  | { kind: "done"; created: number }
  | { kind: "error"; message: string };

/**
 * Bringing a supplier's spreadsheet into the catalogue.
 *
 * Everything arrives as a draft, so an unreviewed row can't reach the shop.
 * Colour names are read as typed — "wine", "chocolate", "ash" — and resolved
 * against the shop's saved palette first, with the assistant filling in
 * anything the palette doesn't know.
 */
export function SheetImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  const busy =
    stage.kind === "reading" ||
    stage.kind === "colours" ||
    stage.kind === "importing";

  async function handleFile(file: File) {
    setStage({ kind: "reading" });

    try {
      const table = await readSpreadsheet(file);
      const columns = mapColumns(table.headers);

      if (columns.name === -1) {
        throw new Error(
          `No "name" column found. The header row needs at least a product name — the columns read were: ${table.headers.join(", ")}`,
        );
      }

      const cell = (row: string[], field: SheetField): string => {
        const at = columns[field];
        return at === -1 ? "" : (row[at] ?? "").trim();
      };

      const rows: ImportRow[] = table.rows.flatMap((row): ImportRow[] => {
        const name = cell(row, "name");
        if (!name) return [];

        return [
          {
            name,
            colors: splitList(cell(row, "colors")),
            sizes: splitList(cell(row, "sizes"))
              .map((size) => Number.parseInt(size, 10))
              .filter((size) => Number.isFinite(size)),
            stock: Number.parseInt(cell(row, "stock"), 10) || 0,
            sold: Number.parseInt(cell(row, "sold"), 10) || 0,
            price: cell(row, "price").replace(/[^\d.]/g, ""),
            category: cell(row, "category"),
            subcategory: cell(row, "subcategory"),
            sku: cell(row, "sku"),
            description: cell(row, "description"),
            tags: splitList(cell(row, "tags")),
          },
        ];
      });

      if (rows.length === 0) throw new Error("No product rows in that file.");

      // One resolution pass for the whole file, not one per row.
      setStage({ kind: "colours", total: rows.length });
      const names = [...new Set(rows.flatMap((row) => row.colors ?? []))];
      const colorMap: Record<string, ProductColor> =
        names.length > 0 ? await resolveColorNames(names) : {};
      const colorsJson = JSON.stringify(colorMap);

      // Import in batches so the bar counts rows the server actually wrote.
      let created = 0;
      setStage({ kind: "importing", done: 0, total: rows.length });

      for (let index = 0; index < rows.length; index += BATCH) {
        const batch = rows.slice(index, index + BATCH);
        const result = await importSheetRows(JSON.stringify(batch), colorsJson);

        if (result.ok === false) throw new Error(result.error);
        created += result.ok === true ? result.created : 0;

        setStage({
          kind: "importing",
          done: Math.min(index + batch.length, rows.length),
          total: rows.length,
        });
      }

      setStage({ kind: "done", created });
      router.refresh();
    } catch (cause) {
      setStage({
        kind: "error",
        message:
          cause instanceof Error ? cause.message : "That file couldn't be read.",
      });
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setStage({ kind: "idle" });
  }

  const percent =
    stage.kind === "importing" && stage.total > 0
      ? Math.round((stage.done / stage.total) * 100)
      : stage.kind === "done"
        ? 100
        : 0;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Import
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Import a spreadsheet"
        size="md"
      >
        <div className="space-y-4 p-5">
          {stage.kind === "idle" || stage.kind === "error" ? (
            <>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files[0];
                  if (file) void handleFile(file);
                }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
                  dragging
                    ? "border-brand bg-brand-soft/50"
                    : "border-line-strong bg-plane/60",
                )}
              >
                <FileSpreadsheet className="size-6 text-ink-muted" />
                <p className="mt-2 text-sm text-ink-secondary">
                  Drop a CSV or Excel file here
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 text-sm font-medium text-brand hover:underline"
                >
                  or choose a file
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={SPREADSHEET_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void handleFile(file);
                  }}
                />
              </div>

              <div className="rounded-lg bg-plane px-3 py-2.5 text-xs leading-relaxed text-ink-secondary">
                <p className="font-medium text-ink">
                  Name, colour, size, quantity and sold
                </p>
                <p className="mt-1">
                  Those are all that&apos;s needed — price, category,
                  subcategory, SKU, description and tags come in too if the
                  columns are there. Colour names are read as you write them
                  (“wine, nude”) and matched to your palette. Everything is
                  saved as a draft for you to review.
                </p>
              </div>

              {stage.kind === "error" && (
                <p
                  role="alert"
                  className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical"
                >
                  {stage.message}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2.5 text-sm text-ink">
                {stage.kind === "done" ? (
                  <span className="text-good-text">Done</span>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin text-ink-muted" />
                    <span>
                      {stage.kind === "reading" && "Reading the file…"}
                      {stage.kind === "colours" && "Matching colours…"}
                      {stage.kind === "importing" &&
                        `Importing ${stage.done} of ${stage.total}`}
                    </span>
                  </>
                )}
              </div>

              <div
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-plane"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {stage.kind === "done" && (
                <p className="text-sm text-ink-secondary">
                  {stage.created} product
                  {stage.created === 1 ? "" : "s"} added as drafts. Review them
                  in the sheet, then switch each to Active when it&apos;s ready.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={busy}>
              {stage.kind === "done" ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
