# DESIGN.md - PulseGuard

## 1. Objective

PulseGuard should let a healthcare professional see which synthetic patient trajectories warrant review, why they were flagged, and how reliable the assessment is. The interface must feel like a careful clinical instrument: clear about evidence, restrained about uncertainty, and never diagnostic or alarmist.

## 2. Product Context

- **What the product does:** Surfaces potentially concerning patient trajectories from longitudinal synthetic data for clinical review.
- **Who it's for:** Healthcare professionals triaging a patient panel and deciding where to look first.
- **Adjacent brands (feel like these):** Linear's operational clarity, Observable's data legibility, Epic's information density.
- **Distant brand (do not feel like this):** Consumer wellness dashboards, because celebratory scores and vague encouragement undermine clinical review.
- **Cultural register:** Clinical, measured, and evidence-led. The product describes observed signals and recommendations for review; it does not name diseases or make treatment decisions.

## 3. Visual Foundations

### 3a. Color

- **Neutral scale:** `--n-0: #FFFFFF, --n-25: #F8FAFC, --n-50: #F1F5F9, --n-100: #E2E8F0, --n-400: #94A3B8, --n-600: #475569, --n-800: #1E293B, --n-950: #0F172A`
- **Accent(s):** `--accent-primary: #0F5F7A, --accent-soft: #E6F3F7`
- **Semantic:** `--stable: #287A67, --watch: #9A6700, --warning: #B45309, --critical: #B4233D, --info: #0F5F7A`
- **Usage rules:** Use the blue accent for navigation and selected controls only. Alert colors always appear with their text label and a shape or icon. Critical is reserved for meaningful risk escalation, never used as decoration or as a diagnosis proxy.

### 3b. Typography

- **Display face:** `Segoe UI Semibold, 600`, used only for page titles and primary patient identifiers.
- **Body face:** `Segoe UI, 400 / 600` for readable interface copy.
- **Fallback stack:** `'Segoe UI', 'Aptos', system-ui, -apple-system, sans-serif`.
- **Data face:** `'Cascadia Mono', Consolas, monospace` for percentages, timestamps, measurements, and chart annotations.
- **Type scale:** `12 / 14 / 16 / 20 / 24 / 32 px`.
- **Weight discipline:** 400 for prose, 500 for labels, 600 for hierarchy. Avoid bold body copy and all-uppercase paragraphs.

### 3c. Spacing & rhythm

- **Base unit:** `4 px`.
- **Spacing scale:** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px`.
- **What generous whitespace means in numbers:** The application shell uses 24 px page gutters on desktop; related measurements remain grouped at 8-12 px; 32 px separates clinical concepts.

### 3d. Component seeds

- **Button:** One filled primary action per view; secondary actions are low-emphasis outlined or text buttons. Radius is `6 px`.
- **Card / container:** Use white surfaces, 1 px neutral borders, `6 px` radius, and no drop shadows. Group only related evidence, not every metric.
- **Iconography:** Simple 1.5 px outline icons with text labels for unfamiliar actions. No emoji or decorative medical imagery.
- **Risk markers:** Compact labeled pills with an accompanying colored dot; every level also uses plain text so color is never the only signal.
- **Charts:** Directly label series where possible. Quiet grid lines, a single emphasized signal, and annotated anomalies rather than legends that make clinicians decode colors.

## 4. Accessibility

- **Text contrast:** Body text meets 4.5:1; UI controls and large type meet 3:1 or better.
- **Motion:** Motion is limited to short, non-essential feedback and disabled under `prefers-reduced-motion`.
- **Focus indicators:** A 2 px `#0F5F7A` outer ring with 2 px offset; never suppress native focus without replacement.
- **Alt text policy:** Decorative icons are hidden from assistive technology. Informational charts provide a concise trend summary and accessible data table or text equivalent.
- **Semantic state:** Alert level, risk, confidence, data quality, and missing parameters are exposed as separate labelled values.

## 5. Voice & Tone

- **Register:** Plain clinical decision support.
- **Sentence rhythm:** Short statements for status and recommendations; complete sentences for evidence and uncertainty.
- **Words this brand uses:** `trajectory`, `signal`, `review`, `confidence`.
- **Words this brand refuses:** `diagnosis`, `disease detected`, `treatment`, `guaranteed`, `emergency`.
- **Address:** Use the patient name or `this patient`; use direct clinician-oriented actions such as `Review trends`.

## 6. Implementation Practices

- **Token format:** CSS custom properties shared by React components.
- **Component library convention:** Bespoke, typed React components built from a small primitives layer; do not introduce a full UI framework for the MVP.
- **Image treatment rules:** No patient photography or generated human imagery. The dashboard is data- and typography-led.
- **Grid system:** Responsive 12-column desktop grid, collapsing to one column on narrow viewports.
- **Motion rules:** 120-180 ms opacity or transform transitions only; all animation has a reduced-motion branch.

## 7. Anti-Patterns

- **No celebratory KPI-card row.** Patient triage needs a prioritized trajectory view, not generic business metrics.
- **No red-as-diagnosis language.** Critical signals are a prompt for review, not a clinical conclusion.
- **No rainbow charts or dual y-axes.** Vital signs use separate, directly labelled trend charts to prevent false comparisons.
- **No rounded, shadow-heavy card grid.** Hairline-bounded evidence blocks make dense clinical information easier to scan.
- **No vague AI copy.** Every label names a measurement, trend, missing parameter, or action a clinician can take.
- **No color-only alert states.** Severity remains identifiable in monochrome and by assistive technologies.

## 8. Decision-Making

1. **Clinical safety first.** Never imply diagnosis, prescription, certainty, or autonomous action.
2. **Evidence before decoration.** Give trend, baseline, anomaly, and data-quality information precedence over visual flourish.
3. **Separate distinct concepts.** Risk, confidence, alert level, and data quality must never collapse into one score or treatment.
4. **Prioritize scanning.** Make potentially concerning trajectories discoverable without obscuring stable patients or suppressing uncertainty.
5. **Use familiar controls.** Prefer clear tables, filters, and labelled charts to novel interaction patterns.

## 9. Workflow

1. Confirm an interface change maps to a PRD requirement.
2. Identify the clinician decision the view supports.
3. Define loading, populated, empty, error, and missing-data states before implementation.
4. Build from typed data contracts and reusable UI primitives.
5. Keep risk, confidence, data quality, alert state, and contributing factors separate.
6. Verify contrast, keyboard navigation, narrow-screen layout, and reduced-motion behavior.
7. Check language against the non-diagnostic product principle before release.
