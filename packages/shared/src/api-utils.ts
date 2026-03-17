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

/**
 * JSON success response with Cache-Control.
 * Uses s-maxage for Cloudflare edge caching and stale-while-revalidate for smooth updates.
 */
export function jsonResponse(data: unknown, maxAge = 60, swr?: number): Response {
  const swrValue = swr ?? maxAge * 2;
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${swrValue}`,
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
