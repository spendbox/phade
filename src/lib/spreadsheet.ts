/**
 * Reading a spreadsheet in the browser, without a parser dependency.
 *
 * Both maintained npm xlsx readers ship with unfixed advisories, and a product
 * importer is not worth a known-vulnerable dependency. CSV needs no library at
 * all, and .xlsx is a zip of XML — the platform already has `DecompressionStream`
 * for the zip entries and `DOMParser` for the sheet, so the whole reader is
 * about a hundred lines and carries no supply chain.
 *
 * Only what Excel, Numbers and Google Sheets actually emit is handled: stored
 * and deflated zip entries, shared strings, and inline strings.
 */

export type SheetTable = { headers: string[]; rows: string[][] };

// ---------------------------------------------------------------------------
// CSV / TSV
// ---------------------------------------------------------------------------

/** RFC 4180: quoted fields may contain the delimiter, newlines, and "" escapes. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  // Strip a UTF-8 BOM — Excel writes one and it would poison the first header.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

type ZipEntry = { name: string; data: Uint8Array };

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Reads the zip by walking the central directory backwards from the end-of-
 * central-directory record — the same route every unzip takes, and the only one
 * that survives the data-descriptor headers Excel sometimes writes.
 */
async function readZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let end = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end === -1) throw new Error("That file isn't a readable spreadsheet.");

  const count = view.getUint16(end + 10, true);
  let pointer = view.getUint32(end + 16, true);

  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break;

    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);

    const name = new TextDecoder().decode(
      bytes.subarray(pointer + 46, pointer + 46 + nameLength),
    );

    // The local header repeats the name and extra field with its own lengths.
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;

    entries.push({
      name,
      data: bytes.subarray(start, start + compressedSize),
    });

    pointer += 46 + nameLength + extraLength + commentLength;
  }

  const files = new Map<string, Uint8Array>();
  for (const entry of entries) {
    // Method 0 is stored, 8 is deflate. Nothing else appears in an .xlsx.
    const raw = entry.data;
    files.set(
      entry.name,
      raw.length === 0
        ? raw
        : await inflateRaw(raw).catch(() => raw),
    );
  }
  return files;
}

/** "BC7" -> 54 (zero-based column index). */
function columnIndex(reference: string): number {
  let index = 0;
  for (const char of reference) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await readZip(buffer);
  const decoder = new TextDecoder();
  const parser = new DOMParser();

  const sharedStrings: string[] = [];
  const sharedRaw = files.get("xl/sharedStrings.xml");
  if (sharedRaw) {
    const doc = parser.parseFromString(decoder.decode(sharedRaw), "text/xml");
    for (const item of Array.from(doc.getElementsByTagName("si"))) {
      // Runs (<r><t>…) have to be joined or styled text arrives in pieces.
      const parts = Array.from(item.getElementsByTagName("t")).map(
        (node) => node.textContent ?? "",
      );
      sharedStrings.push(parts.join(""));
    }
  }

  const sheetName =
    [...files.keys()]
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .sort()[0] ?? null;
  if (!sheetName) throw new Error("That workbook has no sheets.");

  const doc = parser.parseFromString(
    decoder.decode(files.get(sheetName)!),
    "text/xml",
  );

  const rows: string[][] = [];
  for (const rowNode of Array.from(doc.getElementsByTagName("row"))) {
    const cells: string[] = [];

    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const reference = cell.getAttribute("r") ?? "";
      const at = reference ? columnIndex(reference) : cells.length;
      const type = cell.getAttribute("t");

      let value = "";
      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t"))
          .map((node) => node.textContent ?? "")
          .join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
        value =
          type === "s" ? (sharedStrings[Number(raw)] ?? "") : raw;
      }

      // Empty cells are omitted from the XML, so pad up to the real column.
      while (cells.length < at) cells.push("");
      cells[at] = value;
    }

    rows.push(cells);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export const SPREADSHEET_ACCEPT =
  ".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Reads a file into a header row plus data rows, blank lines dropped. */
