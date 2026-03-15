const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
let minLevel: number = LEVELS.info;

export function setLogLevel(level: keyof typeof LEVELS): void {
  minLevel = LEVELS[level];
}

function emit(
  level: keyof typeof LEVELS,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (LEVELS[level] < minLevel) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),
};
