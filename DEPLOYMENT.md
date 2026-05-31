# Web Deployment Guide

This guide gets Rush Tracker online at:

`https://recruitment.threadandsignal.org`

The recommended pilot setup uses no new paid hosting subscription:

- Vercel hosts the Next.js web app on the Hobby plan.
- Neon hosts the Postgres database on the Free plan.
- The app login uses one shared chapter password stored in `RUSH_TRACKER_APP_PASSWORD`.
- Browser API calls stay inside the Next app at `/api/backend`.
- The FastAPI backend remains available for local development, but it is not required for the hosted pilot.

As of May 31, 2026, Vercel lists Hobby as free for personal projects and Neon lists a $0 Free plan. Re-check the official Vercel and Neon pricing pages before a national or multi-chapter rollout.

## 1. Create The Neon Database

1. Go to Neon and create a new project.
2. Use the Free plan.
3. Create the default Postgres database.
4. Copy the pooled connection string. It will look like:
   `postgresql://...neon.tech/...`
5. Keep that connection string private. It becomes `DATABASE_URL` in Vercel.

Do not put real chapter data into the app until the Vercel deploy can create, refresh, and remove a fake lead successfully.

## 2. Create The Vercel Project

1. Log in to Vercel.
2. Import the GitHub repo:
   `https://github.com/Oracle1267/Recruitment_Intake_Console`
3. Set **Root Directory** to:
   `frontend`
4. Leave the framework as **Next.js**.
5. Add these environment variables:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `RUSH_TRACKER_APP_PASSWORD` | temporary shared chapter password |
| `RUSH_TRACKER_SESSION_SECRET` | long random secret value |

Do not set `NEXT_PUBLIC_API_BASE_URL` or `RUSH_TRACKER_API_BASE_URL` for the hosted Vercel pilot. If either one is set, the app assumes there is an external backend.

## 3. Deploy And Smoke Test

1. Deploy the Vercel project.
2. Open the generated `*.vercel.app` URL.
3. Log in with the shared password.
4. Add one fake intake lead.
5. Refresh the page.
6. Confirm the fake lead persists.
7. Mark the fake lead Removed / N/A.

If the lead persists after refresh, the app is using Neon correctly.

## 4. Add The Custom Domain In Vercel

1. Open the Vercel project.
2. Go to **Settings**.
3. Open **Domains**.
4. Add:
   `recruitment.threadandsignal.org`
5. Vercel will show the DNS record it expects.

For a subdomain, Vercel commonly asks for a CNAME target such as `cname.vercel-dns.com`, but use the exact value Vercel shows.

## 5. Add The Namecheap DNS Record

In Namecheap:

1. Go to **Domain List**.
2. Click **Manage** for `threadandsignal.org`.
3. Open **Advanced DNS**.
4. Under **Host Records**, click **Add New Record**.
5. Add the record Vercel requested.

For the likely CNAME case:

| Field | Value |
| --- | --- |
| Type | `CNAME Record` |
| Host | `recruitment` |
| Value | Vercel's CNAME target, often `cname.vercel-dns.com` |
| TTL | `Automatic` or `30 min` |

Do not put the full domain in the Host box. Use `recruitment`, not `recruitment.threadandsignal.org`.

Leave the existing email and TXT records alone.

## 6. Verify In Vercel

1. Return to the Vercel project.
2. Open **Settings > Domains**.
3. Wait for Vercel to verify `recruitment.threadandsignal.org`.
4. If verification fails, wait 10-30 minutes and try again.
5. When verified, visit:
   `https://recruitment.threadandsignal.org`

Vercel automatically provisions HTTPS certificates for verified domains.

## 7. Changing The Chapter Password

1. Open the Vercel project.
2. Go to **Settings > Environment Variables**.
3. Change `RUSH_TRACKER_APP_PASSWORD`.
4. Redeploy the app.

Changing the password signs everyone out.

## 8. National Rollout Boundary

This is a chapter pilot, not an official Kappa Sigma national system.

Before broad use, national or an approved technical owner should add:

- Individual user accounts and role-based access.
- Per-chapter data isolation.
- Audit logs.
- Export and delete controls.
- Written privacy and retention policies.
- Database backup and incident-response procedures.
- A paid hosting plan with support and ownership under the fraternity, not a volunteer's personal account.
