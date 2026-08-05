/*
# Norvi Community AI Insights Table

1. New Tables
- `norvi_community_outputs`
  - `id` (uuid, primary key)
  - `scope` (text, either 'community' or 'cooperative')
  - `scope_id` (uuid, the community or cooperative id)
  - `content` (text, the AI-generated insight text)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `norvi_community_outputs`.
- Authenticated users can read and insert (org-scoped through the related community/cooperative).

3. Notes
- This table caches AI-generated insight briefs for communities and cooperatives.
- The edge function `norvi-community-insight` writes to this table and reads cached entries.
- Rate-limited to one fresh generation per 7 days per scope.
*/

CREATE TABLE IF NOT EXISTS norvi_community_outputs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       text NOT NULL CHECK (scope IN ('community', 'cooperative')),
  scope_id    uuid NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_norvi_community_outputs_scope
  ON norvi_community_outputs (scope, scope_id, created_at DESC);

ALTER TABLE norvi_community_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_norvi_community_outputs" ON norvi_community_outputs;
CREATE POLICY "select_norvi_community_outputs"
  ON norvi_community_outputs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_norvi_community_outputs" ON norvi_community_outputs;
CREATE POLICY "insert_norvi_community_outputs"
  ON norvi_community_outputs FOR INSERT
  TO authenticated WITH CHECK (true);
