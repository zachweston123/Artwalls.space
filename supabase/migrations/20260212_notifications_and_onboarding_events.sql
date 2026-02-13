-- Migration: ensure notifications table has all required columns + onboarding events support
-- Idempotent — safe to re-run.

-- Ensure the notifications table has the columns the app expects
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS artwork_id uuid,
  ADD COLUMN IF NOT EXISTS order_id uuid;

-- Drop NOT NULL on artwork_id and order_id if they were created as NOT NULL in the original migration
-- (safe: only changes if the constraint exists)
DO $$
BEGIN
  ALTER TABLE public.notifications ALTER COLUMN artwork_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE public.notifications ALTER COLUMN order_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END$$;

-- Index for unread badge count
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

-- RLS: users can only read their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Events: ensure metadata column exists for onboarding analytics
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON TABLE public.notifications IS 'User-facing notifications with per-row read state and CTA routing';
