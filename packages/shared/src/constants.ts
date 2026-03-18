export const BLUELYTICS_URL = "https://api.bluelytics.com.ar/v2/latest";
export const BLUELYTICS_EVOLUTION_URL = "https://api.bluelytics.com.ar/v2/evolution.json?days=30";
export const BYMA_BASE_URL = "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free";
export const BYMA_INDEX_URL = `${BYMA_BASE_URL}/index-price`;
export const BYMA_EQUITY_URL = `${BYMA_BASE_URL}/leading-equity`;
export const BYMA_GENERAL_EQUITY_URL = `${BYMA_BASE_URL}/general-equity`;
export const BYMA_CEDEARS_URL = `${BYMA_BASE_URL}/cedears`;
export const BYMA_CEDEARS_FALLBACK_URL = `${BYMA_BASE_URL}/nyse-nasdaq-cedears`;
export const BYMA_PUBLIC_BONDS_URL = `${BYMA_BASE_URL}/public-bonds`;
export const BYMA_CORPORATE_BONDS_URL = `${BYMA_BASE_URL}/negociable-obligations`;
export const BYMA_LETRAS_URL = `${BYMA_BASE_URL}/lebacs`;

export const YAHOO_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// BCRA public API
export const BCRA_API_BASE = "https://api.bcra.gob.ar";
export const BCRA_RATE_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/6/ultimo`; // Tasa de política monetaria
export const BCRA_RESERVES_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/1/ultimo`; // Reservas internacionales
export const BCRA_MONETARY_BASE_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/15/ultimo`; // Base monetaria
export const BCRA_PLAZO_FIJO_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/34/ultimo`; // TNA plazo fijo 30d
export const BCRA_BADLAR_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/7/ultimo`; // BADLAR
export const BCRA_CER_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/27/ultimo`; // CER
export const BCRA_UVA_URL = `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/31/ultimo`; // UVA

// Country risk (Ámbito Financiero)
export const AMBITO_COUNTRY_RISK_URL = "https://mercados.ambito.com/riesgopais/datos";

// BCRA series for historical data (last 365 days)
export function bcraSeriesUrl(variableId: number, days: number = 365): string {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${BCRA_API_BASE}/estadisticas/v2.0/DatosVariable/${variableId}/${fmt(from)}/${fmt(to)}`;
}
