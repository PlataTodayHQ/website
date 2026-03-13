import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PipelineConfig {
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  databasePath: string;
  minImportanceScore: number;
  maxEventsPerRun: number;
  maxConcurrentApiCalls: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): PipelineConfig {
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is required");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const defaultDbPath = path.resolve(__dirname, "../../../data/plata.db");

  return {
    llmApiKey: apiKey,
    llmModel: process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-nano",
    llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    databasePath: process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : defaultDbPath,
    minImportanceScore: Number(process.env.MIN_IMPORTANCE_SCORE ?? "2.0"),
    maxEventsPerRun: Number(process.env.MAX_EVENTS_PER_RUN ?? "10"),
    maxConcurrentApiCalls: Number(process.env.MAX_CONCURRENT_API_CALLS ?? "5"),
    logLevel: (process.env.LOG_LEVEL as PipelineConfig["logLevel"]) ?? "info",
  };
}
