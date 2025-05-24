-- Add ts_vector column
ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "content_tsv" tsvector;

-- Create GIN index on the ts_vector column
CREATE INDEX IF NOT EXISTS "content_tsv_idx" ON "post" USING GIN("content_tsv");

-- Update existing records with ts_vector data (Russian and Latin support)
UPDATE "post" SET "content_tsv" = to_tsvector('russian', "content") || to_tsvector('english', "content");

-- Create a trigger to automatically update ts_vector on content changes
CREATE OR REPLACE FUNCTION post_tsvector_update_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv = to_tsvector('russian', NEW.content) || to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_tsvector_update ON "post";
CREATE TRIGGER post_tsvector_update BEFORE INSERT OR UPDATE OF content ON "post"
FOR EACH ROW EXECUTE FUNCTION post_tsvector_update_trigger();
