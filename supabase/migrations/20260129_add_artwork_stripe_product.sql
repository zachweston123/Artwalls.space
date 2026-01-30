-- Add Stripe product/price references to artworks
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;
