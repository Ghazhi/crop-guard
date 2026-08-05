-- 1. Add title and report_type columns to norvi_community_outputs for saved reports
ALTER TABLE norvi_community_outputs
  ADD COLUMN IF NOT EXISTS title text DEFAULT 'Untitled Report',
  ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'ai_custom';

-- 2. Create a function to auto-sync cooperative member_count with actual farmer count
CREATE OR REPLACE FUNCTION sync_cooperative_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE cooperatives
      SET member_count = (
        SELECT count(*) FROM farmers WHERE cooperative_id = OLD.cooperative_id
      )
    WHERE id = OLD.cooperative_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE cooperatives
      SET member_count = (
        SELECT count(*) FROM farmers WHERE cooperative_id = NEW.cooperative_id
      )
    WHERE id = NEW.cooperative_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND (OLD.cooperative_id IS DISTINCT FROM NEW.cooperative_id) THEN
    UPDATE cooperatives
      SET member_count = (
        SELECT count(*) FROM farmers WHERE cooperative_id = OLD.cooperative_id
      )
    WHERE id = OLD.cooperative_id;
    UPDATE cooperatives
      SET member_count = (
        SELECT count(*) FROM farmers WHERE cooperative_id = NEW.cooperative_id
      )
    WHERE id = NEW.cooperative_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create triggers on farmers table to auto-sync member_count
DROP TRIGGER IF EXISTS farmers_coop_member_count_sync ON farmers;
CREATE TRIGGER farmers_coop_member_count_sync
  AFTER INSERT OR DELETE OR UPDATE OF cooperative_id ON farmers
  FOR EACH ROW
  EXECUTE FUNCTION sync_cooperative_member_count();

-- 4. Fix existing member_count values to match actual farmer counts
UPDATE cooperatives c
  SET member_count = sub.farmer_count
  FROM (
    SELECT cooperative_id, count(*) AS farmer_count
    FROM farmers
    WHERE cooperative_id IS NOT NULL
    GROUP BY cooperative_id
  ) sub
  WHERE c.id = sub.cooperative_id
    AND c.member_count != sub.farmer_count;

-- Also set member_count = 0 for cooperatives with no farmers
UPDATE cooperatives c
  SET member_count = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM farmers f WHERE f.cooperative_id = c.id
  )
  AND c.member_count != 0;
