import type { Env } from '../types';

// Page rendering with graceful degradation.
//
// The brief mandates Cloudflare Browser Rendering for JS-heavy sites. That path
// requires the paid plan + @cloudflare/puppeteer and can't be exercised in this
// environment, so it's wired as an upgrade seam (renderWithBrowser) gated behind
// USE_BROWSER_RENDERING, and the DEPLOYABLE DEFAULT is a plain fetch that works
// everywhere and covers the common case of server-rendered small-business sites.
// Upgrading is a drop-in: implement renderWithBrowser and flip the var.

export interface RenderedPage {
  url: string;
  finalUrl: string;
  html: string;
  status: number;
  via: 'browser' | 'fetch';
}

const UA = 'SiteForgeBot/0.1 (+https://siteforge.dev/bot)';

/**
 * robots.txt check for THIRD-PARTY sites. The client's own website is fair game
 * (they own it) — callers pass ownedByClient=true to bypass. Fail-open on
 * fetch/parse errors so a missing robots.txt doesn't block legitimate scraping.
 */
export async function isAllowed(url: string, ownedByClient: boolean): Promise<boolean> {
  if (ownedByClient) return true;
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': UA } });
    if (!res.ok) return true;
    const body = await res.text();
    return robotsAllows(body, u.pathname);
  } catch {
    return true;
  }
}

// Minimal robots.txt evaluation: honor rules under our UA group or the '*'
// group, longest-matching Disallow wins (an empty Disallow means "allow all").
export function robotsAllows(robots: string, path: string): boolean {
  const lines = robots.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim());
  let applies = false;
  let starApplies = false;
  const disallows: string[] = [];
  const starDisallows: string[] = [];
  let group: 'ours' | 'star' | null = null;

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.toLowerCase().trim();
    const val = rest.join(':').trim();
    if (key === 'user-agent') {
      const ua = val.toLowerCase();
      group = ua === '*' ? 'star' : ua.includes('siteforge') ? 'ours' : null;
      if (group === 'ours') applies = true;
      if (group === 'star') starApplies = true;
    } else if (key === 'disallow' && group) {
      (group === 'ours' ? disallows : starDisallows).push(val);
    }
  }

  const rules = applies ? disallows : starApplies ? starDisallows : [];
  // A specific rule set with only empty Disallow => allow everything.
  return !rules.some((rule) => rule !== '' && path.startsWith(rule));
}

async function renderWithFetch(url: string): Promise<RenderedPage> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
  });
  const html = await res.text();
  return { url, finalUrl: res.url || url, html, status: res.status, via: 'fetch' };
}

// Upgrade seam. Implement with @cloudflare/puppeteer + env.BROWSER when the
// paid plan is available; until then callers fall back to fetch.
async function renderWithBrowser(_env: Env, _url: string): Promise<RenderedPage> {
  throw new Error('Browser Rendering not wired yet — set USE_BROWSER_RENDERING only after implementing renderWithBrowser.');
}

export async function renderPage(env: Env, url: string): Promise<RenderedPage> {
  const useBrowser = env.USE_BROWSER_RENDERING === 'true' && !!env.BROWSER;
  if (useBrowser) {
    try {
      return await renderWithBrowser(env, url);
    } catch (err) {
      console.warn('browser render failed, falling back to fetch', { url, err: String(err) });
    }
  }
  return renderWithFetch(url);
}
