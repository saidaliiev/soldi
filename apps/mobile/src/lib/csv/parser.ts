/**
 * SOLDI CSV parser.
 *
 * Pure, streaming-safe CSV → row[] parser with:
 * - 5MB size cap (configurable via maxBytes)
 * - RFC 4180 quoted-field support (double-quote escaping)
 * - Auto-delimiter detection (comma, semicolon, tab)
 * - CRLF and LF line ending handling
 * - Row count cap (configurable via maxRows)
 *
 * No file I/O — the caller reads the file and passes the text string.
 * No regex substitution used for the main state machine — char-by-char walk.
 *
 * Threat model: T-01-04-05, T-01-04-06
 * - maxBytes cap throws before parsing begins (DoS protection).
 * - Returns plain strings only; nothing is eval'd; SQL params handle injection.
 */

// ---------------------------------------------------------------------------
// CsvParseError
// ---------------------------------------------------------------------------

export type CsvParseErrorCode = 'too-large' | 'malformed' | 'too-many-rows';

/**
 * Thrown by parseCsv when the input cannot be safely parsed.
 * Callers should inspect `error.code` to surface the right i18n message.
 */
export class CsvParseError extends Error {
  public readonly code: CsvParseErrorCode;

  constructor(code: CsvParseErrorCode, message: string) {
    super(message);
    this.name = 'CsvParseError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParseCsvOptions = {
  maxBytes?: number;
  maxRows?: number;
  delimiter?: ',' | ';' | '\t';
};

// ---------------------------------------------------------------------------
// Auto-detect delimiter
// ---------------------------------------------------------------------------

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis  = (firstLine.match(/;/g) ?? []).length;
  const tabs   = (firstLine.match(/\t/g) ?? []).length;

  if (tabs >= semis && tabs >= commas) return '\t';
  if (semis >= commas) return ';';
  return ',';
}

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

/**
 * Parses a CSV string into a 2D array of strings.
 *
 * Row 0 is the header row. All subsequent rows are data rows.
 * Returns an empty array if the input is empty.
 *
 * @param text  Full CSV text (already decoded from the file).
 * @param opts  Optional configuration.
 * @returns     string[][] — rows of cells (header included at index 0).
 * @throws      CsvParseError on size, row-count, or format violations.
 */
export function parseCsv(text: string, opts: ParseCsvOptions = {}): string[][] {
  const { maxBytes = 5_000_000, maxRows = 200_000 } = opts;

  // Size check — Buffer.byteLength for accurate UTF-8 byte count
  // In React Native we don't have Node's Buffer, but globalThis.Buffer may exist.
  // Fall back to a conservative approximation (charCodeAt > 127 → 2 bytes).
  let byteLen: number;
  if (typeof Buffer !== 'undefined') {
    byteLen = Buffer.byteLength(text, 'utf8');
  } else {
    // Approximate: count multi-byte chars
    let b = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      b += c < 128 ? 1 : c < 2048 ? 2 : 3;
    }
    byteLen = b;
  }

  if (byteLen > maxBytes) {
    throw new CsvParseError('too-large', `CSV exceeds ${maxBytes} byte limit (${byteLen} bytes)`);
  }

  if (text.length === 0) return [];

  // Find first non-empty line for delimiter detection
  const firstNewline = text.indexOf('\n');
  const firstLine = firstNewline >= 0 ? text.slice(0, firstNewline) : text;
  const delim: string = opts.delimiter ?? detectDelimiter(firstLine);

  // State machine
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let rowCount = 0;

  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i]!;

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: doubled double-quote → escaped quote
        if (i + 1 < len && text[i + 1] === '"') {
          currentCell += '"';
          i++; // skip the second quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r') {
        // CRLF — consume the \n on the next iteration
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
        rowCount++;
        if (rowCount > maxRows) {
          throw new CsvParseError('too-many-rows', `CSV exceeds ${maxRows} row limit`);
        }
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
        rowCount++;
        if (rowCount > maxRows) {
          throw new CsvParseError('too-many-rows', `CSV exceeds ${maxRows} row limit`);
        }
      } else {
        currentCell += ch;
      }
    }
  }

  // EOF: if we ended in an open quote, the file is malformed
  if (inQuotes) {
    throw new CsvParseError('malformed', 'Unbalanced quotes at end of file');
  }

  // Flush the last row (even if it has no trailing newline)
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}
