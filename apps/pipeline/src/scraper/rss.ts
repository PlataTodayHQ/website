export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  imageUrl: string | null;
}

export async function fetchRSS(url: string): Promise<RSSItem[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "PlataTodayBot/1.0" },
  });

  if (!response.ok) {
    console.error(`Failed to fetch RSS from ${url}: ${response.status}`);
    return [];
  }

  const xml = await response.text();
  return parseRSS(xml);
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Simple regex-based RSS parser (no DOM parser in Workers)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");

    if (!title || !link) continue;

    items.push({
      title: decodeEntities(title),
      link,
      description: decodeEntities(extractTag(itemXml, "description") ?? ""),
      pubDate: extractTag(itemXml, "pubDate"),
      imageUrl:
        extractAttr(itemXml, "enclosure", "url") ??
        extractAttr(itemXml, "media:content", "url"),
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i",
  );
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string,
): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, ""); // strip HTML tags
}
