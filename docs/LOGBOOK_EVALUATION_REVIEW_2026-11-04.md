# Logbook and Evaluation review — 4 November 2026

Scope: Teerayut only (`D:/Work2/internFlow_teerayut/InternFlow`). This review did not change application code or existing user records. Runtime checks used a fresh disposable local PostgreSQL database and synthetic users/files; the database and uploaded test file were cleaned up afterward.

## Confirmed findings

1. **High — Logbook attachment URLs are public.** A synthetic PDF uploaded through `/api/upload` as REPORT could be downloaded with no Authorization header (HTTP 200). Logbook files use the shared `/uploads` static route (`backend/src/index.ts:29`). Move logbook artifacts to private storage and serve them through an owner/owning-company authorized download endpoint, keeping genuinely public assets such as company logos separate.

2. **Medium — Repeated sign-off can replace an earlier sign-off.** `PUT /api/logbook/:id/approve` returned 200 for an already-approved entry and changed its mentor rating from 2 to 5 and replaced the feedback. `backend/src/routes/logbook.routes.ts:170` writes without a `mentorApproved: false` condition. Make approval idempotent or return a conflict; a separate explicit correction/history workflow would be a new feature.

3. **Medium — Cancelled-placement history can still be deleted.** A student with a CANCELLED placement could delete its unapproved log (HTTP 200, row removed). `backend/src/routes/logbook.routes.ts:134` checks ownership and approval but not whether this is the current active placement; the UI also shows edit/delete controls for unapproved historical entries. Treat archived placements consistently as read-only, or explicitly define an authorized archive-maintenance policy.

4. **Medium — Weekly feedback/rating actually comes from one day.** Two approved daily ratings [5, 2] produced weekly rating 2 and the oldest day's feedback. `groupLogsByWeek` overwrites the weekly fields while walking descending daily entries (`backend/src/routes/logbook.routes.ts:43`). The weekly header should not present an arbitrary daily review as a separate weekly assessment. Preserve daily reviews; define an actual aggregate or a clearly identified shared batch review.

5. **Low — Evaluation feedback validation differs between UI and API.** The UI requires remarks, but whitespace-only feedback was accepted (HTTP 200) and stored as an empty string. `backend/src/routes/evaluation.routes.ts:34` only checks the type before trimming. Decide whether evaluation remarks are required or optional, then apply the same rule on both sides. This is separate from the intentionally optional handwritten portfolio comments.

6. **UX / assessment quality — Perfect scores and stock sign-off text are preselected.** A new evaluation initializes all three criteria to 5/5 (`frontend/src/pages/company/CompanyEvaluations.tsx:114`). Weekly sign-off also prepopulates a statement that deliverables meet the criteria (line 546). Require deliberate score selection and avoid claiming review completion before HR has reviewed the evidence.

Additional lower-priority observation: batch sign-off returns `updatedCount: logs.length`, including days that were already approved, and reports success even when no new rows changed (`backend/src/routes/logbook.routes.ts:198`). It should report the number actually changed and avoid duplicate approval notifications on no-op retries.

## Existing foundations

The implementation already separates submitted and approved hours, scopes logbook/report access to the student or placement company, prevents student edits to approved entries, prevents duplicate work dates and rejects future dates. The previously implemented regression suite covers those paths; the newly reproduced cases above were not covered by that earlier passing suite.

## Optional additions — proposals, not implemented

- Return a pending log for correction with a reason, plus revision history and who/when approved it.
- A queue/filter for pending mentor review and overdue student submissions, with reminders based on an agreed work schedule.
- Evaluation draft/final states, clear descriptions for each score level and revision history for published ratings.
- Configurable curriculum hour targets and training dates. The API currently uses a fixed `targetHours = 400`; this is a separate policy/configuration enhancement rather than proof that the current totals are calculated incorrectly.

Recommendation: fix the confirmed defects first, especially private attachments and approval/history consistency. Choose optional workflow additions before implementing them.
