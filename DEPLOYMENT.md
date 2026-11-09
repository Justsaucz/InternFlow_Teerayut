# InternFlow free hosted demo

Frontend: https://internflow-teerayut-justsaucz.eloquentorangutan2.chatgpt.site

API: https://internflow-teerayut-api-lrov.onrender.com

## Hosting

- The original source at D:\Work2\internFlow_teerayut\InternFlow was not modified.
- GitHub branch: deploy/sites-render.
- Sites project: appgprj_6af1b3df014081918df0c96de156ccc0. Frontend source commit: c81430b79d53af84b02be01edf9a0774c83bbe31 in the separate Sites source repository.
- Sites audience remains owner-private/custom. Add approved viewers to share privately. The private frontend is not anonymously accessible.
- Render workspace: tea-dbor56h5efls73eoq310. Service: srv-dborm1ec6qcc738i0pa0. Plan: Free, Singapore. Auto-deploy is disabled.
- Render Blueprint: exs-dborfb95efls73epj970. First successful deployment: dep-dborm2ec6qcc738i0s50.
- Neon project: dawn-haze-66672812. Database: internflow. Plan: Free, Singapore. The app does not use the 30-day Render database trial.
- Credentials are runtime settings. No connection URL, JWT secret or service token is committed.

## Demo

The login page offers Student, Intern and HR account buttons. Shared sample password: InternFlowDemo2026!

- student@internflow.example.test: apply to internships.
- intern@internflow.example.test: committed placement, logbooks and evaluations.
- hr@internflow.example.test: jobs, application review and evaluations.

These are shared synthetic accounts. Do not enter personal data. Idempotent startup seeding never deletes or resets records; the original destructive seed script is not used.

DEMO_MODE=true permits trial registration without sending verification mail. Such addresses are not verified. Normal production verification remains unchanged when the flag is disabled. Outbound account email and AI functions are not configured for this free demo.

FILE_STORAGE=database stores attachments in PostgreSQL rather than the temporary Render filesystem. Existing document/logbook authorization protects private files. Demo limits: 100 MB of stored files total, 5 MB per file.

The frontend requests noindex/nofollow/noarchive. Search-indexing preferences are separate from access control.

## Verification

- Frontend TypeScript and Vite production build passed.
- Backend TypeScript compilation passed.
- Render built the Docker image, applied migrations and reported live status.
- Live login passed for all three sample roles; three sample jobs were returned.
- A synthetic PDF was uploaded to PostgreSQL and downloaded byte-for-byte by its owner and the associated HR account.
- Anonymous, unrelated-user and direct private-URL requests were denied.
- Initial database size: approximately 8 MB.
- Browser automation could not attach to an in-app browser tab; visual browser QA is unverified.

## Free limits

Render Free can sleep when idle, making the first request slow. Neon Free has resource quotas but no 30-day trial expiry. Do not upgrade plans without an owner request.

