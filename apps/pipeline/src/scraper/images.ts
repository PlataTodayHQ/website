import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { log } from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_IMAGES_DIR = path.resolve(
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

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

let s3Client: S3Client | null = null;
let s3Bucket = "";
let s3PublicUrl = "";

export function configureS3(config: {
  s3Bucket: string;
  s3Endpoint: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3PublicUrl: string;
  s3Region: string;
}): void {
  if (!config.s3Bucket || !config.s3Endpoint || !config.s3AccessKey || !config.s3SecretKey) {
    log.info("S3 not configured — using local filesystem for images");
    return;
  }

  s3Client = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint.startsWith("http")
      ? config.s3Endpoint
      : `https://${config.s3Endpoint}`,
    credentials: {
      accessKeyId: config.s3AccessKey,
      secretAccessKey: config.s3SecretKey,
    },
    forcePathStyle: true,
  });
  s3Bucket = config.s3Bucket;
  s3PublicUrl = config.s3PublicUrl || `https://${config.s3Endpoint}/${config.s3Bucket}`;
  log.info("S3 configured for image storage", { bucket: s3Bucket });
}

/**
 * Download an image from a URL, upload to S3 (or save locally as fallback),
 * return the public URL.
 *
 * Returns null if download fails — caller should fall back to original URL.
 */
export async function downloadImage(
  imageUrl: string,
): Promise<string | null> {
  try {
    const hash = crypto
      .createHash("sha256")
      .update(imageUrl)
      .digest("hex")
      .slice(0, 16);

    // Check if already exists
    if (s3Client) {
      const existing = await findExistingS3(hash);
      if (existing) return existing;
    } else {
      const existing = findExistingLocal(hash);
      if (existing) return existing;
    }

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

    const filename = `${hash}${ext}`;

    if (s3Client) {
      return await uploadToS3(filename, buffer, ext);
    } else {
      return saveLocally(filename, buffer, imageUrl);
    }
  } catch (err) {
    log.debug("Image download error", {
      url: imageUrl,
      error: String(err),
    });
    return null;
  }
}

async function uploadToS3(
  filename: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const key = `images/news/${filename}`;
  const ct = CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";

  await s3Client!.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: ct,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicUrl = `${s3PublicUrl}/${key}`;
  log.debug("Image uploaded to S3", { key, url: publicUrl });
  return publicUrl;
}

async function findExistingS3(hash: string): Promise<string | null> {
  const extensions = [".jpg", ".png", ".webp", ".gif", ".avif"];
  for (const ext of extensions) {
    const key = `images/news/${hash}${ext}`;
    try {
      await s3Client!.send(
        new HeadObjectCommand({ Bucket: s3Bucket, Key: key }),
      );
      const url = `${s3PublicUrl}/${key}`;
      log.debug("Image already exists in S3", { key });
      return url;
    } catch {
      // not found, continue
    }
  }
  return null;
}

function saveLocally(
  filename: string,
  buffer: Buffer,
  imageUrl: string,
): string {
  fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true });
  const filepath = path.join(LOCAL_IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  const publicPath = `/images/news/${filename}`;
  log.debug("Image saved locally", { url: imageUrl, path: publicPath });
  return publicPath;
}

function findExistingLocal(hash: string): string | null {
  if (!fs.existsSync(LOCAL_IMAGES_DIR)) return null;
  const files = fs.readdirSync(LOCAL_IMAGES_DIR);
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
