/**
 * BYMA Open Data session manager — ported from PyOBD.
 *
 * PyOBD initializes a session by visiting the BYMA dashboard to get cookies,
 * then sends requests with proper headers. This module replicates that pattern
 * in Node.js for more reliable BYMA API access.
 *
 * @see https://github.com/franco-lamas/PyOBD
 */

import { fetchT } from "./utils.js";

const BYMA_BASE = "https://open.bymadata.com.ar";
const BYMA_DASHBOARD = `${BYMA_BASE}/#/dashboard`;

const BYMA_HEADERS: Record<string, string> = {
  Connection: "keep-alive",
  "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="96"',
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  "sec-ch-ua-mobile": "?0",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
  "sec-ch-ua-platform": '"Windows"',
  Origin: BYMA_BASE,
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  Referer: `${BYMA_BASE}/`,
  "Accept-Language": "es-US,es-419;q=0.9,es;q=0.8,en;q=0.7",
};

/** Max age before session cookies are refreshed (25 minutes). */
const SESSION_MAX_AGE = 25 * 60 * 1000;

let sessionCookies: string | null = null;
let sessionInitAt = 0;

/**
 * Initialize BYMA session by fetching dashboard cookies.
 * Reuses cached cookies if they're less than 25 minutes old.
 */
async function ensureSession(): Promise<string> {
  if (sessionCookies && Date.now() - sessionInitAt < SESSION_MAX_AGE) {
    return sessionCookies;
  }

  try {
    const res = await fetchT(BYMA_DASHBOARD, {
      headers: { "User-Agent": BYMA_HEADERS["User-Agent"] },
      redirect: "manual",
      timeout: 15_000,
    });

    // Extract Set-Cookie headers
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      // Parse cookie names/values, drop attributes
      sessionCookies = setCookieHeader
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .filter((c) => c.includes("="))
        .join("; ");
    } else {
      sessionCookies = "";
    }

    sessionInitAt = Date.now();
    return sessionCookies;
  } catch {
    // If session init fails, proceed without cookies (matches old behavior)
    sessionCookies = "";
    sessionInitAt = Date.now();
    return sessionCookies;
  }
}

/**
 * Make a POST request to BYMA with session cookies and proper headers.
 * This is the authenticated version of fetchBYMA() — more reliable.
 */
export async function fetchBYMASession(
  url: string,
  body: Record<string, unknown> = {},
): Promise<any[]> {
  const cookies = await ensureSession();

  const headers: Record<string, string> = { ...BYMA_HEADERS };
  if (cookies) headers.Cookie = cookies;

  const res = await fetchT(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`BYMA session ${res.status}`);
  const json: any = await res.json();
  if (!json?.data) throw new Error("BYMA session: no data");
  return json.data;
}

/**
 * Make a GET request to BYMA with session cookies and proper headers.
 */
export async function fetchBYMASessionGet(
  url: string,
  params?: Record<string, string>,
): Promise<any> {
  const cookies = await ensureSession();

  const headers: Record<string, string> = { ...BYMA_HEADERS };
  if (cookies) headers.Cookie = cookies;

  let fullUrl = url;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    fullUrl = `${url}?${qs}`;
  }

  const res = await fetchT(fullUrl, { headers });
  if (!res.ok) throw new Error(`BYMA session GET ${res.status}`);
  return res.json();
}

/** Reset the session (e.g., on auth errors). */
export function resetBYMASession(): void {
  sessionCookies = null;
  sessionInitAt = 0;
}
