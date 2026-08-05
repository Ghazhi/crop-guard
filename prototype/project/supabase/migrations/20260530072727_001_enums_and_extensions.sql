/*
  # Enums and Extensions

  1. Enable required Postgres extensions
  2. Create all application enums used across tables

  ## Extensions
    - uuid-ossp: UUID generation
    - pg_trgm: trigram indexes for full-text search

  ## Enums
    - user_role: system roles (farmer, agent, staff, admin, partner)
    - gender: male, female, other, prefer_not_to_say
    - crop_type: all supported crop types
    - region_code: Ghana's 16 regional codes
    - policy_status, claim_status, loan_status
    - risk_category: low / medium / high / critical
    - verification_status: pending / in_progress / completed / failed
    - enrollment_status: active / suspended / graduated / withdrawn
    - intervention_type: field advisory, input distribution, training, credit facilitation, other
    - checkin_status: draft / submitted / approved / rejected
    - fri_method: weighted_sum / ml_model
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer','agent','staff','admin','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('male','female','other','prefer_not_to_say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crop_type AS ENUM (
    'maize','rice','cassava','yam','groundnut','soybean',
    'sorghum','millet','cocoa','coffee','tomato','pepper',
    'plantain','banana','pineapple','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE region_code AS ENUM (
    'AA','AH','BA','BE','CE','EP','NE','NR','OT','SA','UE','UW','VR','WN','WR','SW'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE policy_status AS ENUM ('draft','active','expired','claimed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('submitted','under_review','approved','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('pending','approved','disbursed','repaying','settled','defaulted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_category AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending','in_progress','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active','suspended','graduated','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE intervention_type AS ENUM (
    'field_advisory','input_distribution','training','credit_facilitation','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('draft','submitted','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fri_method AS ENUM ('weighted_sum','ml_model');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
