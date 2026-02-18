
  # Artwalls Marketplace Web App

  This is a code bundle for Artwalls Marketplace Web App. The original project is available at https://www.figma.com/design/nRhro8hi8uUibQ4p6o3co2/Artwalls-Marketplace-Web-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Artist → Venue Referrals (V1)

  ### Env vars

  - `REFERRAL_DAILY_LIMIT` (optional, default 5)
  - `PAGES_ORIGIN` (Cloudflare Pages origin for invite links)
  - Email (server/local): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`

  ### Test flow (quick)

  1. Sign in as an artist and open **Invite a Venue**.
  2. Send an invite and confirm it appears in **Referrals**.
  3. Open the invite link: `/venue/signup?ref=<token>` and create a venue account.
  4. Create a wallspace or call for art to qualify the referral.
  5. As admin, open **Referrals** and click **Grant reward**.
  6. Verify the artist has `pro_until` set and Pro features unlocked.

## Admin Setup

### How admin access works

Admin access is controlled by a server-side allowlist table (`admin_users`).  
The Cloudflare Worker validates every `/api/admin/*` request:

1. Extracts the Supabase JWT from the `Authorization: Bearer …` header
2. Validates the token via `supabase.auth.getUser(token)`
3. Checks `admin_users` table for the user's ID (primary source of truth)
4. Falls back to `user_metadata.role === 'admin'` or `artists.role === 'admin'` for backward compatibility

**No admin data is accessible via the Supabase anon key. The Worker uses the service role key server-side only.**

### Adding an admin user

1. Sign up / log in to the app so you have a Supabase auth account
2. Find your user UUID in the Supabase Dashboard → Authentication → Users
3. In the Supabase SQL Editor (which runs as service role), execute:

```sql
INSERT INTO public.admin_users (user_id)
VALUES ('<your-user-uuid>')
ON CONFLICT DO NOTHING;
```

4. Also set the auth metadata (so the frontend recognizes the admin role):

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE id = '<your-user-uuid>';
```

5. Log out and back in. You should now see the admin dashboard.

### Removing an admin user

```sql
DELETE FROM public.admin_users WHERE user_id = '<user-uuid>';
```

### Migration

The `admin_users` table is created by the migration file:  
`supabase/migrations/20260217_admin_users_table.sql`

Apply it via the Supabase SQL Editor or `supabase db push`.
  