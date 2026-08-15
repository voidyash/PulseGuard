"""In-memory synthetic scenarios used only by the hackathon prototype."""

from datetime import UTC, datetime, timedelta

from app.domain.schemas import CreatePatientRequest, Patient, PatientDetail, VitalMeasurement


def _measurement(
    hour: int,
    *,
    heart_rate: float | None,
    spo2: float | None,
    temperature: float | None,
    systolic_bp: float | None = 118,
    diastolic_bp: float | None = 76,
    glucose: float | None = 96,
    sleep_hours: float | None = 7.2,
    activity_level: float | None = 0.6,
) -> VitalMeasurement:
    return VitalMeasurement(
        timestamp=datetime(2026, 8, 15, 8, tzinfo=UTC) + timedelta(hours=hour),
        heart_rate=heart_rate,
        spo2=spo2,
        temperature=temperature,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        glucose=glucose,
        sleep_hours=sleep_hours,
        activity_level=activity_level,
    )


_CREATED_AT = datetime(2026, 1, 1, tzinfo=UTC)


SYNTHETIC_PATIENTS: dict[str, PatientDetail] = {
    "1042": PatientDetail(
        id="1042",
        display_name="Patient #1042",
        age=62,
        sex="Female",
        medical_history=["Hypertension"],
        created_at=_CREATED_AT,
        measurements=[
            _measurement(0, heart_rate=76, spo2=98, temperature=36.7),
            _measurement(4, heart_rate=75, spo2=98, temperature=36.8),
            _measurement(8, heart_rate=77, spo2=97, temperature=36.7),
            _measurement(12, heart_rate=76, spo2=98, temperature=36.8),
            _measurement(16, heart_rate=78, spo2=97, temperature=36.9),
            _measurement(20, heart_rate=77, spo2=98, temperature=36.8),
        ],
    ),
    "2087": PatientDetail(
        id="2087",
        display_name="Patient #2087",
        age=71,
        sex="Male",
        medical_history=["Chronic obstructive pulmonary disease", "Type 2 diabetes"],
        created_at=_CREATED_AT,
        measurements=[
            _measurement(0, heart_rate=77, spo2=97, temperature=36.8, systolic_bp=124),
            _measurement(4, heart_rate=78, spo2=97, temperature=36.9, systolic_bp=123),
            _measurement(8, heart_rate=84, spo2=96, temperature=37.2, systolic_bp=120),
            _measurement(12, heart_rate=91, spo2=95, temperature=37.6, systolic_bp=116),
            _measurement(16, heart_rate=101, spo2=93, temperature=38.0, systolic_bp=111),
            _measurement(20, heart_rate=108, spo2=91, temperature=38.3, systolic_bp=106),
        ],
    ),
    "3174": PatientDetail(
        id="3174",
        display_name="Patient #3174",
        age=49,
        sex="Female",
        medical_history=["No relevant history recorded"],
        created_at=_CREATED_AT,
        measurements=[
            _measurement(0, heart_rate=72, spo2=97, temperature=36.8),
            _measurement(4, heart_rate=73, spo2=97, temperature=36.8),
            _measurement(8, heart_rate=74, spo2=97, temperature=36.9),
            _measurement(12, heart_rate=73, spo2=91, temperature=36.8),
            _measurement(16, heart_rate=72, spo2=97, temperature=36.8),
            _measurement(20, heart_rate=74, spo2=97, temperature=36.9),
        ],
    ),
    "4210": PatientDetail(
        id="4210",
        display_name="Patient #4210",
        age=58,
        sex="Male",
        medical_history=["Hypertension"],
        created_at=_CREATED_AT,
        measurements=[
            _measurement(0, heart_rate=80, spo2=96, temperature=36.9),
            _measurement(4, heart_rate=82, spo2=96, temperature=37.0),
            _measurement(8, heart_rate=85, spo2=95, temperature=37.2),
            _measurement(12, heart_rate=90, spo2=94, temperature=37.5),
            _measurement(
                16,
                heart_rate=96,
                spo2=93,
                temperature=37.8,
                systolic_bp=None,
                diastolic_bp=None,
                glucose=None,
                sleep_hours=None,
                activity_level=None,
            ),
        ],
    ),
}


def get_patient(patient_id: str) -> PatientDetail | None:
    """Return one synthetic patient by identifier."""

    return SYNTHETIC_PATIENTS.get(patient_id)


def list_patients() -> list[PatientDetail]:
    """Return all synthetic patient scenarios in a deterministic order."""

    return list(SYNTHETIC_PATIENTS.values())


def _default_measurements() -> list[VitalMeasurement]:
    """Generate six hourly baseline readings ending now for a newly added patient."""

    start = datetime.now(UTC) - timedelta(hours=5)
    variations = [(-1, 0.1, -0.1), (0, 0.0, 0.0), (1, -0.1, 0.1), (0, 0.1, 0.0), (-1, 0.0, 0.0), (0, 0.0, 0.1)]
    return [
        VitalMeasurement(
            timestamp=start + timedelta(hours=index),
            heart_rate=76 + hr_offset,
            spo2=97 + spo2_offset,
            temperature=36.8 + temp_offset,
        )
        for index, (hr_offset, spo2_offset, temp_offset) in enumerate(variations)
    ]


def create_patient(request: CreatePatientRequest) -> PatientDetail:
    """Add a patient to the in-memory store and return the created profile.

    The store is process-local: patients added at runtime disappear on restart,
    consistent with the prototype's "nothing is persisted" design.
    """

    next_id = str(max(int(patient_id) for patient_id in SYNTHETIC_PATIENTS) + 1)
    patient = PatientDetail(
        id=next_id,
        display_name=request.display_name or f"Patient #{next_id}",
        age=request.age,
        sex=request.sex,
        medical_history=request.medical_history or ["No relevant history recorded"],
        created_at=datetime.now(UTC),
        measurements=request.measurements or _default_measurements(),
    )
    SYNTHETIC_PATIENTS[next_id] = patient
    return patient


def patient_profile(patient: PatientDetail) -> Patient:
    """Return profile information without longitudinal measurements."""

    return Patient(**patient.model_dump(exclude={"measurements"}))
