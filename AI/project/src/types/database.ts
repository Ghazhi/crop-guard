// ============================================================
// Enums
// ============================================================

export type UserRole        = 'farmer' | 'agent' | 'staff' | 'admin' | 'partner' | 'agronomist' | 'credits';
export type Gender          = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type RiskCategory    = 'low' | 'medium' | 'high' | 'critical';
export type PolicyStatus    = 'draft' | 'active' | 'expired' | 'claimed' | 'cancelled';
export type ClaimStatus     = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
export type LoanStatus      = 'pending' | 'approved' | 'disbursed' | 'repaying' | 'settled' | 'defaulted';
export type VerificationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type EnrollmentStatus   = 'active' | 'suspended' | 'graduated' | 'withdrawn';
export type InterventionType   = 'field_advisory' | 'input_distribution' | 'training' | 'credit_facilitation' | 'other';
export type CheckinStatus      = 'draft' | 'submitted' | 'approved' | 'rejected';
export type FriMethod          = 'weighted_sum' | 'ml_model';
export type AuditAction        = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';

export type CropType =
  | 'maize' | 'rice' | 'cassava' | 'yam' | 'groundnut' | 'soybean'
  | 'sorghum' | 'millet' | 'cocoa' | 'coffee' | 'tomato' | 'pepper'
  | 'plantain' | 'banana' | 'pineapple' | 'other';

export type RegionCode =
  | 'AA' | 'AH' | 'BA' | 'BE' | 'CE' | 'EP' | 'NE' | 'NR'
  | 'OT' | 'SA' | 'UE' | 'UW' | 'VR' | 'WN' | 'WR' | 'SW';

// ============================================================
// Row types
// ============================================================

export interface Organisation {
  id:             string;
  name:           string;
  type:           string;
  country:        string;
  contact_email:  string | null;
  contact_phone:  string | null;
  logo_url:       string | null;
  is_active:      boolean;
  metadata:       Record<string, unknown>;
  created_at:     string;
  updated_at:     string;
}

export interface User {
  id:                 string;
  organisation_id:    string | null;
  role:               UserRole;
  full_name:          string;
  phone:              string | null;
  region_code:        RegionCode | null;
  gender:             Gender | null;
  avatar_url:         string | null;
  preferred_language: string;
  is_active:            boolean;
  must_change_password: boolean;
  last_login_at:        string | null;
  created_at:           string;
  updated_at:           string;
}

export interface Program {
  id:                 string;
  organisation_id:    string;
  name:               string;
  description:        string | null;
  crop_season:        string;
  crop_types:         CropType[];
  regions:            RegionCode[];
  start_date:         string;
  end_date:           string;
  target_enrollment:  number;
  is_active:          boolean;
  settings:           Record<string, unknown>;
  created_at:         string;
  updated_at:         string;
}

export interface Cohort {
  id:           string;
  program_id:   string;
  name:         string;
  region_code:  RegionCode;
  district:     string;
  agent_id:     string | null;
  target_count: number;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
}

export interface Farmer {
  id:                  string;
  user_id:             string | null;
  organisation_id:     string | null;
  national_id:         string;
  full_name:           string;
  phone:               string;
  date_of_birth:       string | null;
  gender:              Gender | null;
  region_code:         RegionCode;
  district:            string;
  community:           string;
  gps_address:         string | null;
  photo_url:           string | null;
  biometric_ref:       string | null;
  total_farm_size_ha:  number;
  primary_crop:        CropType;
  current_fri_score:   number | null;
  risk_category:       RiskCategory | null;
  is_verified:         boolean;
  verified_by:         string | null;
  verified_at:         string | null;
  metadata:            Record<string, unknown>;
  created_at:          string;
  updated_at:          string;
}

export interface FarmDetail {
  id:               string;
  farmer_id:        string;
  name:             string;
  size_ha:          number;
  crop_type:        CropType;
  region_code:      RegionCode;
  district:         string;
  community:        string;
  latitude:         number | null;
  longitude:        number | null;
  polygon_geojson:  Record<string, unknown> | null;
  soil_type:        string | null;
  irrigation:       boolean;
  metadata:         Record<string, unknown>;
  created_at:       string;
  updated_at:       string;
}

