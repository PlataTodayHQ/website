import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PipelineConfig {
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  databasePath: string;
  minImportanceScore: number;
  maxConcurrentApiCalls: number;
  logLevel: "debug" | "info" | "warn" | "error";
  s3Bucket: string;
  s3Endpoint: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3PublicUrl: string;
  s3Region: string;
}

function parsePositiveNum(val: string | undefined, fallback: number, name: string): number {
  const n = Number(val ?? String(fallback));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid value for ${name}: "${val}"`);
  }
  return n;
}

export function loadConfig(dbPath?: string): PipelineConfig {
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is required");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const defaultDbPath = path.resolve(__dirname, "../../../data/plata.db");

  const resolvedDbPath = dbPath
    ? path.resolve(dbPath)
    : process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : defaultDbPath;

  return {
    llmApiKey: apiKey,
    llmModel: process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-nano",
    llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    databasePath: resolvedDbPath,
    minImportanceScore: parsePositiveNum(process.env.MIN_IMPORTANCE_SCORE, 2.0, "MIN_IMPORTANCE_SCORE"),
    maxConcurrentApiCalls: parsePositiveNum(process.env.MAX_CONCURRENT_API_CALLS, 5, "MAX_CONCURRENT_API_CALLS"),
    logLevel: (process.env.LOG_LEVEL as PipelineConfig["logLevel"]) ?? "info",
    s3Bucket: process.env.S3_BUCKET ?? "",
    s3Endpoint: process.env.S3_ENDPOINT ?? "",
    s3AccessKey: process.env.S3_ACCESS_KEY ?? "",
    s3SecretKey: process.env.S3_SECRET_KEY ?? "",
    s3PublicUrl: process.env.S3_PUBLIC_URL ?? "",
    s3Region: process.env.S3_REGION ?? "eu-central-1",
  };
}
