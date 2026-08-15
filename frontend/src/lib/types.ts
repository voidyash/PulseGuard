export type AlertLevel = "stable" | "watch" | "warning" | "critical";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export interface PatientSummary {
  id: string;
  display_name: string;
  age: number;
  sex: string;
  medical_history: string[];
  created_at: string;
  data_source: string;
  risk: number;
  confidence: number;
  alert_level: AlertLevel;
  data_quality: number;
}

export interface VitalMeasurement {
  timestamp: string;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  glucose: number | null;
  sleep_hours: number | null;
  activity_level: number | null;
}

export interface PatientDetail {
  id: string;
  display_name: string;
  age: number;
  sex: string;
  medical_history: string[];
  created_at: string;
  data_source: string;
  measurements: VitalMeasurement[];
}

export interface RiskFactor {
  parameter: string;
  summary: string;
  contribution: number;
}

export interface DataQuality {
  score: number;
  important_missing_parameters: string[];
}

export interface RiskAssessment {
  patient_id: string;
  assessed_at: string;
  risk: number;
  confidence: number;
  alert_level: AlertLevel;
  data_quality: DataQuality;
  top_factors: RiskFactor[];
  alert_suppressed: boolean;
  suppression_reason: string | null;
  prototype_notice: string;
}

export interface Anomaly {
  patient_id: string;
  timestamp: string;
  parameter: string;
  value: number;
  baseline: number;
  severity: string;
  is_transient: boolean;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number | null;
  baseline: number;
  baseline_deviation: number | null;
  percentage_change: number | null;
  rolling_mean: number | null;
  slope_short: number | null;
  slope_long: number | null;
  trend_short: string;
  trend_long: string;
  is_anomaly: boolean;
}

export interface ParameterSeries {
  parameter: string;
  baseline: number;
  points: TimeSeriesPoint[];
}

export interface RiskTimelinePoint {
  timestamp: string;
  risk: number;
  confidence: number;
  alert_level: AlertLevel;
}

export interface PatientTimeline {
  patient_id: string;
  series: ParameterSeries[];
  risk_points: RiskTimelinePoint[];
}

export interface Recommendation {
  category: string;
  priority: string;
  text: string;
  rationale: string;
}

export interface RecommendationsResponse {
  patient_id: string;
  generated_at: string;
  recommendations: Recommendation[];
}

export type RiskModel = "hybrid" | "xgboost" | "logistic";

export interface ModelInfo {
  name: string;
  kind: "risk" | "anomaly" | "explainability";
  status: "trained" | "unavailable";
  description: string;
  metrics: Record<string, number>;
  active: boolean;
}

export interface CreatePatientRequest {
  display_name?: string;
  age: number;
  sex: string;
  medical_history?: string[];
  measurements?: VitalMeasurement[];
}
