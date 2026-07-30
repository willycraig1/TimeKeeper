# Time Keeper — Specification

This document is the engineering reference for the project. It captures architecture, data shapes, settled UX decisions, and open questions. If a future Claude session or human collaborator picks this up, this is the doc to read after `INTENT.md`.

## File layout

```
Time Keeper/
├── timekeeper.html      Active application (single self-contained HTML file).
├── timekeeper.jsx       Historical prototype from the initial Sonnet artifact. Not used at runtime; kept for reference.
├── CLAUDE.md            Bootstrap pointer for AI sessions.
└── docs/
    ├── INTENT.md        Purpose, principles, non-goals.
    └── SPEC.md          This document.
```

`timekeeper.html` is the single source of truth for code.

## Architecture

- Single self-contained HTML file.
- Loads React 18 (UMD), ReactDOM 18, Babel-standalone, and ExcelJS from cdnjs at runtime. JSX is transpiled in-browser via Babel. ExcelJS (not SheetJS) was chosen because it supports writing cell styles (fonts, borders, fills) for free — SheetJS's community edition only supports that on the paid Pro tier.
- All state lives in React. Persistence goes through a thin storage layer (currently `localStorage`).
- No build step. No server. Open the file in a Chromium-based browser.

The intent is to keep this property — single-file, no build — through the production rebuild. The production version replaces `localStorage` calls with File System Access API calls but does not introduce a build pipeline.

## Component map

- **`App`** — root component. Holds projects, entries, current tab, selected day, and the `pending` state that drives both the modal and the persistent ghost block on the timeline.
- **`ProjectPicker`** — custom dropdown rendering project color swatches inline. Used in the entry modal. Replaces native `<select>` because native selects can't render colored chips reliably across Chromium.
- **`DayTimeline`** — the daytimer-style vertical column. Owns its own drag state and the timeline-extension toggle state. Receives `pending` from `App` to keep the ghost block visible during modal entry.
- **`EntryModal`** — the entry-creation dialog. Reads initial start time and duration from `pending`.

## Data model

### Project record

```jsonc
{
  "id": "string",          // generated, or a reserved ID for protected entries (see below)
  "name": "string",        // Project / Client Name column in the timesheet
  "code": "string",        // Job # (e.g. "2311") — maps to the Job # column
  "serviceCode": "string", // Services code (e.g. "2.6") — maps to Services column
  "taskCode": "string",    // Task code (e.g. "CA", "SD") — maps to Tasks column
  "color": "string",       // hex from PALETTE
  "billable": true,        // false on non-billable and overhead projects
  "overhead": false        // true only on the 4 overhead entries (CE, AIA, Marketing, Office)
}
```

`serviceCode` and `taskCode` were added in v2 of the project schema. `overhead` was added in v3. Legacy records without these fields render fine — the fields are optional in all display contexts.

#### Three-tier project model

| Type | `billable` | `overhead` | Excel timesheet | Word descriptions |
|------|-----------|-----------|-----------------|-------------------|
| **Billable** | `true` | — | Billable rows | Included |
| **Overhead** | `false` | `true` | Fixed overhead rows (CE, AIA, Marketing, Overhead) — auto-filled | Excluded |
| **Offsheet** | `false` | — | Excluded | Excluded |

**Protected IDs** (cannot be deleted):
- `_nonbillable` — the single offsheet entry (lunch, errands, admin)
- `_ce`, `_aia`, `_marketing`, `_office` — the four overhead entries

All protected entries are pre-seeded on first run and backfilled if missing from stored data.

### Entry record

```jsonc
{
  "id": "string",          // Date.now() string
  "date": "YYYY-MM-DD",
  "projectId": "string",
  "hours": 0,              // duration in hours, snap to 0.25
  "startMinutes": 0,       // minutes since midnight
  "note": "string",        // user-entered brief note
  "aiNote": ""             // populated by end-of-month AI step (currently unused)
}
```

`startMinutes` was added in v3 of the entry schema. Legacy v2 entries are migrated on load by `loadEntries()` — missing `startMinutes` is backfilled per-day starting at 9:00 AM and stacking by entry order.

## Storage

### Current (development)

Data is in `localStorage` under stable keys:

| Key                       | Shape                                            | Purpose                                         |
|---------------------------|--------------------------------------------------|-------------------------------------------------|
| `tk_projects_v2`          | Array of Project records                         | Project list, including the non-billable entry  |
| `tk_entries_v3`           | Array of Entry records                           | All time entries                                |
| `tk_timeline_range_v1`    | `{extendedStart: bool, extendedEnd: bool}`       | User's preferred timeline-extension state       |

### Target (production)

File System Access API. The user picks a folder once; the app then reads and writes:

- `data.json` — projects + entries.
- `audit.log` — append-only newline-delimited JSON. One record per add / edit / delete / export, with ISO 8601 timestamp, action, record ID, and before/after values for edits.

Writes are atomic (write to a temp file, then rename) so a crash mid-save can't corrupt the data file.

