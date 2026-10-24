export type CsvValue = string | number | null;

export interface CsvColumn {
  readonly key: string;
  readonly header: string;
}

export interface CsvOptions {
  /** Prefix a UTF-8 BOM so Excel opens Korean text correctly. */
  readonly bom?: boolean;
}

const BOM = '\uFEFF';
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  // Neutralise spreadsheet formula injection in user-entered text.
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with CRLF line endings. */
export function toCsv(rows: readonly Readonly<Record<string, CsvValue>>[], columns: readonly CsvColumn[], { bom = false }: CsvOptions = {}): string {
  const lines = [columns.map((c) => cell(c.header)), ...rows.map((row) => columns.map((c) => cell(row[c.key])))];
  return (bom ? BOM : '') + lines.map((l) => l.join(',')).join('\r\n') + '\r\n';
}
