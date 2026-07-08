// Cloudflare binding surface for the SiteForge Worker.
// Keep this in sync with wrangler.toml. `wrangler types` can regenerate a
// worker-configuration.d.ts, but we hand-maintain Env so the app has one
// authoritative, documented shape.

export interface Env {
  // Static assets (dashboard + preview sites).
  ASSETS: Fetcher;

  // D1: relational store (see migrations/).
  DB: D1Database;

  // KV: sessions, scrape cache, rate limiting.
  KV: KVNamespace;

  // R2: site bundles, scraped assets, backups.
  R2: R2Bucket;

  // Queues: async scrape + build jobs (Phase 2+).
  INGEST_QUEUE: Queue<IngestJob>;

  // Workers AI: cheap classification fallback (Phase 2+).
  AI?: Ai;

  // Browser Rendering: render/extract existing sites (Phase 2).
  BROWSER?: Fetcher;

  // Vars (non-secret).
  ENVIRONMENT: string;
  ANTHROPIC_MODEL_SMART: string;
  ANTHROPIC_MODEL_CHEAP: string;
  // 'true' to route scraping through Browser Rendering (requires paid plan +
  // renderWithBrowser implemented); anything else uses the fetch fallback.
  USE_BROWSER_RENDERING?: string;

  // Secrets (wrangler secret put / .dev.vars).
  ANTHROPIC_API_KEY?: string;
  OPERATOR_TOKEN?: string;
}

// Hono variable map — values middleware attaches to the request context.
export interface Vars {
  requestId: string;
}

// Shape of a job pushed onto INGEST_QUEUE. Discriminated by `kind`.
export type IngestJob =
  | { kind: 'scrape_website'; projectId: string; url: string }
  | { kind: 'scrape_facebook'; projectId: string; url: string }
  | { kind: 'scrape_google_business'; projectId: string; query: string };
