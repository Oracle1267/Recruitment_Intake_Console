# Web Deployment Guide

This guide gets Rush Tracker online at:

`https://recruitment.threadandsignal.org`

The app is now designed for a hosted pilot:

- The public browser app is the Next.js frontend.
- The FastAPI backend is protected by `RUSH_TRACKER_API_KEY`.
- The frontend proxies browser API calls so the backend key stays server-side.
- The database should be Render Postgres, not local SQLite.
- The app login uses one shared chapter password stored in `RUSH_TRACKER_APP_PASSWORD`.
- The pilot Blueprint uses free Render web services and the smallest paid Render Postgres tier, so the expected baseline is the database tier cost instead of two paid app servers plus database.
- Free web services can take a little longer to wake up after inactivity. Upgrade `rush-tracker-web` and `rush-tracker-api` from `free` to `starter` later only if that delay becomes annoying.

## 1. Create The Render Blueprint

1. Log in to Render.
2. Create a new Blueprint from the GitHub repo:
   `https://github.com/Oracle1267/Recruitment_Intake_Console`
3. Render should detect `render.yaml`.
4. During setup, Render will ask for `RUSH_TRACKER_APP_PASSWORD`.
5. Set that to the temporary shared chapter password.
6. Let Render create:
   - `rush-tracker-web`
   - `rush-tracker-api`
   - `rush-tracker-db`

Do not put real chapter data into the app until the web service, API service, and database all deploy successfully.

## 2. Add The Custom Domain In Render

1. Open the `rush-tracker-web` service in Render.
2. Go to **Settings**.
3. Find **Custom Domains**.
4. Add:
   `recruitment.threadandsignal.org`
5. Render will show a DNS target. It will look similar to:
   `rush-tracker-web.onrender.com`

Keep that Render target open. You will paste it into Namecheap.

## 3. Add The Namecheap DNS Record

In Namecheap:

1. Go to **Domain List**.
2. Click **Manage** for `threadandsignal.org`.
3. Open **Advanced DNS**.
4. Under **Host Records**, click **Add New Record**.
5. Add this record:

| Field | Value |
| --- | --- |
| Type | `CNAME Record` |
| Host | `recruitment` |
| Value | the Render target for `rush-tracker-web`, for example `rush-tracker-web.onrender.com` |
| TTL | `Automatic` or `30 min` |

Do not put the full domain in the Host box. Use `recruitment`, not `recruitment.threadandsignal.org`.

Leave the existing email/TXT records alone.

## 4. Verify In Render

1. Return to Render.
2. Open `rush-tracker-web` custom domains.
3. Click **Verify** next to `recruitment.threadandsignal.org`.
4. If verification fails, wait 10-30 minutes and try again.
5. When verified, visit:
   `https://recruitment.threadandsignal.org`

Render automatically provisions HTTPS certificates for custom domains.

## 5. First Login

Use the shared password from `RUSH_TRACKER_APP_PASSWORD`.

After logging in, test:

1. Add one fake intake lead.
2. Refresh the page.
3. Confirm the fake lead is still there.
4. Mark the fake lead Removed / N/A.

If the lead persists after refresh, the app is using the hosted database correctly.

## 6. Changing The Chapter Password

1. Open Render.
2. Open the `rush-tracker-web` service.
3. Go to **Environment**.
4. Change `RUSH_TRACKER_APP_PASSWORD`.
5. Save changes and redeploy.

Changing the password signs everyone out.

## 7. Current Pilot Boundary

This is a pilot intake console, not an official Kappa Sigma national system.

Before broad use, add:

- Individual user accounts.
- Audit logs.
- Export/delete controls.
- A written privacy and retention policy.
- A backup policy for the Postgres database.
- Approval from the appropriate chapter or fraternity authority.
