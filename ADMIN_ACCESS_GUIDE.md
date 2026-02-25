# Admin Access Quick Reference Guide

> **Canonical docs:** [SECURITY.md](SECURITY.md)

## How Admin Access Works

Admin access uses a **server-enforced email allowlist** — no passwords.

| Step | What happens |
|------|-------------|
| Press **Ctrl+Shift+A** (Win/Linux) or **Cmd+Shift+A** (Mac) on login page | Admin verification prompt appears |
| Click **Verify** | Frontend calls `POST /api/admin/verify` with your Supabase JWT |
| Worker checks your email against `ADMIN_EMAILS` secret | ✅ Allowed → admin dashboard · ❌ Denied → error |

## Granting Admin Access

```bash
# Set the allowlist as a Wrangler secret (comma-separated emails)
wrangler secret put ADMIN_EMAILS
# When prompted, enter: alice@example.com,bob@example.com
```

## Security Highlights

- No admin button visible on login page
- Keyboard shortcut is not documented in the UI
- Auth is enforced **server-side** — the frontend never decides who is admin
- All admin actions are recorded in `admin_audit_log`
- `user_metadata.isAdmin` is **never trusted** (user-editable); only the Worker allowlist matters

## Testing Checklist

- [ ] Keyboard shortcut opens prompt
- [ ] Allowlisted email grants access
- [ ] Non-allowlisted email is denied (403)
- [ ] Unauthenticated request is denied (401)
- [ ] ESC cancels the prompt
- [ ] Dark mode styling works

## Files Reference

| File | Purpose |
|------|---------|
| `worker/index.ts` | `isAdminUser()` / `requireAdmin()` — server-side gate |
| `src/components/admin/AdminPasswordPrompt.tsx` | Frontend verification modal |
| `SECURITY.md` | Full security documentation |
