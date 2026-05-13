/**
 * SOLDI HTTP client — thin fetch wrapper with timeout, typed errors, and
 * token redaction in error messages.
 *
 * Security:
 * - Never logs request headers (tokens stay out of logs).
 * - Strips X-Token value from any thrown error message → "[redacted]".
 * - All errors surface as HttpError (status + bodyText), never raw exceptions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HttpOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  method?: 'GET' | 'POST';
  body?: string;
};

// ---------------------------------------------------------------------------
// HttpError
// ---------------------------------------------------------------------------

/**
 * Thrown when the server returns a non-2xx status, or when JSON parsing fails.
 * The message includes the status code. bodyText contains the raw response body
 * with any X-Token value redacted.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly bodyText: string;

  constructor(status: number, bodyText: string) {
    const redacted = redactToken(bodyText);
    super(`HTTP ${status}: ${redacted}`);
    this.name = 'HttpError';
    this.status = status;
    this.bodyText = redacted;
  }
}

// ---------------------------------------------------------------------------
// Token redaction
// ---------------------------------------------------------------------------

/**
 * Replaces X-Token header values with "[redacted]" in error strings.
 * Prevents monobank personal tokens from appearing in crash reports or logs.
 */
function redactToken(text: string): string {
  // Match patterns like: X-Token: <value>, "X-Token":"<value>", x-token=<value>
  return text.replace(
    /([Xx]-[Tt]oken["\s:=]+)[^\s,"'}]+/g,
    '$1[redacted]'
  );
}

// ---------------------------------------------------------------------------
// httpJson
// ---------------------------------------------------------------------------

/**
 * Fetches a JSON endpoint and returns the parsed response as type T.
 *
 * - Uses AbortController + setTimeout for timeout (default 10s).
 * - Throws HttpError for non-2xx responses.
 * - Throws HttpError (status 0) for JSON parse failures.
 * - Never logs headers — no X-Token header values in any output.
 *
 * @param url      Full URL to fetch.
 * @param opts     Options: headers, timeoutMs, method, body.
 * @returns        Parsed JSON response of type T.
 */
export async function httpJson<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  const { headers = {}, timeoutMs = 10_000, method = 'GET', body } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await globalThis.fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    throw new HttpError(0, redactToken(msg));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // If reading body fails, use empty string
    }
    throw new HttpError(response.status, bodyText);
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'JSON parse error';
    throw new HttpError(0, redactToken(msg));
  }
}
