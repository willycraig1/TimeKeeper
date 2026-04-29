# Time Keeper — Intent

## Purpose

Time Keeper is a personal billing and time-tracking tool for William. It replaces a paper daytimer for daily time logging and consolidates monthly billing prep — a weekly Excel timesheet and a monthly Word document of work descriptions — into a single workflow.

The app is a personal tool, not a product. There is no expectation that anyone but William will use it.

## User and context

William is a solo professional billing time to clients across multiple projects. He logs hours throughout the day, then at month-end produces:

- A weekly Excel timesheet (project-by-day pivot grid).
- A monthly Word document of work descriptions, one row per project.

He is a visual thinker. The Log tab needs to feel like a paper daytimer page, not a generic time-tracker form.

## Operating environment

- Windows desktop. Browser scope is Microsoft Edge or Google Chrome (Chromium-based — File System Access API is supported there).
- The app ships as a single self-contained HTML file. Open it from a folder; no install, no server, no auth.
- All data persists locally; no cloud sync.

## Constraints

### Auditability

Time entries and billing records must be auditable for IT and compliance. The IT department must be able to point to a real file path and back it up like any other document.

This drives several non-negotiable decisions:

- Data lives in a JSON file on disk, not in opaque browser storage long-term. (localStorage is acceptable during development. The production architecture uses the File System Access API to read and write a folder the user picks once.)
- An append-only audit log file records every add, edit, delete, and export with timestamps.
- A compliance export reformats the audit log for review.

### Single-file delivery

The app must be runnable by double-clicking an HTML file in Edge or Chrome. No build step at deploy time, no `npm install`, no separate config files. Loading React, Babel, and SheetJS from cdnjs at runtime is acceptable.

### Privacy and no third-party calls during normal use

The daily logging flow makes zero outbound network requests. The only AI integration runs once a month on demand and requires the user to invoke it explicitly.

## Design principles

**Daytimer metaphor over time-tracker UI.** The Log tab is a vertical column of hours. Entries are visual blocks placed at their actual start times. Click-and-drag is the primary input gesture. The timeline IS the log; there is no separate per-day list view for the current day.

**Friction-free daily logging.** Adding an entry should take three actions: drag, pick a project, type a brief note. No required AI step, no required formatting, no fields that exist only to satisfy the data model.

**AI is end-of-month polish, not daily friction.** AI expansion of brief notes into billable descriptions runs as a single batch when generating the monthly Word export. It is not invoked per-entry. The Log tab does not display "X notes need AI expand" or per-entry AI buttons.

**Visual data density, with hover affordances.** Entry blocks pack as much information as their height allows (project, time range, hours, note). Anything that won't fit is available via a native `title` tooltip on hover.

**Auditability is a feature, not an afterthought.** When a data-shape decision trades off against audit clarity, audit clarity wins.

**Local-first, no surprises.** No analytics. No telemetry. No background fetches.

## Non-goals

- Multi-user support, sharing, or collaboration.
- Mobile or tablet layouts. Desktop only; touchscreen support is incidental.
- Cloud backup or sync. IT-level file backup of the chosen folder is the backup strategy.
- Live "clock in / clock out" tracking. Entries are recorded after the fact.
- A general-purpose time tracker for arbitrary users. Design choices are tailored to William's workflow.
