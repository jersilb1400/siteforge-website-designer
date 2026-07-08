#!/usr/bin/env bash
# Provision SiteForge's Cloudflare resources under YOUR account, then print the
# binding IDs to paste into wrangler.toml. Idempotent-ish: re-running create on
# an existing resource is a no-op error you can ignore.
#
# Prereqs: `npm install` done, and you are logged in (`npx wrangler login`) or
# have CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID exported.
#
# Nothing here is secret. API keys are set separately (see the tail of this file).

set -euo pipefail

echo "==> SiteForge Cloudflare provisioning"
echo

echo "--> D1 database (siteforge-db)"
npx wrangler d1 create siteforge-db || true
echo

echo "--> KV namespace (KV)"
npx wrangler kv namespace create KV || true
echo

echo "--> R2 bucket (siteforge-assets)"
npx wrangler r2 bucket create siteforge-assets || true
echo

echo "--> Queues (siteforge-ingest + DLQ)"
npx wrangler queues create siteforge-ingest || true
npx wrangler queues create siteforge-ingest-dlq || true
echo

cat <<'NOTE'
==> Next steps
1. Copy the IDs printed above into wrangler.toml:
     - database_id under [[d1_databases]]
     - id under [[kv_namespaces]]
   (R2 bucket + Queues bind by name, no ID needed.)

2. Apply the database schema:
     npm run db:remote        # remote D1
     npm run db:local         # or local, for `wrangler dev`

3. Set secrets (never commit these):
     npx wrangler secret put ANTHROPIC_API_KEY
     npx wrangler secret put OPERATOR_TOKEN

4. Verify locally, then deploy:
     npm run typecheck
     npx wrangler deploy --dry-run
     npm run deploy
NOTE
