/**
 * Telegram alerting for job failures and system warnings.
 *
 * Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

const failureCounts = new Map<string, number>();

export function resetFailureCount(jobName: string): void {
  failureCounts.set(jobName, 0);
}

export function recordFailure(jobName: string): number {
  const count = (failureCounts.get(jobName) ?? 0) + 1;
  failureCounts.set(jobName, count);
  return count;
}

export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `[plata.today] ${message}`,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[alerting] Telegram send failed:", err);
  }
}

/**
 * Record a job failure and send a Telegram alert after 3 consecutive failures.
 * Call resetFailureCount() on success.
 */
export async function alertOnFailure(jobName: string, error: unknown): Promise<void> {
  const count = recordFailure(jobName);
  if (count === 3) {
    await sendTelegramAlert(
      `<b>${jobName}</b> failed 3 times in a row.\n\nLast error: <code>${String(error).slice(0, 200)}</code>`,
    );
  }
}
