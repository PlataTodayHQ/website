import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "@plata-today/shared";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_LENGTH = 50_000;

export interface ExtractedArticle {
  title: string;
  content: string;
  excerpt: string;
}

export async function extractFullText(
  url: string,
): Promise<ExtractedArticle | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PlataTodayBot/1.0; +https://plata.today)",
        Accept: "text/html",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      log.debug("Full-text fetch failed", { url, status: response.status });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      log.debug("Not HTML, skipping extraction", { url, contentType });
      return null;
    }

    const html = await response.text();

    // linkedom parse
    const { document } = parseHTML(html);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = new Readability(document as any, {
      charThreshold: 100,
    });

    const article = reader.parse();
    if (!article || !article.textContent) {
      log.debug("Readability could not extract article", { url });
      return null;
    }

    const content = article.textContent.trim().slice(0, MAX_BODY_LENGTH);

    if (content.length < 100) {
      log.debug("Extracted text too short", {
        url,
        length: content.length,
      });
      return null;
    }

    return {
      title: article.title ?? "",
      content,
      excerpt: article.excerpt ?? content.slice(0, 200),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      log.debug("Full-text fetch timed out", { url });
    } else {
      log.debug("Full-text extraction error", {
        url,
        error: String(err),
      });
    }
    return null;
  }
}
