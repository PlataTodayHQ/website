import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { IImageStorage } from "../../ports/image-storage.js";
import { log } from "@plata-today/shared";

const TIMEOUT_MS = 10_000;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

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

export interface S3Config {
  bucket: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
  region: string;
}

export class S3ImageStorage implements IImageStorage {
  private client: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;
  private localDir: string;

  constructor(config: S3Config, localDir?: string) {
    this.localDir = localDir ?? path.resolve(process.cwd(), "apps/web/public/images/news");
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl || `https://${config.endpoint}/${config.bucket}`;

    if (config.bucket && config.endpoint && config.accessKey && config.secretKey) {
      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint.startsWith("http")
          ? config.endpoint
          : `https://${config.endpoint}`,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
        forcePathStyle: true,
      });
      log.info("S3 configured for image storage", { bucket: this.bucket });
    } else {
      log.info("S3 not configured — using local filesystem for images");
    }
  }

  async download(imageUrl: string): Promise<string | null> {
    try {
      const hash = crypto
        .createHash("sha256")
        .update(imageUrl)
        .digest("hex")
        .slice(0, 16);

      // Check if already exists
      if (this.client) {
        const existing = await this.findExistingS3(hash);
        if (existing) return existing;
      } else {
        const existing = this.findExistingLocal(hash);
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
        log.debug("Image download failed", { url: imageUrl, status: response.status });
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
        log.debug("Image too large after download", { url: imageUrl, size: buffer.length });
        return null;
      }

      const filename = `${hash}${ext}`;

      if (this.client) {
        return await this.uploadToS3(filename, buffer, ext);
      }
      return this.saveLocally(filename, buffer, imageUrl);
    } catch (err) {
      log.debug("Image download error", { url: imageUrl, error: String(err) });
      return null;
    }
  }

  private async uploadToS3(filename: string, buffer: Buffer, ext: string): Promise<string> {
    const key = `images/news/${filename}`;
    const ct = CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: ct,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const publicUrl = `${this.publicUrl}/${key}`;
    log.debug("Image uploaded to S3", { key, url: publicUrl });
    return publicUrl;
  }

  private async findExistingS3(hash: string): Promise<string | null> {
    const extensions = [".jpg", ".png", ".webp", ".gif", ".avif"];
    for (const ext of extensions) {
      const key = `images/news/${hash}${ext}`;
      try {
        await this.client!.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const url = `${this.publicUrl}/${key}`;
        log.debug("Image already exists in S3", { key });
        return url;
      } catch {
        // not found, continue
      }
    }
    return null;
  }

  private saveLocally(filename: string, buffer: Buffer, imageUrl: string): string {
    fs.mkdirSync(this.localDir, { recursive: true });
    const filepath = path.join(this.localDir, filename);
    fs.writeFileSync(filepath, buffer);
    const publicPath = `/images/news/${filename}`;
    log.debug("Image saved locally", { url: imageUrl, path: publicPath });
    return publicPath;
  }

  private findExistingLocal(hash: string): string | null {
    if (!fs.existsSync(this.localDir)) return null;
    const files = fs.readdirSync(this.localDir);
    const match = files.find((f) => f.startsWith(hash));
    return match ? `/images/news/${match}` : null;
  }
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