The audit log entries should be hash-chained: each record carries the SHA-256 of the prior record's serialized form, so any tampering downstream is detectable. This is part of the production target, not yet implemented.

A separate compliance export reformats the audit log for review by IT.

## UI structure

Three top tabs: **Log time**, **Projects**, **Export**.

### Log tab (top to bottom)

1. **Stat row** — billable hours this month, non-billable hours this month, active billable projects, total entries.
2. **Day selector** — date input + "Today" shortcut. Determines which day the timeline shows.
3. **DayTimeline** — vertical 7 AM – 7 PM column by default, with toggles to extend either end to midnight. Hour labels and gridlines on the left, interactive entry area on the right.
4. **Browse Month** — flat scan of past entries grouped by date, sorted by start time within each date. Click a date header to jump the timeline to that day.

### Projects tab

List of projects with add and remove. The non-billable project is delete-protected. Color picker uses the 18-color PALETTE.

### Export tab

- **Weekly Excel timesheet** — pivot grid (project × day) for any week. Billable only.
- **Monthly Word descriptions** — one row per project with concatenated notes. Billable only.

Both exports filter out entries whose project has `billable: false`. Format details are placeholders pending the office's actual templates (see Open Questions).

## Drag interaction (the daytimer flow)

1. **Mousedown** anywhere in the timeline area sets the new entry's start time. The y-position you click maps to a time, snapped to 15 minutes.
2. **Drag down** sets the duration. A diagonal-striped indigo "ghost" block grows from start to current y. Up-drag is not supported — duration cannot grow backward.
3. **Mouseup** opens the entry modal. The ghost block stays visible during the modal so the user can see what they're committing to (with a subtle outer ring and "awaiting details…" label so they can tell it's no longer being dragged).
4. **Modal** shows: start time (editable, HH:MM), duration in hours (editable, 0.25 step), project picker, note. Esc or click-outside cancels.
5. **Confirm** turns the ghost into a real entry. **Cancel** clears the ghost.

The pending state lives in `App`, not in `DayTimeline`, so it can drive both the modal and the ghost block simultaneously.

## Settled UX decisions

These have been validated by William and should not be reverted without his input:

- **Timeline is vertical, not horizontal.** Models a paper daytimer page.
- **Default visible range is 7 AM – 7 PM.** Independent toggles at the top and bottom of the timeline let the user extend either end to midnight. State persists across reloads.
- **`HOUR_PX = 64`.** Confirmed legible. Don't shrink without checking. Trade-off: 12-hour view is ~768 px tall; 24-hour is ~1536 px and scrolls.
- **15-minute snap** on drag and on the modal duration input.
- **Drag is down-only.** Start time is the click point; duration grows from there.
- **Ghost block persists from drag-release through the modal lifecycle.** Ghost disappearing during modal entry was explicitly flagged as wrong.
- **Entry block info is tiered by height.** Top line (project + compact time range + hours) always shown. Note appears at ≥48 px. Full info available via native `title` tooltip on hover regardless of size.
- **Non-billable project pre-seeded and protected.** Excluded from both Excel and Word exports. Visual cue is a dashed left border and an "NB" badge.
- **AI is end-of-month batch only.** Not per-entry. No AI buttons on the Log tab. The expansion step belongs in the Export workflow when the Word export is finalized.
- **18 colors in PALETTE.** The project picker is a custom dropdown (not native `<select>`) so color swatches render reliably.
- **Single integrated calendar+log surface for the current day.** No separate per-day list. The "Browse Month" flat list below the timeline is for scanning past entries.

## AI flow (planned)

End-of-month, before generating the Word descriptions document, the user kicks off an AI-expansion step that takes all the month's brief notes and produces polished billable descriptions.

Two viable strategies (decision pending — see Open Questions):

- **Manual paste.** App generates a single prompt with all notes; user pastes into Claude (web or desktop) and pastes the response back. Zero infrastructure, zero key management.
- **Local helper.** A small local script holds the API key and forwards calls. Adds an install step.

A third option — skip AI entirely and use raw notes — is on the table if William's raw notes are already close to billable language.

The Log tab has no AI affordance regardless of which strategy wins; AI lives only on the Export tab.

## Open questions / pending input

1. **Office Excel and Word format templates.** ~~Pending.~~ Templates received (April 2026). Excel: `EXAMPLE_TIME SHEET April 26.xls`; Word: `EXAMPLE_2311 - Job Description - Seaplace.doc`. Data model updated. Export rewrites are next.
2. **AI flow choice.** Manual paste vs. local helper vs. skip — decide after seeing the format the AI must hit.
3. **Entry overlap behavior.** Currently allowed; overlapping blocks render stacked. Decision pending: enforce no-overlap, lay overlapping entries side-by-side in lanes, or leave as-is.
4. **Entry editing.** Current actions on an existing entry are limited to delete. In-place editing of start time, duration, project, or note is not yet implemented.
5. **Compliance export of the audit log.** Format and trigger TBD. Depends on what compliance needs to see.
