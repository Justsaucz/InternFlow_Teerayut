# Teerayut: Portfolio, evidence, assessments and account features

Implemented 4 November 2026 in `D:/Work2/internFlow_teerayut/InternFlow` only.
The DES424 Project code and its database were not changed by this feature work.

## Included features

1. **Automatic portfolio summary.** Selecting files in the application flow automatically summarizes supported PDF/image content when the disclosed Gemini option is enabled; there is no request-review button. Applicants may disable AI sharing before upload. The result inventories the file contents and identifies exact job requirements that were not found or only partly documented. It does not rate skills, recommend follow-up questions, rank applicants or make hiring decisions. "Not found" means absent from the reviewed files, not inability. HR comments are a separate, blank, optional handwritten text field; AI does not prefill it and comments do not block status changes.
2. **Continuous evidence history.** Candidates add an artifact or a new version for a specific application. Previous versions remain immutable. Work dates are candidate-reported; submission dates and version numbers are recorded by the server. Supported AI artifacts are PDF, PNG, JPEG and WEBP, at most 5 MB each and 1-3 selected versions per review. External portfolio links are available for manual review and are not fetched by the AI service.
3. **Practical questionnaire / assessment.** HR can require a questionnaire during application, or assign it later. HR writes 1-10 questions or asks Gemini for a draft. Generation uses the complete job title, description, responsibilities and requirements. The server attaches the exact source quote selected by a constrained source ID; an independent AI pass checks the prompt, answer options and expected answer against that context. Drafts with two or more items must include TEXT and TASK questions. Cross-domain distractors, unsupported technologies and trivial job-description recognition questions are excluded by the relevance check; rejected drafts do not overwrite the editor. HR must still inspect and approve drafts. Assignments freeze their question/rubric version, students never receive answer keys, and HR manually scores submitted answers.
4. **In-app status notifications.** Notification bell, unread count, individual read state and mark-all-read. Updates refresh every 30 seconds and on window focus. Events cover new applications, application status, commitment, automatic closure of competing applications, cancellation requests/results, logbook approval, evidence updates and assessment/review progress. Notifications are scoped to their recipient. Screening notifications link directly to the relevant application workspace. Status-change email notifications were not added.
5. **Forgot/reset password.** Login link, email request, reset form and confirmation. Cryptographically random tokens are stored as hashes, expire in 30 minutes, and can be consumed once. Resetting the password increments a session version and invalidates prior JWTs. Unknown/eligible accounts receive the same response to email requests. Account endpoints are rate limited. Responses do not expose reset tokens.
6. **Email verification.** New accounts must follow an emailed, single-use, 24-hour link before signing in. Resend is available. Existing accounts remain usable and receive an unverified-email banner; they are not falsely marked as verified.

## How to open the local preview

- Website: http://127.0.0.1:52698
- API: http://127.0.0.1:52697/api/health
- Test inbox: http://127.0.0.1:8025
- Student access: **My Applications -> View files, feedback & questionnaire**. HR access: **Applicants -> Review evidence & answers**. The duplicate Portfolio & Assessments sidebar menu has been removed; existing application-specific links and notifications continue to work.
- Local preview API is started with `PORT=52697`; frontend with `VITE_API_URL=http://127.0.0.1:52697` and Vite port 52698.

Local synthetic demo accounts, created and verified through the actual email workflow:

| Role | Email | Password |
| --- | --- | --- |
| HR | teerayut.hr.demo@example.test | InternFlowDemo2026! |
| Student | teerayut.student.demo@example.test | InternFlowDemo2026! |

The demo internship and portfolio use fictional data. They are not real company hiring results or verified student claims.
Local account mail is captured by Mailpit; it is not delivered to Gmail or another real inbox. Search the test inbox by recipient email.

## Gemini configuration and limits

