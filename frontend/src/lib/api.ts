import type {
  Anomaly,
  CreatePatientRequest,
  LoginResponse,
  ModelInfo,
  PatientDetail,
  PatientSummary,
  PatientTimeline,
  RecommendationsResponse,
  RiskAssessment,
  RiskModel,
} from "./types";

const TOKEN_KEY = "pulseguard.token";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`/api${path}`, { ...init, headers });
  if (response.status === 401) {
    clearToken();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

export interface SimulationChange {
  index: number;
  parameter: string;
  value: number | null;
}

export const api = {
  login(username: string, password: string): Promise<LoginResponse> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  listPatients(): Promise<PatientSummary[]> {
    return request("/patients");
  },

  addPatient(payload: CreatePatientRequest): Promise<PatientDetail> {
    return request("/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getModels(): Promise<ModelInfo[]> {
    return request("/models");
  },

  getPatient(id: string): Promise<PatientDetail> {
    return request(`/patients/${id}`);
  },

  getRisk(id: string, model: RiskModel = "hybrid"): Promise<RiskAssessment> {
    return request(`/patients/${id}/risk?model=${model}`);
  },

  getAnomalies(id: string): Promise<Anomaly[]> {
    return request(`/patients/${id}/anomalies`);
  },

  getTimeline(id: string): Promise<PatientTimeline> {
    return request(`/patients/${id}/timeline`);
  },

  getRecommendations(id: string): Promise<RecommendationsResponse> {
    return request(`/patients/${id}/recommendations`);
  },

  simulate(patientId: string, changes: SimulationChange[], model: RiskModel = "hybrid"): Promise<RiskAssessment> {
    return request("/simulation", {
      method: "POST",
      body: JSON.stringify({ patient_id: patientId, changes, model }),
    });
  },
};
