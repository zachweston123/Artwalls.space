-- Create artwork_reactions table
create table if not exists public.artwork_reactions (
    id uuid not null default gen_random_uuid() primary key,
    artwork_id uuid not null references public.artworks(id) on delete cascade,
    reaction_type text not null check (reaction_type in ('like', 'fire')),
    user_id uuid references auth.users(id) on delete cascade,
    session_id text,
    created_at timestamptz default now(),
    
    -- Ensure either user_id or session_id is present, but not both? 
    -- Actually, a logged in user might have a session_id too, but we prioritize user_id. 
    -- The requirement says "A given user_id (or session_id if anonymous) can have at most one reaction".
    -- Let's just allow both columns to be nullable, but enforce logic in API.
    -- Or enforce (user_id is not null or session_id is not null) via constraint.
    constraint user_or_session_required check (user_id is not null or session_id is not null)
);

-- Unique constraints to prevent duplicate reactions
create unique index if not exists unique_reaction_user on public.artwork_reactions (artwork_id, reaction_type, user_id) where user_id is not null;
create unique index if not exists unique_reaction_session on public.artwork_reactions (artwork_id, reaction_type, session_id) where user_id is null;

-- Index for counting
create index if not exists idx_artwork_reactions_count on public.artwork_reactions (artwork_id, reaction_type);

-- RLS
alter table public.artwork_reactions enable row level security;

-- Policy: Everyone can read reactions (aggregates/counts usually done by code, but reading rows is fine)
create policy "Anyone can read artwork_reactions"
    on public.artwork_reactions
    for select
    using (true);

-- Policy: Authenticated users can insert their own
create policy "Users can insert their own reactions"
    on public.artwork_reactions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own
create policy "Users can delete their own reactions"
    on public.artwork_reactions
    for delete
    to authenticated
    using (auth.uid() = user_id);
    
-- Note: Anonymous users (session_id) operations will be handled by the Worker with Service Role,
-- so we don't strictly need public insert/delete policies for them if we route through API.
-- The worker will bypass RLS.
