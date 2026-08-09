# Time Keeper

A personal billing and time-tracking app for William, replacing his paper daytimer and consolidating monthly billing prep. The active build is `timekeeper.html` — a single self-contained HTML file (React loaded from cdnjs at runtime, no build step).

If you're an AI session picking this up, read these in order before making changes:

1. [`docs/INTENT.md`](docs/INTENT.md) — purpose, design principles, non-goals.
2. [`docs/SPEC.md`](docs/SPEC.md) — architecture, data model, settled UX decisions, open questions.

## Quick orientation

- **Active code:** `timekeeper.html`. The earlier `timekeeper.jsx` is a historical artifact from the original Sonnet prototype, kept only for reference.
- **The Log tab is a vertical 7 AM – 7 PM daytimer-style timeline.** Click-and-drag creates entries. The timeline IS the log for the current day; don't add a separate per-day list view.
- **Storage is currently `localStorage`** under keys prefixed `tk_`. The production target is the File System Access API plus a hash-chained append-only audit log. That wiring is pending — see Open Questions in `SPEC.md`.
- **AI note expansion is end-of-month batch only.** Don't add per-entry AI buttons or "needs AI expand" affordances to the Log tab. AI belongs in the Export workflow.

## Export targets (templates received April 2026)

Office templates are in the repo root:
- `EXAMPLE_TIME SHEET April 26.xls` — weekly Excel timesheet
- `EXAMPLE_2311 - Job Description - Seaplace.doc` — monthly per-project Word job description

**Excel format:** Columns are `Project / Client Name | Job # | Services | Tasks | Mon–Sun | TOTAL | Billable hours *`. The project `code` field = Job #, `serviceCode` = Services, `taskCode` = Tasks. Footer rows: Continuing Education, AIA Awards, Marketing, Marketing (Public), Overhead, TOTAL HOURS WORKED, Mileage/Tolls/Reimbursables, TOTAL HOURS TO BE PAID, NAME, WEEK ENDING. Marketing (Public) is our own addition (not in the office template) — the accountant tracks municipal/school-board proposal & RFP/RFQ work separately from general marketing.

**Word format:** One document **per project** (not combined). Header: JOB NAME, JOB #, BILLING PERIOD, SERVICE CODE #, CODE. Body: two-column table of `week ending | Descriptions`, grouped by the Friday week-ending date within the billing month.
