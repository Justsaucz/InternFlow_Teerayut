# InternFlow live application

Frontend: https://internflow-teerayut-justsaucz.eloquentorangutan2.chatgpt.site

API: https://internflow-teerayut-api-lrov.onrender.com

## Hosting

- Original source in D:\Work2\internFlow_teerayut\InternFlow remains unchanged. Deployment source is on GitHub branch deploy/sites-render.
- Sites project: appgprj_6af1b3df014081918df0c96de156ccc0. Its audience remains owner-private/custom. Sharing with other people requires approved viewers or an explicit audience change.
- Render workspace: tea-dbor56h5efls73eoq310. Service: srv-dborm1ec6qcc738i0pa0. Plan: Free, Singapore. Auto-deploy is disabled.
- Neon project: dawn-haze-66672812, database internflow, main branch br-snowy-flower-aztdr1m6. Plan: Free, Singapore, with no 30-day Render database trial.
- Keep secrets in runtime settings. Do not commit DATABASE_URL, JWT_SECRET or GEMINI_API_KEY.

## Real accounts and data

There is no demo banner, shared-account login control or automatic sample seeding. The three previous sample jobs were closed and shared accounts revoked; no real user data was deleted. New companies create their own listings and students create their own accounts.

NEON_AUTH_URL enables managed account signup, login, one-time email verification codes, password-reset codes, and logout. Signup creates an application profile for the authenticated Neon identity. Email ownership is required. Each application token carries a managed session; middleware verifies that session, local account version and role on protected requests. Password resets revoke managed sessions and advance the application password version.

Neon's shared email service delivers verification and reset codes within its free limits. Dedicated sender branding and higher email volume would require separate SMTP configuration. OTPs are entered on the site's verification/reset pages. No email passwords or OTP values are logged.

The existing Gemini key and configured model are supplied only to the API runtime. AI document processing still requires the application's explicit user consent and is subject to the Google project's quota. Manual review remains available when the AI quota is exhausted.

FILE_STORAGE=database preserves files across Render restarts. Existing ownership and company authorization protect private files. The current application cap is 100 MB of stored uploads, 5 MB per file. No ephemeral Render disk is used for hosted uploads.

Recommended-job cards select actual open job listings; they do not represent paid sponsorship purchases. The original source contained a visual sponsorship preview, not a payment processor.

## Validation

- Frontend TypeScript/Vite production build and backend TypeScript compilation passed.
- On the isolated QA database/auth branch br-little-rain-azao9g4y, tested real account creation, rejection of unverified login, verified login, profiles, role enforcement, job publishing, application/acceptance/commit, logbook approval, evaluation/report, notifications and managed session revocation on logout.
- Only the isolated QA branch manually marked fixture emails verified. The main branch requires actual email verification and was never relaxed.
- Gemini returned the expected structured JSON using the existing key and configured model.
- Previously verified byte-for-byte file upload/download, owner/company access and denial to unrelated/anonymous visitors.
- The actual email delivery step must be confirmed by a recipient checking their inbox during signup; no personal recipient was used for automated tests.
- Visual browser automation is unavailable in this session; deployed HTML, assets and SPA routes are checked over HTTP.

## Limits

Remain on Free plans unless explicitly instructed otherwise. Render Free can sleep when idle. Neon and Google enforce resource/API quotas. No provider upgrade or payment service was enabled.
