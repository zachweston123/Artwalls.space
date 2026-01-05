-- Add purchase_url and qr_svg fields to artworks for persistent QR and deep links
alter table if exists public.artworks
  add column if not exists purchase_url text,
  add column if not exists qr_svg text;