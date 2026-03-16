import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ url, redirect }) => {
  const lang = url.searchParams.get("lang") || "en";
  return redirect(`/${lang}/rss`, 301);
};