- Credential is stored only in ignored `backend/.env`. No credential is written here, in frontend code or in source control.
- `GEMINI_API_KEY` is configured locally. Current tested `GEMINI_MODEL`: `gemini-3.5-flash-lite`.
- The original `gemini-2.5-flash` returned `404` for this new account; Google's response recommended a newer model. `gemini-3.8-flash` temporarily returned high-demand `503`. The selected Flash-Lite model completed structured JSON generation, PDF evidence analysis and a four-question draft using synthetic data.
- AI requests are server-side, bounded in size and time, and rate limited. Automatic summaries reuse file hashes, job-context hashes, locale and evidence-version snapshots; identical concurrent requests share one operation and cached results do not consume another generation. New generation is capped separately from cached reads. Service/quota/configuration errors are shown to HR; the app does not fabricate an AI result or quietly label deterministic output as AI.
- The application uploader discloses that enabled automatic summary sends selected PDFs/images to Gemini; selecting a file under this label records the sharing choice. The applicant can disable the option for manual HR reading. Existing versions without consent are never automatically sent. Later evidence versions have their own disclosed sharing option. For the unpaid Gemini tier, use sample or de-identified non-confidential material only. Consent does not certify that a document is anonymous, authentic or created by the candidate.
- Before using real confidential/personally identifying documents, configure an appropriate provider/account data policy and disclosure. The app does not automatically redact PDFs.
- Official references: [API keys](https://aistudio.google.com/docs/api-key), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [data terms](https://aistudio.google.com/docs/terms), [document understanding](https://aistudio.google.com/docs/document-processing), [structured output](https://aistudio.google.com/docs/structured-output).

## Email configuration

Local development uses:

```dotenv
FRONTEND_URL=http://127.0.0.1:52698
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM="InternFlow <noreply@internflow.local>"
```

For delivery to real inboxes, set a verified sender and the SMTP host, port and credentials from an email provider in the backend environment. Set `FRONTEND_URL` to the deployed HTTPS origin. Never put SMTP or Gemini credentials in `VITE_` variables. Production SMTP requires TLS. Missing SMTP configuration returns an explicit service configuration error and prevents creation of new unverifiable accounts. Email send failures do not leak whether an address belongs to an account; server logs record the failure without the recipient or token.

Local SMTP container, if starting this preview on another machine:

```powershell
docker run --detach --name internflow-teerayut-mailpit --publish 127.0.0.1:1025:1025 --publish 127.0.0.1:8025:8025 axllent/mailpit:v1.27
```

Use real provider settings for production, a strong `JWT_SECRET`, and a production process configuration. Mailpit is for local development only.

## Storage and authorization

- Upload private files before application through `POST /api/upload/application`, or later evidence through `POST /api/upload/evidence`; its storage location depends on this route, not multipart field order.
- Local private evidence is in ignored `backend/private-uploads` and is not served under the public `/uploads` route.
- Download uses `GET /api/screening/:applicationId/files/:documentId`, with application ownership checks for the candidate or the owning company's HR. Attachment responses disable caching and content sniffing.
- When using S3 later, keep the evidence object prefix private and use the authenticated download route. This work does not change an existing AWS bucket policy.
- PDF/image SHA-256 is recorded with an evidence version and rechecked before AI review; this detects later file changes, not document fraud.
- Job deletion is blocked when portfolio/assessment history exists. HR can close a job instead, preserving those records.

## Database and migrations

- Local Teerayut now uses database `internflow_teerayut`, cloned from the existing local app database without altering the original. It no longer shares schema changes with the Project submission.
- `20261104000000_baseline_alignment` fills the gap between the old August migration history and the already-existing logbook/evaluation schema. Its university cleanup refuses to proceed if legacy university rows or associations exist; migrate/archive such records first.
- `20261104010000_teerayut_screening_and_accounts` adds the new account token, notification, evidence, template, assessment and portfolio review structures. It does not drop application data.
- `20261104020000_application_screening_flow` adds an opt-in `onApply` setting (default false for existing templates) and temporary, owner-scoped AI preview records. It preserves previous applications and frozen assessments.
- Local development schema changes were applied to the isolated Teerayut database and the corresponding migrations were marked as applied after schema verification.
- A fresh disposable PostgreSQL database was built from the entire migration history and compared to `schema.prisma`; the difference was empty. No original database was reset or dropped.
- New installations: install backend dependencies, configure `DATABASE_URL`, run `npx prisma generate` and `npx prisma migrate deploy`, then build/start. Existing development databases that already used `db push` must be checked/baselined before migration deployment; do not use a reset to resolve migration history.

## Validation

- Backend TypeScript build: pass.
- Frontend TypeScript/Vite production build: pass. The two new pages are loaded in separate chunks; an existing main bundle size warning remains.
- HTTP/database regressions: **27 passed** against a new disposable database, including the prior 20 cases plus factual-summary/requirement/source validation and cached automatic summaries with optional HR comments.
- These cover cross-user/company access, answer-key privacy, version immutability, frozen assignment snapshots, concurrent single-use submission, score validation, token expiry/reuse, session invalidation, private file access independent of multipart ordering, notification ownership and history preservation on job deletion.
- Local Chrome desktop and 390px mobile flows: pass. No app runtime errors, no horizontal mobile overflow. Email verification/reset, PDF upload, Gemini PDF review, Gemini question drafting, HR feedback publication, student submission and status notifications were exercised.
- Backend and frontend dependency audits after compatible updates: **0 reported vulnerabilities**. Lint has no errors in the new files; pre-existing warnings in legacy pages remain.
- Test fixtures never call Gemini from the regression runner. Real provider tests used only synthetic content and local demo accounts.

## Current application and HR flow (latest refinement, 4 November 2026)

- Student: Apply -> choose files under the disclosed automatic-summary option -> see file contents and undocumented/partial requirements -> answer a questionnaire if the job enables it -> submit together. There is no AI request or rerun button. AI sharing can be switched off; unsupported files and external links remain available for manual reading.
- The file-only summary does not regenerate when the applicant edits an optional contribution/skills claim. Changing files, the role context or locale invalidates the relevant cache. Supported files are summarized in bounded groups (up to 3 files and 10MB of raw file data per provider request).
- Before application submission, summaries are stored privately for one hour with file hashes and the job-context hash. Submission verifies ownership, the supported file set, consent and context, then maps all citations to final evidence IDs. Existing evaluative AI reports remain stored historically but are not displayed as the new factual summary.
- After submission, HR Applicants automatically loads/reuses current summaries for consented supported evidence. List cards show a concise portfolio inventory and exact missing/partly documented role requirements. Detail dialogs show the same information with source documents, questionnaire answers and the original evidence versions. Files without consent are not sent automatically.
- The portfolio evaluation form has been replaced with one **HR comments (optional)** textarea. It starts empty, is never filled by AI, and can be left blank without blocking application status changes or creating a pending-comment requirement. Saving nonempty comments shares them with the applicant. Questionnaire scoring remains a separate manual HR activity.
- Questionnaire generation now uses the full description instead of only title/requirements. Source IDs are constrained to actual role content and original quotes are attached server-side. A separate relevance audit inspects prompts, every option and expected answers. Drafts must contain explanations and practical tasks instead of only multiple choice. HR reviews and saves; already-assigned questionnaires are unchanged.
- Validation: actual Gemini tests on fictional social-marketing and warehouse roles, actual PDF summary during upload without an AI button, no unsupported evaluative report fields, one automatic request despite editing optional claims, cached summary reuse, atomic application/answer submission, blank optional HR comments, and a status transition without comments. Desktop and 390px mobile flows had no app runtime errors. New components passed lint. The existing main-bundle size warning remains.
- Gemini is still the configured provider. No OpenAI key from chat was saved, tested or sent to an API as part of this change. A key identifies credentials, not a model or a measured quality improvement; a provider/model comparison would require a separate controlled evaluation.

## Thai text encoding fix (4 November 2026)

- Fixed the Gemini HTTPS response reader to decode UTF-8 across network chunks. Previously, independently decoding each chunk could split Thai characters or emoji and introduce U+FFFD replacement characters.
- New malformed AI text is rejected before persistence, including escaped replacement characters in parsed JSON. Existing damaged summaries are bypassed in caches and are not selected for the live summary cards.
- Regenerated the two affected current Thai portfolio summaries from the original consented evidence files. Manual comments and evidence history were preserved; historical AI rows were not deleted.
- Added a regression that sends the actual provider-response parser one byte at a time and verifies the Thai and emoji strings remain exact. Backend build and 23 regressions passed.

## Question draft recovery and HR review order (4 November 2026)

- Relevance checking now accepts normal beginner features of advertised tools even in a short listing. A specific rejected question is revised once using the review reason and checked again; accepted questions stay unchanged.
- If only part of the requested set passes, return those checked questions with an explicit partial-result notice. Do not discard the whole set or label unreviewed questions as checked. Provider/quota failures remain errors and existing saved/manual questions are untouched.
- Digital Engineering (React, JSON and Python) was tested against the actual listing and produced four checked draft questions. Regressions cover targeted repairs, retaining accepted questions, partial notices, total failure and provider-error handling.
- HR review now starts with the evidence timeline directly below the candidate header. The duplicate embedded page introduction is removed, and Previous/Next resets the panel to the top. AI summary and questionnaire remain below the evidence.

## Optional HR drafting prompt and evidence coverage (4 November 2026)

- HR can tick **Customize the AI question draft / กำหนดแนวคำถามให้ AI** to reveal a prompt textarea (up to 2,000 characters). The option is off by default. Ticking it with blank text disables AI drafting until HR enters a preference or switches the option off; it does not prevent saving manually written questions.
- The preference applies to this drafting request, rather than being saved as an extra job setting. Focus, difficulty, scenario and format preferences are passed to generation, relevance auditing and targeted repairs. The actual role context remains authoritative. Supported custom compositions such as all multiple-choice are allowed; default drafts still require explanations and practical tasks. Invalid prompt types and oversized values are rejected before provider calls.
- The role-description box in application details now shows **requirement evidence coverage** and **evidence points**, calculated from the existing factual summary. Each actual requirement has equal weight: FOUND = 1, PARTIAL = 0.5, NOT_FOUND = 0. Percentage = earned points / number of requirements * 100, rounded to one decimal. For example, two documented requirements out of three show 66.7% and 2/3 points. This is not an AI rating of ability or a hiring decision, and it is separate from HR assessment scores.
- The formula and found/partial/not-found counts are visible in the card. Missing requirements, unreadable/no summary, failed summarization or a changed job-context hash show unavailable instead of a misleading zero score. Computing the display does not make another AI request.
- Backend regressions: 27 passed. Frontend and backend builds passed; the new components passed lint. Actual Gemini and UI testing confirmed the prompt toggle, blank-prompt guard, React-only multiple-choice preference, 66.7% and 2/3 evidence points, the calculation explanation and 390px mobile layout. Existing saved/assigned questions were not overwritten by those tests.

## Possible next work - not implemented

1. Offer expiry, readiness confirmation shortly before the first day, and HR recording actual attendance on day one.
2. Deadline-based reminders and a queue for overdue logbooks or pending mentor review.

These remain proposals requiring the user's selection. OCR transcript verification, job recommendation scoring, AI authorship/fraud detection and additional automatic hiring decisions were not added.
