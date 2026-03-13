import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(
  __dirname,
  "../../../../apps/web/public/images/news",
);

const TIMEOUT_MS = 10_000;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/**
 * Download an image from a URL, save to public/images/news/, return the
 * site-relative path (e.g. "/images/news/abc123.jpg").
 *
 * Returns null if download fails — caller should fall back to original URL.
 */
export async function downloadImage(
  imageUrl: string,
): Promise<string | null> {
  try {
    // Hash the URL for a stable, unique filename
    const hash = crypto
      .createHash("sha256")
      .update(imageUrl)
      .digest("hex")
      .slice(0, 16);

    // Check if already downloaded (any extension)
    const existing = findExistingFile(hash);
    if (existing) return existing;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "PlataTodayBot/1.0" },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      log.debug("Image download failed", {
        url: imageUrl,
        status: response.status,
      });
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const ext = EXTENSION_MAP[contentType] ?? extFromUrl(imageUrl) ?? ".jpg";

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_SIZE_BYTES) {
      log.debug("Image too large, skipping", { url: imageUrl, contentLength });
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_SIZE_BYTES) {
      log.debug("Image too large after download", {
        url: imageUrl,
        size: buffer.length,
      });
      return null;
    }

    fs.mkdirSync(IMAGES_DIR, { recursive: true });

    const filename = `${hash}${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const publicPath = `/images/news/${filename}`;
    log.debug("Image downloaded", { url: imageUrl, path: publicPath });
    return publicPath;
  } catch (err) {
    log.debug("Image download error", {
      url: imageUrl,
      error: String(err),
    });
    return null;
  }
}

function findExistingFile(hash: string): string | null {
  if (!fs.existsSync(IMAGES_DIR)) return null;
  const files = fs.readdirSync(IMAGES_DIR);
  const match = files.find((f) => f.startsWith(hash));
  return match ? `/images/news/${match}` : null;
}

function extFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {}
  return null;
}