export interface Agent {
  id:               string;
  organisation_id:  string | null;
  agent_code:       string;
  supervisor_id:    string | null;
  region_codes:     RegionCode[];
  districts:        string[];
  is_active:        boolean;
  target_farmers:   number;
  certified_crops:  CropType[];
  created_at:       string;
  updated_at:       string;
}

export interface Partner {
  id:               string;
  organisation_id:  string | null;
  name:             string;
  type:             string;
  contact_name:     string | null;
  contact_phone:    string | null;
  contact_email:    string | null;
  regions:          RegionCode[];
  is_active:        boolean;
  metadata:         Record<string, unknown>;
  created_at:       string;
  updated_at:       string;
}

export interface Enrollment {
  id:                string;
  farmer_id:         string;
  program_id:        string;
  cohort_id:         string | null;
  agent_id:          string | null;
  status:            EnrollmentStatus;
  enrolled_at:       string;
  graduated_at:      string | null;
  withdrawn_at:      string | null;
  withdrawal_reason: string | null;
  notes:             string | null;
  metadata:          Record<string, unknown>;
  created_at:        string;
  updated_at:        string;
}

export interface EnrollmentOpp {
  id:                       string;
  enrollment_id:            string;
  farmer_id:                string;
  product_type:             string;
  status:                   string;
  coverage_amount_ghs:      number | null;
  premium_ghs:              number | null;
  principal_ghs:            number | null;
  interest_rate:            number | null;
  term_months:              number | null;
  start_date:               string | null;
  end_date:                 string | null;
  policy_number:            string | null;
  loan_number:              string | null;
  disbursed_at:             string | null;
  due_date:                 string | null;
  outstanding_balance_ghs:  number | null;
  issued_by:                string | null;
  metadata:                 Record<string, unknown>;
  created_at:               string;
  updated_at:               string;
}

export interface WeeklyCheckin {
  id:            string;
  enrollment_id: string;
  farmer_id:     string;
  agent_id:      string;
  cohort_id:     string | null;
  week_number:   number;
  season_week:   string;
  status:        CheckinStatus;
  submitted_at:  string | null;
  approved_by:   string | null;
  approved_at:   string | null;
  notes:         string | null;
  metadata:      Record<string, unknown>;
  created_at:    string;
  updated_at:    string;
}

export interface CheckinActivity {
  id:            string;
  checkin_id:    string;
  activity_type: string;
  description:   string | null;
  quantity:      number | null;
  unit:          string | null;
  photo_urls:    string[];
  gps_lat:       number | null;
  gps_lng:       number | null;
  recorded_at:   string;
  metadata:      Record<string, unknown>;
  created_at:    string;
}

export interface Verification {
  id:             string;
  farmer_id:      string;
  agent_id:       string;
  type:           string;
  status:         VerificationStatus;
  scheduled_at:   string | null;
  completed_at:   string | null;
  score:          number | null;
  notes:          string | null;
  evidence_urls:  string[];
  metadata:       Record<string, unknown>;
  created_at:     string;
  updated_at:     string;
}

export interface VerificationActivity {
  id:               string;
  verification_id:  string;
  step:             string;
  status:           VerificationStatus;
  notes:            string | null;
  evidence_urls:    string[];
  completed_at:     string | null;
  metadata:         Record<string, unknown>;
  created_at:       string;
  updated_at:       string;
}

export interface FRIScore {
  id:                   string;
  farmer_id:            string;
  enrollment_id:        string | null;
  score:                number;
  category:             RiskCategory;
  method:               FriMethod;
  rainfall_deviation:   number | null;
  soil_moisture_index:  number | null;
  pest_pressure:        number | null;
  disease_incidence:    number | null;
  input_compliance:     number | null;
  confidence:           number | null;
  component_scores:     Record<string, unknown>;
  computed_at:          string;
}

export interface BaselineAssessment {
  id:                    string;
  enrollment_id:         string;
  farmer_id:             string;
  agent_id:              string;
  crop_type:             CropType;
  growth_stage:          number;
  expected_yield_kg_ha:  number | null;
  soil_ph:               number | null;
  irrigation_available:  boolean;
  inputs_used:           Record<string, unknown>;
  photo_urls:            string[];
  assessed_at:           string;
  metadata:              Record<string, unknown>;
  created_at:            string;
  updated_at:            string;
}

