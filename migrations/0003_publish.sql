-- Publishing + rollback: a project points at the build currently "live". The
-- published build is served at /site/:projectId/ (the v1 production surface;
-- a per-client subdomain via Cloudflare for SaaS is a later, escalation-gated
-- step). Rollback = repoint published_build_id at an earlier build.

ALTER TABLE projects ADD COLUMN published_build_id TEXT REFERENCES builds(id);
