import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';
import { Unauthorized } from '../lib/errors';

// v1 auth: a single operator (Jeremy) holds OPERATOR_TOKEN. Operator-only routes
// (project creation, admin views) require it via `Authorization: Bearer <token>`
// or an `sf_operator` cookie. Client-facing interview routes are instead gated
// by possession of an unguessable session id. Cloudflare Access / magic-link
// replaces this in a later phase — see docs/decisions.md.

function extractToken(header: string | undefined, cookie: string | undefined): string | null {
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  if (cookie) {
    const match = /(?:^|;\s*)sf_operator=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1]!);
  }
  return null;
}

/** Constant-time-ish string compare to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const requireOperator = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const expected = c.env.OPERATOR_TOKEN;
  if (!expected) {
    // Fail closed: an unset token must not mean "open to everyone".
    throw new Unauthorized('Operator access is not configured (OPERATOR_TOKEN unset).');
  }
  const provided = extractToken(c.req.header('authorization'), c.req.header('cookie'));
  if (!provided || !safeEqual(provided, expected)) {
    throw new Unauthorized();
  }
  await next();
});
