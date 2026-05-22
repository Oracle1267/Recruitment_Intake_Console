# Recruitment Intake Console

Recruitment Intake Console is a Kappa Sigma-branded recruitment operations tool. The current product focus is no longer unknown-prospect discovery from public internet searches; it is intake, review, dedupe, promotion, and follow-up for legitimate chapter recruitment funnels.

This repository contains a split-stack MVP application for fraternity recruitment intake and prospect operations.

## App Development

Recommended setup:

```powershell
cd C:\Projects\rushintel
.\scripts\setup.ps1
```

Run both servers in separate PowerShell windows:

```powershell
.\scripts\dev.ps1
```

Run verification:

```powershell
.\scripts\test.ps1
```

Backend:

```powershell
cd C:\Projects\rushintel\backend
..\.venv\Scripts\python.exe -m pytest tests -q
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Frontend:

```powershell
cd C:\Projects\rushintel\frontend
npm install
npm test -- --run
npm run build
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001` before starting the frontend when you want it to read live backend data. Without that variable, the dashboard stays blank instead of showing sample prospects.

## Intake Workflow

The primary workflow is chapter-controlled intake:

1. Add leads from member referrals, opt-in forms, event check-ins, manual notes, or chapter-approved CSV sheets.
2. Review each lead with source context, evidence, notes, and contact fields.
3. Check duplicate groups by handle, email, or name before promotion.
4. Promote qualified intake leads into the prospect pipeline.
5. Reject or mark Removed / N/A with a reason when a lead is not appropriate.
6. Use the existing pipeline, follow-up, source mix, and removal controls for ongoing recruitment operations.

The Intake Console is the main surface. It supports single lead entry, pasted CSV import, source-type labeling, duplicate review, and promotion to prospects. It is branded with Kappa Sigma scarlet, emerald, white, and gold accents.

Expected CSV headers include `name` or `first_name`/`last_name`, plus optional `handle`, `email`, `phone`, `interests`, `notes`, `referred_by`, and `event_name`.

The older public-source discovery code is still present in the backend for auditability and possible future deletion, but it is no longer the main product path and is not shown on the main dashboard.

## Handoff

Target handoff repository:

- https://github.com/Oracle1267/Recruitment_Intake_Console

Keep `.venv`, `node_modules`, local databases, generated caches, and local logs out of the repository.

## MVP Boundaries

The current app slice supports recruitment intake, CSV import, duplicate review, prospect promotion, follow-up tracking, and removal/N/A review. Platform scraping, browser-extension extraction, mass messaging, hidden/private content collection, deleted-content recovery, deceptive accounts, and high-risk OSINT tooling are out of scope.
