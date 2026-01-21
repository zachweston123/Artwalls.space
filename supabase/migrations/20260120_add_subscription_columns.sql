-- Add subscription tracking columns to artists table
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS subscription_tier text check (subscription_tier in ('free', 'starter', 'growth', 'pro', 'inactive', 'cancelled')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text default 'active';

CREATE INDEX IF NOT EXISTS idx_artists_stripe_customer_id ON public.artists(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_artists_stripe_subscription_id ON public.artists(stripe_subscription_id);

