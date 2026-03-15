/**
 * Source metadata for rendering enhanced source cards.
 * Maps source name → domain for favicon retrieval and linking.
 */

export interface SourceMeta {
  domain: string;
  color: string;
}

const SOURCE_META: Record<string, SourceMeta> = {
  "Infobae":            { domain: "infobae.com",          color: "#e53935" },
  "Clarín":             { domain: "clarin.com",           color: "#1565c0" },
  "La Nación":          { domain: "lanacion.com.ar",      color: "#1a1a1a" },
  "Ámbito Financiero":  { domain: "ambito.com",           color: "#0d47a1" },
  "El Cronista":        { domain: "cronista.com",         color: "#c62828" },
  "El Economista":      { domain: "eleconomista.com.ar",  color: "#2e7d32" },
  "iProfesional":       { domain: "iprofesional.com",     color: "#283593" },
  "Perfil":             { domain: "perfil.com",           color: "#d32f2f" },
  "Cadena 3":           { domain: "cadena3.com",          color: "#f57f17" },
  "Olé":                { domain: "ole.com.ar",           color: "#e65100" },
  "BAE Negocios":       { domain: "baenegocios.com",      color: "#00695c" },
  "La Política Online": { domain: "lapoliticaonline.com", color: "#4a148c" },
  "TyC Sports":         { domain: "tycsports.com",        color: "#0277bd" },
  "La Gaceta":          { domain: "lagaceta.com.ar",      color: "#1b5e20" },
  "Misiones Online":    { domain: "misionesonline.net",   color: "#33691e" },
  "El Día":             { domain: "eldia.com",            color: "#0d47a1" },
  "Página/12":          { domain: "pagina12.com.ar",      color: "#b71c1c" },
  "TN":                 { domain: "tn.com.ar",            color: "#e53935" },
};

export function getSourceMeta(name: string): SourceMeta | null {
  return SOURCE_META[name] ?? null;
}

export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
