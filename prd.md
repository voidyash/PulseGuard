# Product Requirements Document - PulseGuard

## 1. Product Overview

PulseGuard is an AI-assisted early-risk detection and personalized care platform.

It analyzes heterogeneous and longitudinal patient information to identify patterns that may indicate deterioration.

The product provides:

* Risk score
* Confidence score
* Explainable contributing factors
* Time-series trends
* Anomaly detection
* Personalized baselines
* Intelligent alerts
* Structured recommendations
* Data-quality indicators

### Product Objective

> **Identify potential deterioration early without overwhelming healthcare professionals with false alarms.**

## 2. Goals

1. Detect early signs of deterioration.
2. Analyze longitudinal health data.
3. Identify deviations from patient-specific baselines.
4. Produce understandable risk scores.
5. Explain prediction factors.
6. Communicate prediction confidence.
7. Handle missing parameters.
8. Reduce unnecessary alerts.
9. Provide personalized, non-diagnostic recommendations.
10. Help professionals prioritize patients.

## 3. Non-Goals

PulseGuard will not:

* Autonomously diagnose diseases.
* Prescribe medication.
* Replace healthcare professionals.
* Make irreversible medical decisions.
* Claim clinical validity without proper validation.
* Use real patient data for the hackathon prototype.

## 4. Target Users

### Healthcare Professional

Needs to:

* Identify high-risk patients quickly.
* Understand why someone was flagged.
* See trends instead of isolated values.
* Understand prediction reliability.
* Avoid alert fatigue.

### Administrator

Optional MVP role responsible for:

* User management
* Alert configuration
* Audit logs
* System monitoring

## 5. Core Functional Requirements

### FR-01 - Patient Management

Users can search, view, and open patient profiles containing current and historical health data.

### FR-02 - Risk Prediction

The system generates a patient risk probability.

```text
Risk: 87%
Level: Critical
```

### FR-03 - Time-Series Analysis

The system calculates:

* Rolling averages
* Slopes
* Rates of change
* Baseline deviation
* Short-term trends
* Long-term trends

### FR-04 - Anomaly Detection

The system identifies measurements that significantly deviate from a patient's baseline.

### FR-05 - Personalized Baseline

The system calculates individual normal ranges where sufficient historical data exists.

### FR-06 - Explainable Prediction

The system displays the primary contributors to risk.

### FR-07 - Confidence Score

Risk and confidence must be displayed separately.

```text
Risk: 87%
Confidence: 94%
```

### FR-08 - Missing Data

The system must identify missing parameters and reduce confidence when missing information materially affects the prediction.

### FR-09 - Alert Engine

Alert levels:

```text
Stable
Watch
Warning
Critical
```

Alerts consider risk, trend, persistence, anomalies, and previous alert state.

### FR-10 - Alert Suppression

Repeated alerts for an unchanged condition should be suppressed. Alerts should escalate when severity meaningfully increases.

### FR-11 - Recommendations

Recommendations must be structured, understandable, non-diagnostic, and focused on appropriate clinical review.

### FR-12 - Data Quality

Each patient receives a data-quality score and list of important missing parameters.

### FR-13 - What-If Simulation

Users can modify selected parameters and simulate the resulting risk.

## 6. ML Architecture

### Risk Model

Primary:

**XGBoost**

Baseline:

**Logistic Regression**

### Anomaly Model

**Isolation Forest**

### Explainability

**SHAP**

### Feature Engineering

```text
mean_1h
mean_6h
mean_12h
mean_24h

slope_1h
slope_6h
slope_12h

baseline_deviation
percentage_change
rolling_std
measurement_count
missingness_ratio
previous_risk
```

## 7. Risk Engine

A prototype may combine:

```text
60% ML probability
20% deterioration score
10% anomaly score
10% rule-based signals
```

These weights are prototype design choices, not medically validated standards.

Output:

```json
{
  "risk": 0.87,
  "confidence": 0.94,
  "alert_level": "critical",
  "data_quality": 0.91,
  "top_factors": [
    "SpO2 declining",
    "Heart rate above baseline",
    "Temperature increasing"
  ]
}
```

## 8. Data Strategy

Use synthetic data containing:

* Stable patients
* Gradual deterioration
* Sudden events
* Missing-data scenarios
* Temporary anomalies

The temporary-anomaly scenario is essential for demonstrating false-alert suppression.

## 9. UX

The main dashboard should expose:

```text
Critical Patients
Warning Patients
Watch Patients
Stable Patients
```

Patient details should contain:

