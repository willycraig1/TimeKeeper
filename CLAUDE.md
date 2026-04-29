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

## Pending input

William is providing the office's actual Excel and Word export templates. The current exports are placeholders. Format may pull on the data model — hold off on File System Access wiring until the templates are in.
