import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { BYMA_EQUITY_URL, fetchT } from "@plata-today/shared";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface ScreenerRow {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  price: number | null;
  change: number | null;
  opening_price: number | null;
  previous_close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  eps: number | null;
  dividend_yield: number | null;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  recommendation_key: string | null;
}

const SCREENER_SQL = `
  SELECT
    sp.symbol,
    COALESCE(sc.name, sp.symbol) AS name,
    sc.sector,
    sc.industry,
    sp.price,
    sp.variation AS change,
    sp.opening_price,
    sp.previous_close,
    sp.high,
    sp.low,
    sp.volume,
    sf.market_cap,
    sf.trailing_pe,
    sf.forward_pe,
    sf.eps,
    sf.dividend_yield,
    sf.beta,
    sf.fifty_two_week_high,
    sf.fifty_two_week_low,
    sf.recommendation_key
  FROM stock_prices sp
  LEFT JOIN stock_companies sc ON sp.symbol = sc.symbol
  LEFT JOIN stock_fundamentals sf ON sp.symbol = sf.symbol
    AND sf.id = (
      SELECT id FROM stock_fundamentals sf2
      WHERE sf2.symbol = sp.symbol
      ORDER BY sf2.fetched_at DESC LIMIT 1
    )
  WHERE sp.id IN (
    SELECT MAX(id) FROM stock_prices GROUP BY symbol
  )
  ORDER BY COALESCE(sf.market_cap, 0) DESC
`;

// Hardcoded fallback names for BYMA symbols
const STOCK_NAMES: Record<string, string> = {
  ALUA: "Aluar Aluminio", BBAR: "BBVA Argentina", BMA: "Banco Macro",
  BYMA: "Bolsas y Mercados Arg.", CEPU: "Central Puerto",
  COME: "Soc. Comercial del Plata", CRES: "Cresud", CELU: "Celulosa Argentina",
  CVH: "Cablevision Holding", EDN: "Edenor", GGAL: "Grupo Fin. Galicia",
  HARG: "Holcim Argentina", LOMA: "Loma Negra", MIRG: "Mirgor",
  PAMP: "Pampa Energía", SUPV: "Grupo Supervielle", TECO2: "Telecom Argentina",
  TGNO4: "Transp. Gas del Norte", TGSU2: "Transp. Gas del Sur",
  TRAN: "Transener", TXAR: "Ternium Argentina", VALO: "Grupo Fin. Valores",
  YPFD: "YPF", METR: "MetroGAS", IRSA: "IRSA Inversiones",
  AGRO: "Agrometal", DGCU2: "Distrib. Gas Cuyana", RICH: "S.A. San Miguel",
  SEMI: "Molinos Río de la Plata", MOLI: "Molinos Agro", LONG: "Longvie",
  FERR: "Ferrum", BOLT: "Boldt", BHIP: "Banco Hipotecario",
  BPAT: "Banco Patagonia", CAPX: "Capex", CGPA2: "Camuzzi Gas Pampeana",
  GCLA: "Grupo Clarín", LEDE: "Ledesma", CTIO: "Consultatio",
  HAVA: "Havanna",
};

const STOCK_MCAP: Record<string, number> = {
  YPFD: 16000, GGAL: 8500, BMA: 5200, BBAR: 4500, PAMP: 4200,
  TECO2: 3500, CEPU: 3200, TXAR: 3000, TGSU2: 2500, LOMA: 1800,
  SUPV: 1600, TRAN: 1500, ALUA: 1500, EDN: 1200, CRES: 1100,
  BYMA: 1000, VALO: 900, TGNO4: 850, IRSA: 800, COME: 500,
  METR: 450, MIRG: 400, HARG: 350, BPAT: 320, CVH: 300,
  BHIP: 250, CAPX: 200, CTIO: 180, LEDE: 170, BOLT: 150,
  GCLA: 140, CGPA2: 130, GBAN: 120, CELU: 110, MOLI: 100,
  SEMI: 90, RICH: 80, AGRO: 70, CADO: 60, DGCU2: 55,
  HAVA: 50, LONG: 40, FERR: 35, MORI: 30, RIGO: 25,
};

function tryDb(): ScreenerRow[] | null {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = db.prepare(SCREENER_SQL).all() as ScreenerRow[];
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

async function fetchByma(): Promise<any[]> {
  const res = await fetchT(BYMA_EQUITY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`BYMA ${res.status}`);
  const json: any = await res.json();
  if (!json?.data) throw new Error("No data");
  return json.data;
}

export const GET: APIRoute = async () => {
  try {
    // Try DB first
    const dbRows = tryDb();
    if (dbRows) {
      return new Response(JSON.stringify(dbRows), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120",
          ...CORS_HEADERS,
        },
      });
    }

    // Fallback to BYMA
    const raw = await fetchByma();
    const seen = new Set<string>();
    const stocks = raw
      .map((s: any) => {
        const symbol = (s.symbol ?? "").replace(".BA", "");
        if (!symbol || seen.has(symbol)) return null;
        seen.add(symbol);
        const variation = s.variation ?? s.variacionPorcentual ?? null;
        return {
          symbol,
          name: STOCK_NAMES[symbol] ?? s.description ?? symbol,
          sector: null,
          industry: null,
          price: s.price ?? s.ultimoPrecio ?? null,
          change: variation != null ? variation / 100 : null,
          opening_price: s.openingPrice ?? s.apertura ?? null,
          previous_close: s.previousClosingPrice ?? s.anteriorCierre ?? null,
          high: s.highPrice ?? s.maximo ?? null,
          low: s.lowPrice ?? s.minimo ?? null,
          volume: s.volume ?? s.volumenNominal ?? 0,
          market_cap: STOCK_MCAP[symbol] ? STOCK_MCAP[symbol] * 1e6 : null,
          trailing_pe: null,
          forward_pe: null,
          eps: null,
          dividend_yield: null,
          beta: null,
          fifty_two_week_high: null,
          fifty_two_week_low: null,
          recommendation_key: null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.market_cap ?? 0) - (a.market_cap ?? 0));

    return new Response(JSON.stringify(stocks), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Failed to fetch screener data" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
