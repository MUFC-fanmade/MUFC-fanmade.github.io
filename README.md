# MUFC Chart Contest Site

Multi-University Fanmade Contest website for a college and alumni fanmade chart contest around the arcade rhythm game maimai DX.

## Architecture plan

Use GitHub Pages for the static frontend and Supabase as the backend service:

- Supabase Auth for email/password accounts.
- Supabase Postgres for profiles, invite codes, submissions, and ratings.
- Supabase Storage for uploaded image files.
- Supabase Edge Functions for invite-only registration, so the invite validation and admin user creation happen server-side.
- Row Level Security policies and explicit grants to keep browser access scoped to the intended public API.

This keeps hosting simple: GitHub Pages serves the site, while Supabase provides the API, database, auth, file storage, and small backend function layer.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Deploy `supabase/functions/register-with-invite`.
4. Fill in your Supabase URL and public publishable key in `config.js`.
6. Open `index.html` in a browser, or serve the folder with any static server.

The Supabase publishable key is safe to use in the browser when RLS and grants are configured correctly. Never put a secret key or service role key in frontend files.

## Deployment

For GitHub Pages, publish from the repository root. Commit `index.html`, `styles.css`, `app.js`, `config.js`, `config.example.js`, and the Supabase setup files.

## Suggested data flow

1. Admin creates invite codes in `invite_codes`.
2. Visitor registers with email, password, display name, and invite code.
3. Edge Function validates and consumes the invite, then creates the Supabase Auth user.
4. User logs in and uploads one image submission.
5. Uploaded image is stored in Supabase Storage bucket `submissions`.
6. Submission metadata is saved to `submissions`.
7. Logged-in users can rate submissions once; scores are aggregated on the homepage.
