import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { one, all, run } from '../lib/db';
import { id } from '../lib/id';
import { BadRequest, NotFound } from '../lib/errors';
import {
  parseAnswers,
  nextQuestion,
  progress,
  resolveOptions,
  maybeFollowUp,
  buildProfile,
} from '../interview/engine';
import { questionById, type Question } from '../interview/questions';

// Client-facing interview flow. Gated by possession of the (unguessable)
// session id rather than the operator token — the operator hands a client their
// interview link and they self-serve.

export const interview = new Hono<{ Bindings: Env; Variables: Vars }>();

interface SessionRow {
  id: string;
  project_id: string;
  status: string;
  phase: string;
}

async function loadSession(c: { env: Env }, sessionId: string): Promise<SessionRow> {
  const session = await one<SessionRow>(
    c.env,
    'SELECT id, project_id, status, phase FROM interview_sessions WHERE id = ?',
    sessionId,
  );
  if (!session) throw new NotFound('interview session');
  return session;
}

async function loadAnswers(env: Env, sessionId: string) {
  const rows = await all<{ question_id: string; value_json: string }>(
    env,
    'SELECT question_id, value_json FROM interview_answers WHERE session_id = ?',
    sessionId,
  );
  return parseAnswers(rows);
}

// Serialize a question for the client, resolving any dynamic options and
// attaching sensible defaults (e.g. pre-checked industry pages).
async function presentQuestion(env: Env, q: Question, answers: Record<string, unknown>) {
  const options = await resolveOptions(env, q, answers);
  return {
    id: q.id,
    phase: q.phase,
    text: q.text,
    help: q.help ?? null,
    type: q.type,
    options: options ?? null,
    placeholder: q.placeholder ?? null,
    required: q.required,
    // For the pages multi-select, pre-select the suggested defaults.
    defaultValue: q.optionsFrom === 'industry_pages' ? options : null,
  };
}

// Current interview state: progress + the next question to ask (or done).
interview.get('/:sessionId', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  const answers = await loadAnswers(c.env, session.id);
  const q = nextQuestion(answers);

  return c.json({
    sessionId: session.id,
    status: q ? session.status : 'complete',
    progress: progress(answers),
    complete: q === null,
    question: q ? await presentQuestion(c.env, q, answers) : null,
  });
});

// Submit an answer, persist it (upsert), advance, return the next question.
interview.post('/:sessionId/answer', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  if (session.status === 'complete') throw new BadRequest('This interview is already complete.');

  const body = await c.req
    .json<{ questionId?: string; value?: unknown }>()
    .catch(() => ({}) as { questionId?: string; value?: unknown });
  const q = body.questionId ? questionById(body.questionId) : undefined;
  if (!q) throw new BadRequest('Unknown or missing questionId.');

  // Validate required answers are non-empty.
  const v = body.value;
  const empty =
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0);
  if (q.required && empty) throw new BadRequest(`"${q.text}" is required.`);

  const answerId = id('ans');
  await run(
    c.env,
    `INSERT INTO interview_answers (id, session_id, question_id, question_text, value_json, source)
     VALUES (?, ?, ?, ?, ?, 'user')
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET value_json = excluded.value_json,
                   question_text = excluded.question_text,
                   updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    answerId,
    session.id,
    q.id,
    q.text,
    JSON.stringify(v ?? null),
  );

  const answers = await loadAnswers(c.env, session.id);

  // Optional adaptive follow-up (e.g. thin story) — surfaced as guidance, not a
  // blocking question, so the deterministic flow stays predictable.
  const followUp = await maybeFollowUp(c.env, q, answers);

  const next = nextQuestion(answers);
  if (!next) {
    await run(
      c.env,
      `UPDATE interview_sessions SET status='complete', next_question_id=NULL,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      session.id,
    );
    await run(
      c.env,
      `UPDATE projects SET status='ingesting', industry = COALESCE(industry, ?), tone = COALESCE(tone, ?),
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      typeof answers['industry'] === 'string' ? answers['industry'] : null,
      typeof answers['tone'] === 'string' ? answers['tone'] : null,
      session.project_id,
    );
  } else {
    await run(
      c.env,
      `UPDATE interview_sessions SET next_question_id = ?, phase = ?,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      next.id,
      next.phase,
      session.id,
    );
  }

  return c.json({
    saved: true,
    followUp,
    progress: progress(answers),
    complete: next === null,
    question: next ? await presentQuestion(c.env, next, answers) : null,
  });
});

// The structured profile — the Phase 1 deliverable. Available once complete,
// but we allow reading a partial profile any time for the review UI.
interview.get('/:sessionId/profile', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  const answers = await loadAnswers(c.env, session.id);
  return c.json({
    sessionId: session.id,
    projectId: session.project_id,
    complete: nextQuestion(answers) === null,
    profile: buildProfile(answers),
  });
});
