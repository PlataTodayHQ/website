import { YAHOO_UA } from "./constants.js";
import { fetchT } from "./utils.js";

// Yahoo crumb cache for quoteSummary auth
let yahooCrumb: string | null = null;
let yahooCookie: string | null = null;
let crumbExpiry = 0;

export async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (yahooCrumb && yahooCookie && Date.now() < crumbExpiry) {
    return { crumb: yahooCrumb, cookie: yahooCookie };
  }
  const cookieRes = await fetchT("https://fc.yahoo.com", {
    headers: { "User-Agent": YAHOO_UA },
    redirect: "manual",
  });
  const setCookies = cookieRes.headers.getSetCookie?.() || [];
  const cookies = setCookies.map((c: string) => c.split(";")[0]).join("; ");
  const crumbRes = await fetchT(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    { headers: { "User-Agent": YAHOO_UA, Cookie: cookies } },
  );
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes("error")) throw new Error("Failed to get Yahoo crumb");
  yahooCrumb = crumb;
  yahooCookie = cookies;
  crumbExpiry = Date.now() + 30 * 60 * 1000;
  return { crumb, cookie: cookies };
}

export function numVal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "object" && "raw" in v) return v.raw ?? null;
  if (typeof v === "number") return v;
  return null;
}

export function strVal(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "object" && "fmt" in v) return v.fmt ?? null;
  if (typeof v === "string") return v;
  return null;
}