1. Current risk
2. Confidence
3. Data quality
4. Time-series charts
5. Risk timeline
6. Explanation
7. Anomalies
8. Recommendations

## 10. API

```text
GET  /api/health
GET  /api/patients
GET  /api/patients/{id}
GET  /api/patients/{id}/timeline
GET  /api/patients/{id}/risk
GET  /api/patients/{id}/anomalies
GET  /api/patients/{id}/recommendations

POST /api/risk/predict
POST /api/simulation
POST /api/auth/login
```

## 11. Database

### Patient

```text
id
age
sex
medical_history
created_at
```

### Measurement

```text
id
patient_id
timestamp
heart_rate
spo2
temperature
systolic_bp
diastolic_bp
glucose
sleep_hours
activity_level
```

### RiskAssessment

```text
id
patient_id
timestamp
risk_score
confidence
data_quality
alert_level
```

### Anomaly

```text
id
patient_id
timestamp
parameter
value
baseline
severity
```

### Alert

```text
id
patient_id
timestamp
level
reason
status
```

## 12. Security

The prototype should use:

* HTTPS
* Authentication
* Authorization
* Password hashing
* Environment-based secrets
* Secure database storage
* Minimal logging of sensitive information
* Synthetic/anonymized data
* Audit logging where implemented

External AI services should receive only the minimum structured information required.

## 13. MVP Scope

### Must Have

* Patient list
* Patient detail page
* Synthetic dataset
* Time-series graphs
* Risk prediction
* Anomaly detection
* Personalized baseline
* Explainable factors
* Confidence score
* Missing-data handling
* Alert levels

### Should Have

* Alert cooldown
* Data-quality score
* Recommendations
* Real-time simulation

### Could Have

* What-if simulator
* LLM explanation layer
* Authentication
* Audit logs
* Wearable simulation

### Won't Have

* Real hospital integration
* Real patient data
* Autonomous diagnosis
* Prescription generation
* Production clinical validation
* Hardware integration

## 14. Demo Flow

### Stage 1 - Stable

```text
Patient #1042
Risk: 18%
Status: Stable
```

### Stage 2 - Simulate Deterioration

```text
SpO₂       97 → 96 → 95 → 93 → 91
Heart Rate 78 → 84 → 91 → 101 → 108
Temp       98.5 → 99.0 → 99.6 → 100.4 → 101
```

### Stage 3 - Risk Escalation

```text
18% → 27% → 41% → 63% → 87%
```

### Stage 4 - Explain

Show why risk increased.

### Stage 5 - Remove Data

Demonstrate:

```text
Risk: 82%
Confidence: 61%
```

and explain why confidence dropped.

### Stage 6 - False Alert Test

```text
SpO₂:
97 → 97 → 91 → 97 → 97
```

The system should identify the anomaly without unnecessarily escalating to critical status.

## 15. Success Metrics

### Product

* High-risk patients are easy to identify.
* Risk factors are understandable.
* Risk and confidence are clearly separated.
* Missing data is visible.
* Repeated alerts are suppressed.

### ML

Where the synthetic dataset supports it, report:

* Precision
* Recall
* F1-score
* ROC-AUC
* Confusion matrix

Do not present synthetic-data performance as clinical accuracy.

## 16. Risks

| Risk                  | Mitigation                             |
| --------------------- | -------------------------------------- |
| False positives       | Persistence + anomaly filtering        |
| False negatives       | Conservative thresholds + human review |
| Missing data          | Confidence reduction                   |
| Model bias            | Dataset and subgroup evaluation        |
| Data leakage          | Access control + secure storage        |
| AI overreliance       | Clinical decision-support positioning  |
| Synthetic limitations | Explicit prototype labeling            |
| LLM hallucination     | Structured inputs only                 |

## 17. Roadmap

### Phase 1 - Hackathon

Synthetic data, ML prototype, dashboard, explainability, alert engine.

### Phase 2 - Validation

Larger datasets, clinical review, calibration, bias analysis, robustness testing.

### Phase 3 - Pilot

Hospital data integration, FHIR/HL7 interoperability, secure infrastructure, workflow integration.

### Phase 4 - Production

Regulatory compliance, clinical validation, model monitoring, drift detection, enterprise deployment.

## 18. Product Principle

PulseGuard should never try to answer:

> **"What disease does this patient have?"**

It should answer:

> **"Is this patient's trajectory becoming concerning, what evidence supports that assessment, and how confident are we?"**

That distinction is the foundation of the product.
::: 
