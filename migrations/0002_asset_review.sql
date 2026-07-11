-- Per-asset review gate (content ethics): scraped images must be individually
-- approved before they can be baked into a generated/deployed bundle. Confirming
-- a text source_content row must NOT implicitly consent to every scraped image
-- (copyright / accuracy). Default 'pending' until an operator/client approves.

ALTER TABLE assets ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX idx_assets_review ON assets(project_id, review_status);
