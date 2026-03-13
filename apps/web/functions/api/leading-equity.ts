// Cloudflare Pages Function — GET /api/leading-equity
// Proxies BYMA leading-equity (panel líder stocks)

interface Env {}

const BYMA_URL = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestGet: PagesFunction<Env> = async () => {
  try {
    const res = await fetch(BYMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    });

    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error('No data from BYMA');

    const stocks = json.data.map((s: any) => ({
      symbol: s.symbol ?? s.denominacion ?? '',
      description: s.description ?? s.denominacion ?? '',
      price: s.price ?? s.ultimoPrecio ?? 0,
      variation: s.variation ?? s.variacionPorcentual ?? null,
      previousClose: s.previousClosingPrice ?? s.anteriorCierre ?? null,
      openingPrice: s.openingPrice ?? s.apertura ?? null,
      volume: s.volume ?? s.volumenNominal ?? 0,
      high: s.highPrice ?? s.maximo ?? null,
      low: s.lowPrice ?? s.minimo ?? null,
    }));

    // Sort by volume descending
    stocks.sort((a: any, b: any) => (b.volume ?? 0) - (a.volume ?? 0));

    return new Response(JSON.stringify(stocks), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Failed to fetch stocks' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
