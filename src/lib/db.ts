import type { Env } from '../types';

// Thin, typed helpers over D1's prepared-statement API. These exist so route
// code reads as intent ("get one project") rather than boilerplate, and so the
// JSON-column convention (value_json etc.) is decoded in exactly one place.

/** Run a query returning a single row, or null. */
export async function one<T>(
  env: Env,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = env.DB.prepare(sql).bind(...params);
  return (await stmt.first<T>()) ?? null;
}

/** Run a query returning all rows. */
export async function all<T>(
  env: Env,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = env.DB.prepare(sql).bind(...params);
  const { results } = await stmt.all<T>();
  return results ?? [];
}

/** Run a write (INSERT/UPDATE/DELETE). Returns D1's run metadata. */
export async function run(
  env: Env,
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  return env.DB.prepare(sql).bind(...params).run();
}

/** Execute a set of statements atomically via D1 batch. */
export async function batch(
  env: Env,
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<D1Result[]> {
  const prepared = statements.map((s) =>
    env.DB.prepare(s.sql).bind(...(s.params ?? [])),
  );
  return env.DB.batch(prepared);
}

/** Current ISO-8601 UTC timestamp (millis precision), matching the schema DEFAULT. */
export function now(): string {
  return new Date().toISOString();
}
