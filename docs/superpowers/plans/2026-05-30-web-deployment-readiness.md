# Web Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Recruitment Intake Console deployable as a browser-based app at `recruitment.threadandsignal.org`.

**Architecture:** Render hosts a Python FastAPI backend, a Next.js frontend, and Postgres. The frontend owns the public URL and login session, then proxies browser API calls to the backend with a server-side API key. The backend also accepts direct server-side reads from the frontend using the same API key.

**Tech Stack:** FastAPI, SQLAlchemy, Postgres via psycopg, Next.js App Router, Render Blueprints, Namecheap DNS.

---

### Task 1: Backend Production Settings

**Files:**
- Modify: `backend/app/database.py`
- Modify: `backend/app/main.py`
- Modify: `backend/requirements.txt`
- Test: `backend/tests/test_api.py`

- [ ] Add Postgres driver support with `psycopg[binary]`.
- [ ] Normalize Render-style Postgres URLs so SQLAlchemy uses the psycopg driver.
- [ ] Add `RUSHINTEL_API_KEY` middleware that protects all API routes except `/health`.
- [ ] Add `CORS_ORIGINS` parsing for production frontend domains.
- [ ] Add backend tests proving the API key gate blocks unauthenticated requests and permits valid keyed requests.

### Task 2: Frontend Login And API Proxy

**Files:**
- Create: `frontend/src/lib/auth.ts`
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/api/login/route.ts`
- Create: `frontend/src/app/api/logout/route.ts`
- Create: `frontend/src/app/api/backend/[...path]/route.ts`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/lib/intake.ts`
- Modify: `frontend/src/lib/prospects.ts`

- [ ] Add a shared-password login using `RUSHINTEL_APP_PASSWORD`.
- [ ] Store a signed, HTTP-only session cookie.
- [ ] Require the session on the main dashboard and backend proxy route when auth is enabled.
- [ ] Proxy browser API traffic through Next.js so `RUSHINTEL_API_KEY` stays server-side.
- [ ] Let server-side dashboard reads call the backend with `RUSHINTEL_API_BASE_URL` and `RUSHINTEL_API_KEY`.

### Task 3: Render And Domain Handoff

**Files:**
- Create: `render.yaml`
- Create: `DEPLOYMENT.md`
- Modify: `README.md`

- [ ] Add a Render Blueprint for `rushintel-api`, `rushintel-web`, and `rushintel-db`.
- [ ] Document Render environment variables, login password setup, custom domain setup, and Namecheap CNAME values.
- [ ] Update README so nontechnical contacts start with the hosted URL instead of local Python/Node commands.

### Task 4: Verification And Push

**Files:**
- No new files.

- [ ] Run `.\scripts\test.ps1`.
- [ ] Run a browser check against `http://localhost:3002/`.
- [ ] Commit only the app/deployment files plus this plan.
- [ ] Push to `origin/main`.
