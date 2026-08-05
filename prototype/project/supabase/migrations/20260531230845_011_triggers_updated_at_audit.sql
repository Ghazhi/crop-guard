/*
  # Triggers: updated_at and audit_log
*/

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organisations', 'users', 'programs', 'cohorts',
    'farmers', 'farm_details', 'agents', 'partners',
    'enrollments', 'enrollments_opp',
    'weekly_checkins', 'checkin_activities',
    'verifications', 'verification_activities',
    'baseline_assessments', 'interventions', 'field_reports',
    'risk_flags'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_touch_updated_at ON %I;
       CREATE TRIGGER trg_touch_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION touch_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION record_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action audit_action;
  v_old    jsonb := NULL;
  v_new    jsonb := NULL;
BEGIN
  IF    TG_OP = 'INSERT' THEN v_action := 'INSERT'; v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN v_action := 'UPDATE'; v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN v_action := 'DELETE'; v_old := to_jsonb(OLD);
  END IF;
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (v_old->>'id')::uuid ELSE (v_new->>'id')::uuid END,
    v_old, v_new);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['farmers', 'enrollments', 'enrollments_opp', 'verifications', 'fri_scores', 'risk_flags', 'baseline_assessments', 'interventions'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_log ON %I;
       CREATE TRIGGER trg_audit_log
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION record_audit_log();',
      t, t
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_farmer_fri_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE farmers SET current_fri_score = NEW.score, risk_category = NEW.category, updated_at = now() WHERE id = NEW.farmer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fri_score ON fri_scores;
CREATE TRIGGER trg_sync_fri_score AFTER INSERT ON fri_scores FOR EACH ROW EXECUTE FUNCTION sync_farmer_fri_score();
