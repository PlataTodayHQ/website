export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_TIMEOUT = 10_000; // 10 seconds

/**
 * Fetch with an AbortController timeout. Prevents hanging on unresponsive APIs.
 */
export function fetchT(
  url: string | URL,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...rest, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}
