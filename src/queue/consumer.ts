import type { Env, IngestJob } from '../types';
import { ingestWebsite, ingestFacebook, ingestGoogleBusiness } from '../ingest/pipeline';

// Queue consumer for async ingestion jobs. Dispatches each message to the
// right pipeline step; on failure it calls retry() so the queue redelivers
// (up to max_retries in wrangler.toml, then the DLQ). Steps are idempotent —
// re-running replaces the still-pending source_content row.

export async function handleQueue(batch: MessageBatch<IngestJob>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;
    try {
      switch (job.kind) {
        case 'scrape_website':
          await ingestWebsite(env, job.projectId, job.url);
          break;
        case 'scrape_facebook':
          await ingestFacebook(env, job.projectId, job.url);
          break;
        case 'scrape_google_business':
          await ingestGoogleBusiness(env, job.projectId, job.query);
          break;
        default:
          // Exhaustiveness guard — unknown kinds are acked, not retried forever.
          console.error('unknown ingest job', { job });
      }
      message.ack();
    } catch (err) {
      console.error('ingest job failed', { kind: job.kind, projectId: job.projectId, err: String(err) });
      message.retry();
    }
  }
}
