"""FR-11 structured, non-diagnostic recommendations for clinical review."""

from datetime import UTC, datetime

from app.domain.schemas import PatientDetail, Recommendation, RecommendationsResponse
from app.services.risk_engine import assess_patient, identify_anomalies

_PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
_KNOWN_CATEGORIES = {
    "clinical_review",
    "anomaly_review",
    "data_completeness",
    "alert_note",
    "monitoring",
}


def recommendations_for(patient: PatientDetail) -> RecommendationsResponse:
    """Generate review-focused guidance from the current assessment.

    Every recommendation stays in decision-support language: it points a clinician
    at evidence worth reviewing and never suggests a diagnosis or a treatment.
    """

    assessment = assess_patient(patient)
    anomalies = identify_anomalies(patient)
    recommendations: list[Recommendation] = []

    if assessment.risk >= 0.45:
        evidence = "; ".join(factor.summary for factor in assessment.top_factors[:2])
        recommendations.append(
            Recommendation(
                category="clinical_review",
                priority="high",
                text="Review this patient's trajectory as a priority.",
                rationale=f"Prototype risk is {assessment.risk:.0%}. Evidence: {evidence}",
            )
        )
    elif assessment.risk >= 0.25:
        recommendations.append(
            Recommendation(
                category="clinical_review",
                priority="medium",
                text="Consider reviewing this patient's trajectory.",
                rationale=f"Prototype risk is {assessment.risk:.0%} and warrants a closer look.",
            )
        )

    latest_timestamp = patient.measurements[-1].timestamp
    for anomaly in anomalies:
        if anomaly.timestamp == latest_timestamp and not anomaly.is_transient:
            recommendations.append(
                Recommendation(
                    category="anomaly_review",
                    priority="high",
                    text=f"Review the current {anomaly.parameter} reading against this patient's baseline.",
                    rationale=(
                        f"The value {anomaly.value} deviates from the baseline {anomaly.baseline} "
                        "and has not returned to it."
                    ),
                )
            )

    for factor in assessment.top_factors:
        if factor.contribution >= 0.12:
            priority = "high" if factor.contribution >= 0.35 else "medium"
            recommendations.append(
                Recommendation(
                    category="clinical_review",
                    priority=priority,
                    text=f"Review the {factor.parameter} signal.",
                    rationale=factor.summary,
                )
            )

    if assessment.data_quality.important_missing_parameters:
        missing = ", ".join(assessment.data_quality.important_missing_parameters)
        recommendations.append(
            Recommendation(
                category="data_completeness",
                priority="high" if assessment.risk >= 0.45 else "medium",
                text="Verify whether the missing measurements can be obtained.",
                rationale=(
                    f"Confidence is reduced to {assessment.confidence:.0%} while {missing} "
                    "are missing from the latest reading."
                ),
            )
        )

    if assessment.alert_suppressed:
        recommendations.append(
            Recommendation(
                category="alert_note",
                priority="low",
                text="No escalation is warranted from the isolated anomaly.",
                rationale="The anomaly returned to baseline and did not persist.",
            )
        )

    if assessment.risk < 0.25:
        recommendations.append(
            Recommendation(
                category="monitoring",
                priority="low",
                text="Continue routine monitoring.",
                rationale="Recent measurements remain close to this patient's established baseline.",
            )
        )

    recommendations.sort(key=lambda item: _PRIORITY_ORDER[item.priority])
    return RecommendationsResponse(
        patient_id=patient.id,
        generated_at=datetime.now(UTC),
        recommendations=recommendations[:6],
    )


def known_categories() -> set[str]:
    """Expose the allowed categories for tests and consumers."""

    return _KNOWN_CATEGORIES