export interface Intervention {
  id:            string;
  farmer_id:     string;
  enrollment_id: string | null;
  agent_id:      string;
  type:          InterventionType;
  description:   string;
  status:        string;
  scheduled_at:  string | null;
  completed_at:  string | null;
  outcome:       string | null;
  photo_urls:    string[];
  metadata:      Record<string, unknown>;
  created_at:    string;
  updated_at:    string;
}

export interface FieldReport {
  id:           string;
  agent_id:     string;
  program_id:   string;
  cohort_id:    string | null;
  report_type:  string;
  period_start: string;
  period_end:   string;
  content:      string;
  attachments:  string[];
  submitted_at: string;
  reviewed_by:  string | null;
  reviewed_at:  string | null;
  metadata:     Record<string, unknown>;
  created_at:   string;
  updated_at:   string;
}

export interface NorviOutput {
  id:               string;
  farmer_id:        string;
  farm_id:          string | null;
  checkin_id:       string | null;
  image_urls:       string[];
  prompt_summary:   string | null;
  diagnosis:        string;
  severity:         RiskCategory;
  recommendations:  string[];
  confidence:       number | null;
  model_version:    string;
  processed_at:     string;
  metadata:         Record<string, unknown>;
  created_at:       string;
}

export interface RiskFlag {
  id:            string;
  farmer_id:     string;
  enrollment_id: string | null;
  flag_type:     string;
  severity:      RiskCategory;
  description:   string;
  triggered_by:  string | null;
  is_resolved:   boolean;
  resolved_by:   string | null;
  resolved_at:   string | null;
  metadata:      Record<string, unknown>;
  created_at:    string;
  updated_at:    string;
}

export interface AuditLog {
  id:          string;
  actor_id:    string | null;
  action:      AuditAction;
  table_name:  string | null;
  record_id:   string | null;
  old_data:    Record<string, unknown> | null;
  new_data:    Record<string, unknown> | null;
  ip_address:  string | null;
  user_agent:  string | null;
  created_at:  string;
}

// ============================================================
// Supabase Database type (used by createClient<Database>)
// ============================================================

type TableDef<Row, Insert = Omit<Row, 'id' | 'created_at' | 'updated_at'>, Update = Partial<Insert>> = {
  Row:    Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      organisations:          TableDef<Organisation, Omit<Organisation, 'id' | 'created_at' | 'updated_at'>>;
      users:                  TableDef<User, Omit<User, 'created_at' | 'updated_at'>>;
      programs:               TableDef<Program>;
      cohorts:                TableDef<Cohort>;
      farmers:                TableDef<Farmer>;
      farm_details:           TableDef<FarmDetail>;
      agents:                 TableDef<Agent, Omit<Agent, 'created_at' | 'updated_at'>>;
      partners:               TableDef<Partner>;
      enrollments:            TableDef<Enrollment>;
      enrollments_opp:        TableDef<EnrollmentOpp>;
      weekly_checkins:        TableDef<WeeklyCheckin>;
      checkin_activities:     TableDef<CheckinActivity, Omit<CheckinActivity, 'id' | 'created_at'>>;
      verifications:          TableDef<Verification>;
      verification_activities: TableDef<VerificationActivity>;
      fri_scores:             TableDef<FRIScore, Omit<FRIScore, 'id' | 'computed_at'>, never>;
      baseline_assessments:   TableDef<BaselineAssessment>;
      interventions:          TableDef<Intervention>;
      field_reports:          TableDef<FieldReport>;
      norvi_outputs:          TableDef<NorviOutput, Omit<NorviOutput, 'id' | 'created_at'>>;
      risk_flags:             TableDef<RiskFlag>;
      audit_logs:             TableDef<AuditLog, Omit<AuditLog, 'id' | 'created_at'>, never>;
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role:            UserRole;
      gender:               Gender;
      crop_type:            CropType;
      region_code:          RegionCode;
      risk_category:        RiskCategory;
      policy_status:        PolicyStatus;
      claim_status:         ClaimStatus;
      loan_status:          LoanStatus;
      verification_status:  VerificationStatus;
      enrollment_status:    EnrollmentStatus;
      intervention_type:    InterventionType;
      checkin_status:       CheckinStatus;
      fri_method:           FriMethod;
      audit_action:         AuditAction;
    };
  };
}
