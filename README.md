# MUFC Chart Contest Site

Multi-University Fanmade Contest website for a college and alumni fanmade chart contest around the arcade rhythm game maimai DX.

## Project Status

This repository contains the public GitHub Pages frontend and the Supabase setup files for MUFC.

Current features:

- Invite-only registration through a Supabase Edge Function.
- Email/password login through Supabase Auth.
- Chart package submission to Supabase Storage: `maidata.txt`, `track.mp3`, `bg.jpg` / `bg.png`, and optional `pv.mp4`.
- Submission metadata storage in Supabase Postgres.
- Public homepage gallery backed by an aggregate score view.
- Majdata WebGL chart preview on submission detail pages.
- Multi-difficulty chart level switching parsed from `maidata.txt`.
- Logged-in user rating flow with one rating per user per submission.
- Logged-in user Markdown comments on submission detail pages.
- User profile page with display name editing and avatar upload.
- Internal user numbers such as `user001`, assigned automatically during invite registration.
- Admin-only dashboard for reviewing users, submissions, rating details, comments, and invite codes.
- Admin tools for canceling ratings, deleting submissions, managing uploaded chart files, creating invite codes, and changing account passwords.

## Architecture

Use GitHub Pages for the static frontend and Supabase as the backend service:

- Supabase Auth for email/password accounts.
- Supabase Postgres for profiles, invite codes, submissions, and ratings.
- Supabase Postgres views for public aggregate scores and public comment display.
- Client-side Markdown rendering for comments through `marked` and `DOMPurify`.
- Supabase RPC functions for admin-only dashboard reads.
- Supabase Storage for uploaded chart package files.
- Supabase Edge Functions for invite-only registration and admin password resets, so privileged Auth operations happen server-side.
- Row Level Security policies and explicit grants to keep browser access scoped to the intended public API.
- JWT verification is disabled only for `register-with-invite` because registration happens before a user has a session; invite validation still happens server-side. `admin-update-password` keeps JWT verification enabled and also checks `profiles.is_admin`.

This keeps hosting simple: GitHub Pages serves the site, while Supabase provides the API, database, auth, file storage, and small backend function layer.

## Security Notes

Frontend code is public. Only use a Supabase publishable key in `config.js`.

Never commit:

- `sb_secret_...`
- legacy `service_role`
- database passwords
- access tokens
- private notes containing real credentials
- exported user data

Local private notes belong in `README.local.md`, which is intentionally ignored by Git.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Deploy `supabase/functions/register-with-invite` and `supabase/functions/admin-update-password`.
4. Fill in your Supabase URL and public publishable key in `config.js`.
5. Add an Edge Function secret named `MUFC_SUPABASE_SECRET_KEY` with a Supabase secret key (`sb_secret_...`) or legacy `service_role` key. Both Edge Functions use the same secret.
6. Open `index.html` in a browser, or serve the folder with any static server.

The Supabase publishable key is safe to use in the browser when RLS and grants are configured correctly. Never put a secret key or service role key in frontend files.

## Deployment

For GitHub Pages, publish from the repository root. Commit `index.html`, `styles.css`, `app.js`, `config.js`, `config.example.js`, and the Supabase setup files.

## Suggested data flow

1. Admin creates invite codes in `invite_codes`.
2. Visitor registers with email, password, display name, and invite code.
3. Edge Function validates and consumes the invite, creates the Supabase Auth user, and assigns an internal profile number such as `user001`.
4. User logs in and uploads a chart package with strict filenames.
5. Uploaded chart files are stored in Supabase Storage bucket `submissions`.
6. Submission metadata is saved to `submissions`.
7. Detail pages load the Majdata WebGL preview and parse available difficulties from `maidata.txt`.
8. Logged-in users can rate submissions once; scores are aggregated on the homepage.
9. Logged-in users can post comments; public detail pages read comment display data from a safe view.
10. Admin users can review internal user numbers and display names in the dashboard, manage chart files, and reset account passwords through the admin-only Edge Function.

## Changelog

### 2026-05-28

- Created the initial GitHub Pages frontend.
- Added Supabase schema, Storage policies, RLS policies, and invite registration Edge Function.
- Corrected MUFC branding to Multi-University Fanmade Contest for maimai DX fanmade chart submissions.
- Tightened public data access so the frontend reads only aggregate submission score data.
- Added local-only documentation and stronger ignore rules for secrets and private development notes.

### 2026-05-30

- Added chart package uploads with strict file names: `maidata.txt`, `track.mp3`, `bg.jpg` / `bg.png`, optional `pv.mp4`.
- Integrated the Majdata WebGL chart preview into detail pages.
- Fixed Majdata difficulty mapping from `maidata` levels (`lv_1`-`lv_7`) to Unity levels (`lv0`-`lv6`).
- Added multi-difficulty buttons that display the chart's actual difficulty value and switch the current player level.
- Reworked chart detail pages into a full-width subpage layout separate from the homepage venue wall.

### 2026-06-07

- Added a Supabase-backed comment section on chart detail pages.
- Added `comments` table, RLS policies, update trigger, and public `submission_comments` view.
- Display comment author name, Markdown-rendered comment text, timestamp, and the author's score for the chart.
- Store comment Markdown source in Postgres and sanitize rendered HTML in the browser with DOMPurify.
- Added profile display/editing with avatar upload capped at 2MB.

### 2026-06-20

- Expanded the admin dashboard with submission management, rating cancellation, invite-code creation, and chart file upload/replacement/deletion tools.
- Added internal profile numbers (`user001`, `user002`, ...) so admin tables do not expose Auth UUIDs as user-facing IDs.
- Added `admin-update-password`, an admin-only Edge Function for changing account passwords without exposing service-role credentials to the frontend.
