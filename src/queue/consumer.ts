import type { Env, IngestJob } from '../types';
import { run } from '../lib/db';
import { id } from '../lib/id';

// Queue consumer for async ingestion jobs. Phase 2 implements the actual
// Browser Rendering scrape + extraction here; for Phase 0/1 this records the
// job so the wiring (producer -> queue -> consumer -> D1) is verifiable end to
// end, and failed messages retry per wrangler.toml's max_retries.

export async function handleQueue(
  batch: MessageBatch<IngestJob>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;
    try {
      await run(
        env,
        `INSERT INTO job_log (id, project_id, kind, status, detail_json)
         VALUES (?, ?, ?, 'queued', ?)`,
        id('job'),
        job.projectId,
        job.kind,
        JSON.stringify(job),
      );
      // TODO(Phase 2): dispatch on job.kind to the scrape/extract pipeline.
      message.ack();
    } catch (err) {
      // Let the queue retry; surface the reason in logs for observability.
      console.error('ingest job failed', { kind: job.kind, projectId: job.projectId, err: String(err) });
      message.retry();
    }
  }
}
