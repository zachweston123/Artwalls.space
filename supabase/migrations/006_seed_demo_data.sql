-- Seed demo data for artists, venues, and artworks
-- Idempotent: uses fixed UUIDs and upserts on conflict(id)

-- Demo Artist: Sarah Chen
insert into public.artists (id, email, name, role, subscription_tier, subscription_status)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'sarah@example.com',
  'Sarah Chen',
  'artist',
  'free',
  'inactive'
)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  subscription_tier = excluded.subscription_tier,
  subscription_status = excluded.subscription_status,
  updated_at = now();

-- Demo Venues
insert into public.venues (id, email, name, type, default_venue_fee_bps)
values
  ('22222222-2222-2222-2222-222222222221'::uuid, null, 'Brew & Palette Café', 'Coffee Shop', 1000),
  ('22222222-2222-2222-2222-222222222222'::uuid, null, 'The Artisan Lounge', 'Wine Bar', 1000),
  ('22222222-2222-2222-2222-222222222223'::uuid, null, 'Sunrise Bistro', 'Restaurant', 1000),
  ('22222222-2222-2222-2222-222222222224'::uuid, null, 'Corner Grind', 'Coffee Shop', 1000)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  type = excluded.type,
  default_venue_fee_bps = excluded.default_venue_fee_bps,
  updated_at = now();

-- Demo Artworks (mapped from mockArtworks)
insert into public.artworks (
  id,
  artist_id,
  venue_id,
  artist_name,
  venue_name,
  title,
  description,
  price_cents,
  currency,
  image_url,
  status
)
values
  (
    '33333333-3333-3333-3333-333333333331'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222221'::uuid,
    'Sarah Chen',
    'Brew & Palette Café',
    'Sunset Boulevard',
    'Abstract interpretation of urban sunsets',
    45000,
    'usd',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333332'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    null,
    'Sarah Chen',
    null,
    'Urban Dreams',
    'Mixed media cityscape',
    38000,
    'usd',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
    'available'
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Sarah Chen',
    'The Artisan Lounge',
    'Morning Light',
    'Watercolor landscape series',
    52000,
    'usd',
    'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
    'pending'
  ),
  (
    '33333333-3333-3333-3333-333333333334'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222221'::uuid,
    'Sarah Chen',
    'Brew & Palette Café',
    'Reflections',
    'Contemporary abstract piece',
    29500,
    'usd',
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    'sold'
  )
on conflict (id) do update set
  artist_id = excluded.artist_id,
  venue_id = excluded.venue_id,
  artist_name = excluded.artist_name,
  venue_name = excluded.venue_name,
  title = excluded.title,
  description = excluded.description,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  image_url = excluded.image_url,
  status = excluded.status,
  updated_at = now();
