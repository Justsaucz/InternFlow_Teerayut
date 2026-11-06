# Workspace refresh and verified unused-code cleanup

3 November 2026. Applied independently to Project and Teerayut. The projects retain their own API, storage, workflow, environment, and database configuration.

## Visible changes

- A forest-green sidebar, sage active navigation, warm neutral canvas and clearer page headings replace the mixed workspace styling.
- The Dashboard now uses a compact greeting, existing workflow shortcuts, readable metric cards and a separate activity feed. It still uses the original dashboard API and existing role-specific metrics.
- Search, applications, daily logs, student/company profiles, job management, applicants and evaluations share consistent page headers, controls, borders, typography and spacing.
- Public profile details, daily-log forms, job-posting forms, mentor review and rubric forms share modal styling. Long forms remain scrollable and mobile hour presets wrap instead of clipping.
- The job-management table uses explicit column widths and retains horizontal scrolling on narrow screens.
- Workspace styling is scoped to screen media; the existing printable evaluation report remains governed by its print rules.

## What was actually removed, in both projects

| Item | Evidence / preservation |
| --- | --- |
| `src/assets/react.svg`, `src/assets/vite.svg`, old `src/assets/hero.png`, `public/icons.svg` | No remaining references in the application source, configuration or repository text documents. The current landing illustration is CSS-based. The referenced favicon was retained. |
| Frontend direct dependency `axios` | All current application HTTP calls use fetch; repository searches found no axios imports or calls. npm regenerated each lockfile. No existing retained package version changed. |
| `glass-panel`, `glass-dark`, unused animation classes and bounce keyframes | No consumers remained. The pulse keyframes used by the new dashboard loading state were retained. |
| Old `dashboard-hero` and `stat-card` style rules | Their JSX consumers were replaced by the new Dashboard components. |
| Unused `jsonwebtoken` import and `JWT_SECRET` constant in `test_commitment_flow.ts` | TypeScript reported them as unused; the script's actual workflow was retained. |
| Unread `job2` and `appInnovate` result bindings in `seed.ts` | Only the unused local variable bindings were removed. The awaited database create calls and generated seed records were preserved. The seed script was not run against the user's data. |

Historical Prisma models, legacy data, independently runnable scripts, migrations, report artifacts and currently used upload dependencies were retained. An unreferenced export or historical table was not treated as disposable solely because the current UI does not use it.

## Verification

- Both frontend TypeScript checks and production builds pass. On Project, a fresh temporary output directory was used because Windows held a handle on the old `dist/assets` directory.
- Both backend projects pass TypeScript with `--noEmit --noUnusedLocals`.
- Responsive coverage: 13 pages at 1440/768/390/360 pixels per project (104 checks).
- Landing, language switching, filters, login destinations and mobile navigation: 20 interaction checks across both projects.
- Desktop/mobile profile editing and existing modal flows: 24 checks across both projects.
- Project's real Robot Framework suite: 20/20 passed after the workspace markup update.
- These are local functional/layout checks, not load testing or an AWS deployment. The pre-existing bundle-size warning remains; code splitting is a separate optimization.

No target-hours percentage, curriculum configuration, OCR, AI matching, notifications or other new product workflow was added. The Logbook displays real logged and approved hours. The API's fixed targetHours value is currently not used to display a percentage or enforce curriculum completion.

See `REPORT_LINE_EDITS_2026-11-03.md` in Project for the requested page/text replacements in the original report. That document does not overwrite the PDF.
