/**
 * Keyword-based category pre-detection for articles arriving without
 * a category from their RSS feed. Provides a hint to improve clustering
 * and initial category assignment before the LLM triage step.
 *
 * This is intentionally conservative — it's better to return null than
 * to miscategorize. The LLM triage will make the final decision.
 */

import type { Category } from "@plata-today/shared";

interface CategoryPattern {
  category: Category;
  /** Keywords that strongly indicate this category when found in title or URL */
  keywords: RegExp;
}

const PATTERNS: CategoryPattern[] = [
  {
    category: "economy",
    keywords: /\b(dólar|dolar|inflación|inflacion|BCRA|cepo|devaluaci|riesgo país|riesgo pais|tipo de cambio|cotizaci|mercados|bonos|acciones|Merval|FMI|IMF|presupuesto|recaudaci|déficit|deficit|superávit|superavit|exportaci|importaci|aranceles?|retenciones|impuesto|tarifas?|subsidio|YPF|Vaca Muerta|soja|trigo|maíz|maiz|cosecha|campo|agro|litio|petróleo|petroleo|gas natural|GNL|Mercado Libre|fintech|criptomoneda|bitcoin|salario|paritaria|empleo|desempleo|PIB|PBI|recesión|recesion)\b/i,
  },
  {
    category: "politics",
    keywords: /\b(presidente|Milei|Cristina|Macri|gobernador|intendente|diputado|senador|Congreso|legislatura|decreto|DNU|veto|elecciones?|ballotage|balotaje|candidato|campaña|campa[ñn]a electoral|oficialismo|oposición|oposicion|peronismo|kirchnerismo|PRO|UCR|libertario|gabinete|ministerio|ministro|canciller|embajador|AFIP|ARCA|reforma laboral|reforma previsional|ley bases|justicia federal|Corte Suprema|procurad|juicio político|juicio politico|indagatoria|imputad|procesad|causa judicial)\b/i,
  },
  {
    category: "sports",
    keywords: /\b(Boca|River|Racing|San Lorenzo|Independiente|Selección|seleccion argentina|AFA|Copa América|Copa America|Libertadores|Sudamericana|Liga Profesional|Superliga|gol|campeonato|torneo|clásico|clasico|Messi|Maradona|Pumas|rugby|UAR|ATP|WTA|tenis|Fórmula 1|formula 1|TC |Turismo Carretera|automovilismo|Colapinto|Copa Davis|Mundial)\b/i,
  },
  {
    category: "society",
    keywords: /\b(educación|educacion|universidad|UBA|docentes|paro docente|PAMI|salud pública|salud publica|hospital|dengue|vacuna|epidemia|pandemia|seguridad|inseguridad|robo|crimen|homicidio|femicidio|violencia de género|violencia de genero|protesta|marcha|manifestación|manifestacion|tránsito|transito|subte|colectivo|transporte|vivienda|inmigración|inmigracion)\b/i,
  },
  {
    category: "world",
    keywords: /\b(Mercosur|bilateral|relaciones exteriores|cancillería|cancilleria|embajada|Naciones Unidas|ONU|G20|Unión Europea|Union Europea|Brasil|Chile|Uruguay|Paraguay|Bolivia|BRICS|tratado|acuerdo comercial|diplomátic|diplomatic)\b/i,
  },
  {
    category: "science",
    keywords: /\b(CONICET|científic|cientific|investigador|satélite|satelite|CONAE|inteligencia artificial|startup|tecnología|tecnologia|innovación|innovacion|medio ambiente|cambio climático|cambio climatico|contaminación|contaminacion|energía renovable|energia renovable|solar|eólica|eolica)\b/i,
  },
  {
    category: "culture",
    keywords: /\b(cine argentino|teatro|Colón|colon|museo|festival|tango|folklore|Mendoza.*vino|vino.*Mendoza|Malbec|gastronomía|gastronomia|turismo|temporada|premio.*liter|liter.*premio|Oscar|Emmy|Netflix.*argentin|argentin.*Netflix)\b/i,
  },
];

/**
 * Infer a category from article title and URL when RSS feed doesn't provide one.
 * Returns null if no strong signal is found — the LLM will decide later.
 */
export function inferCategoryFromText(title: string, url: string): Category | null {
  const text = `${title} ${url}`;

  for (const { category, keywords } of PATTERNS) {
    if (keywords.test(text)) {
      return category;
    }
  }

  // URL path patterns (e.g., /economia/, /politica/, /deportes/)
  const urlLower = url.toLowerCase();
  if (/\/(econom|finanz|mercado)/.test(urlLower)) return "economy";
  if (/\/(politic|gobierno|congreso)/.test(urlLower)) return "politics";
  if (/\/(deport|futbol|football)/.test(urlLower)) return "sports";
  if (/\/(sociedad|salud|educac|seguridad)/.test(urlLower)) return "society";
  if (/\/(mundo|internacion|global)/.test(urlLower)) return "world";
  if (/\/(tecnolog|ciencia|innovac)/.test(urlLower)) return "science";
  if (/\/(cultur|espectacul|turism|cine)/.test(urlLower)) return "culture";

  return null;
}
