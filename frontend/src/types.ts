// ============================================================================
// Core Domain Types
// ============================================================================

export type CaregiverRole = 'viewer' | 'caregiver';

export interface CaregiverEntry {
  email: string;
  role: CaregiverRole;
}

export interface Baby {
  id: number;
  name: string;
  birth_date: string | null;
  gender: string | null;
  is_owner?: boolean;
  shared_with?: CaregiverEntry[];
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface Session {
  access_token: string;
  [key: string]: unknown;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface Feeding {
  id: number | string;
  baby_id: number;
  time: string;
  type: 'breast' | 'bottle' | 'formula' | 'breastmilk_bottle' | 'solid';
  duration_minutes: number | null;
  amount_ml: number | null;
  notes: string | null;
  created_at?: string;
}

export interface Diaper {
  id: number | string;
  baby_id: number;
  time: string;
  type: 'pee' | 'poo' | 'mixed';
  poo_color: string | null;
  poo_consistency: string | null;
  poo_amount: string | null;
  notes: string | null;
  created_at?: string;
}

export interface Sleep {
  id: number | string;
  baby_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes?: number | null;
  notes: string | null;
  created_at?: string;
}

export interface Pumping {
  id: number | string;
  baby_id: number;
  time: string;
  duration_minutes: number | null;
  amount_ml: number | null;
  notes: string | null;
  created_at?: string;
}

export interface PottyLog {
  id: number | string;
  baby_id: number;
  time: string;
  result: 'success' | 'attempt' | 'accident';
  potty_type?: string | null;
  notes: string | null;
  created_at?: string;
}

export interface TummyTime {
  id: number | string;
  baby_id: number;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  created_at?: string;
}

export interface Bath {
  id: number | string;
  baby_id: number;
  time: string;
  notes: string | null;
  created_at?: string;
}

export interface Supplement {
  id: number | string;
  baby_id: number;
  time: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  created_at?: string;
}

// ============================================================================
// Health Types
// ============================================================================

export interface DoctorVisit {
  id: number;
  baby_id: number;
  visit_date: string;
  visit_type: string;
  doctor_name: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
  next_visit_date: string | null;
  notes: string | null;
}

export interface Vaccination {
  id: number;
  baby_id: number;
  vaccine_name: string;
  dose_number: number;
  given_date: string;
  administered_by: string | null;
  next_due_date: string | null;
  notes: string | null;
}

export interface Medication {
  id: number;
  baby_id: number;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface GrowthRecord {
  id: number;
  baby_id: number;
  recorded_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
  notes: string | null;
}

export interface Tooth {
  id: number;
  baby_id: number;
  position: string;
  emerged_date: string;
}

export interface SickDay {
  id: number;
  baby_id: number;
  date: string;
  symptoms: string[];
  temperature: number | null;
  notes: string | null;
}

export interface Allergy {
  id: number;
  baby_id: number;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | null;
  reaction: string | null;
  discovered_date: string | null;
  notes: string | null;
}

// ============================================================================
// Dashboard & Timeline Types
// ============================================================================

export interface DailySummaryData {
  total_feedings: number;
  total_diapers: number;
  total_ml: number;
  pee_count: number;
  poo_count: number;
  mixed_count: number;
  total_sleep_minutes: number;
  sleep_count: number;
  pumping_count: number;
  total_pumping_ml: number;
  potty_count: number;
  potty_success_count: number;
  tummy_count: number;
  tummy_minutes: number;
  bath_count: number;
  [key: string]: unknown;
}

export interface DashboardData {
  last_feeding: Feeding | null;
  last_diaper: Diaper | null;
  last_sleep: Sleep | null;
  current_sleep: Sleep | null;
  last_pumping: Pumping | null;
  last_potty: PottyLog | null;
  last_tummy: TummyTime | null;
  last_bath: Bath | null;
  last_supplement: Supplement | null;
  daily_summary: DailySummaryData | null;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  time: string;
  details: Record<string, unknown>;
}

export interface UpcomingItem {
  type: string;
  title: string;
  date?: string;
  frequency?: string;
  dosage?: string;
  color: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsData {
  has_enough_data: boolean;
  data_points?: {
    feedings: number;
    sleeps: number;
  };
  patterns?: AnalyticsPatterns;
  predictions?: AnalyticsPredictions;
  benchmarks?: AnalyticsBenchmarks;
  today_vs_average?: TodayVsAverage;
  trends?: AnalyticsTrends;
}

export interface AnalyticsPatterns {
  usual_wake_time?: string;
  usual_bedtime?: string;
  wake_interval_hours?: number;
  avg_feeding_interval_hours?: number;
  avg_nap_duration_minutes?: number;
}

export interface AnalyticsPredictions {
  next_feeding?: Prediction;
  next_nap?: NapPrediction;
  sleep_pressure?: SleepPressure;
}

export interface Prediction {
  in_minutes: number;
  past_due?: boolean;
  confidence?: {
    range_minutes: number;
    quality_label: string;
  };
}

export interface NapPrediction extends Prediction {
  status?: string;
  status_label?: string;
  wake_window?: {
    min: number;
    max: number;
  };
}

export interface SleepPressure {
  score: number;
  zone: string;
  label: string;
  minutes_awake: number;
  recommendation: string;
}

export interface AnalyticsBenchmarks {
  age_weeks?: number;
  diapers?: {
    expected_wet_diapers?: { min: number; max: number };
    notes?: string;
  };
  sleep?: {
    expected_total_sleep_hours?: { min: number; max: number };
    notes?: string;
  };
  feeding?: {
    expected_feeds_per_day?: { min: number; max: number };
    notes?: string;
  };
}

export interface TodayVsAverage {
  feedings?: { today: number; daily_avg: number };
  diapers?: { today: number; daily_avg: number; wet_today?: number };
  sleep_hours?: { today: number; daily_avg: number };
}

export interface AnalyticsTrends {
  sleep?: TrendItem;
  feeding?: TrendItem;
}

export interface TrendItem {
  trend: string;
  trend_label: string;
  description: string;
}

// ============================================================================
// WHO Growth Data Types
// ============================================================================

export interface WHODataPoint {
  months: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface WHOData {
  WHO_WEIGHT_BOYS: WHODataPoint[];
  WHO_WEIGHT_GIRLS: WHODataPoint[];
  WHO_HEIGHT_BOYS: WHODataPoint[];
  WHO_HEIGHT_GIRLS: WHODataPoint[];
}

// ============================================================================
// Offline Sync Types
// ============================================================================

export interface SyncAction {
  id?: number;
  type: string;
  endpoint?: string;
  method?: string;
  data?: Record<string, unknown>;
  created_at?: string;
  retry_count?: number;
  last_retry?: string | null;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionStatus {
  premium: boolean;
  [key: string]: unknown;
}

export interface PromoResult {
  valid: boolean;
  premium: boolean;
  message?: string;
}
