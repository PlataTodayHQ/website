/**
 * Run async tasks with a concurrency limit.
 * Processes items from the array, keeping up to `limit` tasks in flight.
 * Respects graceful shutdown — stops starting new items when shutdown is requested.
 */

let _shuttingDown = false;

export function requestShutdown(): void {
  _shuttingDown = true;
}

export function isShuttingDown(): boolean {
  return _shuttingDown;
}

export async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number,
): Promise<void> {
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    if (_shuttingDown) break;

    const p = fn(item).then(
      () => { executing.delete(p); },
      () => { executing.delete(p); },
    );
    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
