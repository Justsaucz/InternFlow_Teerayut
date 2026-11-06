# UI refresh - 3 November 2026

Applied the user's selected direction to Project and the independent Teerayut submission: restrained green, light neutral surfaces, readable Thai/English typography and a professional workspace.

## Presentation changes

- Redesigned the public landing page with a split hero, a workflow illustration, actual open-job counts, a clear search form, accessible category shortcuts, opening cards, process explanation, employer callout and FAQ.
- Kept the existing job API, filtering state and application/login links. Landing section navigation now uses scrolling buttons, so it also works with the optional cloud HashRouter build.
- Added Thai font support, consistent brand styling, focus-visible states, reduced-motion support and clearer secondary text.
- Refined the sidebar, active navigation, header, dashboard greeting/metrics, authentication pages, input fields, buttons, cards and table styling. Existing mobile-menu focus/close behavior remains.
- Removed workspace labels that implied a live university-ledger integration. This is a copy correction, not a new integration.

## Independent submissions

Only shared presentation changes were applied to Teerayut. Its API logic and environment were retained. Project's production storage/migrations/IAM/configuration work was not copied to Teerayut. The projects now have separate local databases; no ongoing code synchronization was configured.

## Verification

The final verification passed both frontend TypeScript/build checks, 104 page/viewport checks (13 pages at 1440/768/390/360 pixels per project), 20 interaction checks across both projects, the Project Robot Framework suite (20/20) and Teerayut's HTTP regression suite (12/12). Interaction checks include Thai/English switching, landing/authentication layouts, search/filter/FAQ/category/login-destination interactions and mobile navigation. The production container build additionally passed 22 workflow checks in hash-route mode. The workspace `tmp/ui-refresh` contains detailed results; selected previews are in `output/ui-refresh` outside this repository.

These checks do not establish production load/availability or that every possible input is bug-free. AWS resources remain uncreated pending the course account and account-specific validation.
