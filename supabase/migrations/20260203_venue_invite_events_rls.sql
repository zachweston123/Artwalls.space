-- Add RLS policies for venue_invite_events to satisfy lint 0008
-- Allows service role full access and artists to read their own invite events via invite ownership

-- Service role can do everything (server-side logging)
create policy venue_invite_events_service_all on public.venue_invite_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Artists can view events tied to their own invites
create policy venue_invite_events_artist_read on public.venue_invite_events
  for select using (
    exists (
      select 1 from public.venue_invites vi
      where vi.id = invite_id and vi.artist_id = auth.uid()
    )
  );
