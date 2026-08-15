export interface ParameterMeta {
  label: string;
  unit: string;
}

export const PARAMETER_META: Record<string, ParameterMeta> = {
  heart_rate: { label: "Heart rate", unit: "bpm" },
  spo2: { label: "SpO₂", unit: "%" },
  temperature: { label: "Temperature", unit: "°C" },
  systolic_bp: { label: "Systolic BP", unit: "mmHg" },
  diastolic_bp: { label: "Diastolic BP", unit: "mmHg" },
  glucose: { label: "Glucose", unit: "mg/dL" },
  sleep_hours: { label: "Sleep", unit: "h" },
  activity_level: { label: "Activity", unit: "" },
};

export function parameterMeta(parameter: string): ParameterMeta {
  return PARAMETER_META[parameter] ?? { label: parameter, unit: "" };
}
