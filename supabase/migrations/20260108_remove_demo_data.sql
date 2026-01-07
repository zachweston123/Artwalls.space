-- Remove all demo data for production deployment
-- This migration removes the seed data added by 006_seed_demo_data.sql

-- Delete demo artworks (cascade will handle related records)
DELETE FROM public.artworks 
WHERE id IN (
  '33333333-3333-3333-3333-333333333331'::uuid,
  '33333333-3333-3333-3333-333333333332'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  '33333333-3333-3333-3333-333333333334'::uuid
);

-- Delete demo artist
DELETE FROM public.artists 
WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Delete demo venues
DELETE FROM public.venues 
WHERE id IN (
  '22222222-2222-2222-2222-222222222221'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '22222222-2222-2222-2222-222222222223'::uuid,
  '22222222-2222-2222-2222-222222222224'::uuid
);

-- Remove any related data that might exist (bookings, notifications, etc.)
DELETE FROM public.bookings 
WHERE artist_id = '11111111-1111-1111-1111-111111111111'::uuid
   OR venue_id IN (
     '22222222-2222-2222-2222-222222222221'::uuid,
     '22222222-2222-2222-2222-222222222222'::uuid,
     '22222222-2222-2222-2222-222222222223'::uuid,
     '22222222-2222-2222-2222-222222222224'::uuid
   );

DELETE FROM public.notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Remove any orphaned orders related to demo data
DELETE FROM public.orders 
WHERE artist_id = '11111111-1111-1111-1111-111111111111'::uuid
   OR venue_id IN (
     '22222222-2222-2222-2222-222222222221'::uuid,
     '22222222-2222-2222-2222-222222222222'::uuid,
     '22222222-2222-2222-2222-222222222223'::uuid,
     '22222222-2222-2222-2222-222222222224'::uuid
   );

-- Log successful cleanup
INSERT INTO public.webhook_events (id, type, note)
VALUES ('demo-data-cleanup-' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'), 'system', 'Demo data removed for production deployment')
ON CONFLICT (id) DO NOTHING;
