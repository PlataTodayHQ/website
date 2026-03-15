/**
 * Shared API endpoint utilities — CORS headers, JSON responses, error handling.
 *
 * Eliminates duplication across all /api/* endpoints in apps/web.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Standard OPTIONS preflight response. */
export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** JSON success response with Cache-Control. */
export function jsonResponse(data: unknown, maxAge = 60): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${maxAge}`,
      ...CORS_HEADERS,
    },
  });
}

/** JSON error response (502 by default). */
export function errorResponse(message: string, status = 502): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
