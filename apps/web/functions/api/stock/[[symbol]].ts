// Cloudflare Pages Function — GET /api/stock/:symbol?range=1mo&interval=1d
// Proxies Yahoo Finance v8/chart API for individual Argentine stocks
// Simple direct fetch with User-Agent header (no cookie/crumb auth needed for v8/chart)

interface Env {}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'];
const VALID_INTERVALS = ['5m', '15m', '30m', '1h', '1d', '1wk', '1mo'];

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const onRequestGet: PagesFunction<Env> = async ({ params, request }) => {
  try {
    // Extract symbol from catch-all param
    const symbolParts = params.symbol;
    const rawSymbol = Array.isArray(symbolParts) ? symbolParts.join('/') : (symbolParts ?? '');

    if (!rawSymbol) {
      return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Validate symbol — allow alphanumeric, dots, hyphens, ^
    if (!/^[\w.\-^]+$/.test(rawSymbol)) {
      return new Response(JSON.stringify({ error: 'Invalid symbol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Append .BA for Buenos Aires exchange if not already suffixed and not an index (^)
    let symbol = rawSymbol;
    if (!symbol.startsWith('^') && !symbol.includes('.')) {
      symbol = symbol + '.BA';
    }

    const url = new URL(request.url);
    const range = VALID_RANGES.includes(url.searchParams.get('range') ?? '')
      ? url.searchParams.get('range')!
      : '1mo';
    const interval = VALID_INTERVALS.includes(url.searchParams.get('interval') ?? '')
      ? url.searchParams.get('interval')!
      : '1d';

    // Direct fetch — v8/chart works without auth from server-side with just User-Agent
    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    let res = await fetch(yahooUrl, { headers: { 'User-Agent': USER_AGENT } });

    // Fallback to query1 if query2 fails
    if (!res.ok) {
      const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      res = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT } });
    }

    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const json: any = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');

    const meta = result.meta ?? {};
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const closes = quote.close ?? [];
    const volumes = quote.volume ?? [];
    const highs = quote.high ?? [];
    const lows = quote.low ?? [];
    const opens = quote.open ?? [];

    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? null;

    const data = {
      symbol: rawSymbol,
      yahooSymbol: symbol,
      name: meta.shortName ?? meta.longName ?? rawSymbol,
      currency: meta.currency ?? 'ARS',
      price,
      previousClose: prev,
      variation: prev && prev > 0 ? (price - prev) / prev : null,
      timestamps,
      closes,
      volumes,
      highs,
      lows,
      opens,
    };

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Failed to fetch stock data' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
