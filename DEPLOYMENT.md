# InternFlow cloud deployment

## Prepared source

- Original source: `D:\Work2\internFlow_teerayut\InternFlow`.
- GitHub: `https://github.com/JustSaucz/InternFlow_Teerayut`.
- Deployment branch: `deploy/sites-render`.
- The local, uncommitted CompanyApplicants UI was retained in this copy.
- Local environment files, databases, and uploaded documents are excluded.

## Target architecture

- Sites serves the existing React frontend.
- Render runs the existing Express API and PostgreSQL 16 in Singapore.
- A 1 GB persistent disk stores public images and private attachments in separate directories.
- The Docker image builds compiled JavaScript, applies Prisma migrations, and starts the server without a development watcher.
- Auto-deployment is disabled; review the initial Render Blueprint plan before applying it.

## Site identity (registered, not published)

Project: `appgprj_6af1b3df014081918df0c96de156ccc0`

Expected origin: `https://internflow-teerayut-justsaucz.eloquentorangutan2.chatgpt.site`

The expected origin is reserved metadata, not evidence that the website is live.

The separate frontend checkout is `../internflow-site`, with the Site identity persisted in `.openai/hosting.json`.

## Remaining work

1. Obtain GitHub write access, push this branch, and verify the remote commit.
2. Create a Render Blueprint plan for this branch in confirmed workspace `tea-dbor56h5efls73eoq310`, with autoSync disabled.
3. Review the planned resources and costs with the user before applying the plan.
4. Configure a real outbound email provider in the API Environment settings. `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` are required by this Blueprint; localhost/Mailpit is not an online email provider. Never commit their values. The application requires email delivery for registration and password recovery.
5. If AI functions are wanted, configure `GEMINI_API_KEY` and a supported `GEMINI_MODEL` without committing the key.
6. Apply the approved plan and verify its exact API URL and `/api/health`. Do not seed demo accounts automatically.
7. Set `VITE_API_URL` to that verified HTTPS API origin when building the Sites frontend. The current localhost fallback must not be used in the deployed build.
8. Package and push the Sites frontend source, save and deploy the resulting exact commit, then verify the site and critical workflows.
9. Clarify whether anonymous/public Site access is required before changing the initial owner-private audience.

## Validation

- Frontend TypeScript project build passed.
- Frontend Vite production build passed with `--configLoader runner`; this avoids writing temporary configuration into the read-only shared dependency directory during local validation.
- Backend TypeScript compilation passed.
- Docker image execution and cloud database/email integration have not yet been verified.

The local dependency junctions are for validation only. They are Git-ignored; Render installs its own dependencies using `npm ci`.

- Render Blueprint structure validated against the current official JSON Schema (2020-12) using Ajv.

