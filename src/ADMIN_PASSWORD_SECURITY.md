# @deprecated — Admin Authentication Model

> **This document is deprecated.** The single source of truth for admin
> authentication and secrets handling is [SECURITY.md](../SECURITY.md).

## Current Model (Role-Based Email Allowlist)

Admin access is enforced **server-side** in the Cloudflare Worker via an
email-allowlist stored in the Wrangler secret `ADMIN_EMAILS`.

1. User authenticates normally via Supabase (email + password or OAuth).
2. Frontend calls `POST /api/admin/verify` with the user's JWT.
3. Worker validates the JWT, then checks `isAdminUser(user)` against the
   `ADMIN_EMAILS` allowlist.
4. If the user is on the list the Worker returns `{ ok: true }` and sets
   `user_metadata.role = 'admin'` so the SPA renders the admin layout.

**No passwords or hashes are used for admin access.**

## Files

| File | Role |
|------|------|
| `worker/index.ts` | `isAdminUser()` + `requireAdmin()` — server-side gate |
| `src/components/admin/AdminPasswordPrompt.tsx` | Frontend prompt (calls `/api/admin/verify`) |
| `SECURITY.md` | Canonical docs on secrets & admin access |
