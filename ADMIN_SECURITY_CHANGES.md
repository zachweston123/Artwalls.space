# Admin Console Security — Implementation Summary

> **Canonical docs:** [SECURITY.md](SECURITY.md)

## Current Model

Admin access is enforced **server-side** in the Cloudflare Worker via an
email-allowlist stored in the Wrangler secret `ADMIN_EMAILS`.

- No client-side passwords are used.
- `POST /api/admin/verify` validates the caller's Supabase JWT and checks
  their email against the allowlist (`isAdminUser`).
- On success the Worker sets `user_metadata.role = 'admin'` so the React SPA
  renders the admin layout.

## Security Features

| Feature | Status |
|---------|--------|
| Demo admin button removed | ✅ |
| Hidden keyboard shortcut (Ctrl/Cmd+Shift+A) | ✅ |
| Server-enforced admin gate (`requireAdmin`) | ✅ |
| Audit log (`admin_audit_log` table) | ✅ |
| `user_metadata.isAdmin` explicitly untrusted | ✅ |
| Admin session token (sessionStorage, not localStorage) | ✅ |

## How to Grant Admin Access

```bash
wrangler secret put ADMIN_EMAILS
# Enter comma-separated emails, e.g.: alice@example.com,bob@example.com
```

## Files

| File | Role |
|------|------|
| `worker/index.ts` | `isAdminUser()` + `requireAdmin()` |
| `src/components/admin/AdminPasswordPrompt.tsx` | Frontend verification modal |
| `src/App.tsx` | Keyboard shortcut + admin layout routing |
| `SECURITY.md` | Canonical secrets & admin docs |

## What Still Works

- ✅ Artist login
- ✅ Venue login
- ✅ QR code demo purchase page
- ✅ All existing user features
- ✅ Dark mode for admin prompt
