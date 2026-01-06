-- Add labels to venues for highlights/filters
alter table public.venues
  add column if not exists labels jsonb not null default '[]'::jsonb;

-- Index for efficient filtering
create index if not exists venues_labels_gin_idx on public.venues using gin (labels);