export async function readSpreadsheet(file: File): Promise<SheetTable> {
  const name = file.name.toLowerCase();

  let grid: string[][];
  if (name.endsWith(".xlsx")) {
    grid = await parseXlsx(await file.arrayBuffer());
  } else if (name.endsWith(".xls")) {
    throw new Error(
      "Old .xls files aren't supported — re-save as .xlsx or CSV and try again.",
    );
  } else {
    const text = await file.text();
    const delimiter = name.endsWith(".tsv") || text.split("\n")[0]?.includes("\t")
      ? "\t"
      : ",";
    grid = parseDelimited(text, delimiter);
  }

  const cleaned = grid.filter((row) =>
    row.some((cell) => cell != null && String(cell).trim() !== ""),
  );
  if (cleaned.length === 0) throw new Error("That file is empty.");

  const [header, ...rest] = cleaned;
  return {
    headers: header.map((cell) => String(cell ?? "").trim()),
    rows: rest.map((row) => row.map((cell) => String(cell ?? "").trim())),
  };
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

export type SheetField =
  | "name"
  | "colors"
  | "sizes"
  | "stock"
  | "sold"
  | "price"
  | "category"
  | "subcategory"
  | "sku"
  | "description"
  | "tags";

/**
 * Header names people actually type. Matching is loose — case, spaces and
 * punctuation are stripped — so "Product Name", "product_name" and "NAME" all
 * land on the same field.
 */
const ALIASES: Record<SheetField, string[]> = {
  name: ["name", "product", "productname", "title", "item"],
  colors: ["colour", "colours", "color", "colors", "colourway", "colorway"],
  sizes: ["size", "sizes", "sizerun"],
  stock: ["quantity", "qty", "stock", "instock", "unitsonhand", "onhand"],
  sold: ["sold", "unitssold", "qtysold", "quantitysold"],
  price: ["price", "amount", "cost", "sellingprice", "retailprice"],
  category: ["category", "cat"],
  subcategory: ["subcategory", "subcat", "type"],
  sku: ["sku", "code", "productcode"],
  description: ["description", "details", "notes"],
  tags: ["tags", "keywords"],
};

function normalise(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Best-guess column index for each field; -1 where nothing matched. */
export function mapColumns(headers: string[]): Record<SheetField, number> {
  const cleaned = headers.map(normalise);
  const mapping = {} as Record<SheetField, number>;

  for (const [field, aliases] of Object.entries(ALIASES) as [
    SheetField,
    string[],
  ][]) {
    mapping[field] = cleaned.findIndex((header) => aliases.includes(header));
  }
  return mapping;
}

/** "Wine, nude / forest" -> ["Wine", "nude", "forest"]. */
export function splitList(value: string): string[] {
  return value
    .split(/[,/|;]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * The columns the importer reads, in the order the template lays them out.
 *
 * The four the shop is asked for come first and are highlighted in the file;
 * everything else follows so a business that wants to fill in more can, without
 * having to guess at the header wording.
 */
export const TEMPLATE_COLUMNS: {
  header: string;
  field: SheetField;
  required?: boolean;
  width?: number;
  note: string;
}[] = [
  {
    header: "Name",
    field: "name",
    required: true,
    width: 28,
    note: "The product name. The only column that must have a value.",
  },
  {
    header: "Colour",
    field: "colors",
    required: true,
    width: 24,
    note: "Colour names, comma separated — e.g. wine, nude. Matched to your palette.",
  },
  {
    header: "Size",
    field: "sizes",
    required: true,
    width: 18,
    note: "Sizes, comma separated — e.g. 10, 12, 14. Leave blank for one-size pieces.",
  },
  {
    header: "Quantity",
    field: "stock",
    required: true,
    width: 12,
    note: "Units on hand. Becomes the opening stock movement.",
  },
  {
    header: "Sold",
    field: "sold",
    width: 10,
    note: "Optional. For your own reference — real sales come from orders.",
  },
  { header: "Price", field: "price", width: 14, note: "In naira." },
  {
    header: "Category",
    field: "category",
    width: 22,
    note: "Must match one of your categories by name, or it's left unset.",
  },
  { header: "Subcategory", field: "subcategory", width: 20, note: "e.g. Totes." },
  { header: "SKU", field: "sku", width: 18, note: "Blank and we generate one." },
  { header: "Description", field: "description", width: 40, note: "Optional." },
  { header: "Tags", field: "tags", width: 24, note: "Comma separated." },
];
