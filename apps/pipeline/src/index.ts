export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL: string;
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log(`Cron trigger fired at ${new Date().toISOString()}`);
    // TODO: Implement pipeline
    // 1. Scrape RSS feeds
    // 2. Deduplicate articles
    // 3. Rewrite via Claude API
    // 4. Store in D1
  },

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Manual trigger for development
    if (url.pathname === "/trigger") {
      await this.scheduled({} as ScheduledController, env, ctx);
      return Response.json({ status: "triggered" });
    }

    return new Response("plata-today-pipeline", { status: 200 });
  },
};
