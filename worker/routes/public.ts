/**
 * Public-facing profile endpoints — artist profiles, published sets, and
 * basic artist lookup by slug/id.
 */

import type { WorkerContext } from '../types';

export async function handlePublic(wc: WorkerContext): Promise<Response | null> {
  const { url, method, json, supabaseAdmin, shapePublicArtwork, PUBLIC_ARTWORK_STATUSES } = wc;

  // ── Full public artist profile (artworks + sets + displays) ──
  if (url.pathname.startsWith('/api/public/artists/') && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const slugOrId = parts[4];
    if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });

    const uid = url.searchParams.get('uid');
    const identifier = decodeURIComponent(slugOrId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

    let artistRow: any = null;
    let artistError: any = null;

    if (isUuid) {
      const res = await supabaseAdmin.from('artists').select('*').eq('id', identifier).maybeSingle();
      artistRow = res.data;
      artistError = res.error;
    } else {
      const slugRes = await supabaseAdmin.from('artists').select('*').eq('slug', identifier).maybeSingle();
      if (slugRes.data) {
        artistRow = slugRes.data;
      } else {
        const nameRes = await supabaseAdmin.from('artists').select('*').ilike('name', identifier).maybeSingle();
        artistRow = nameRes.data;
        artistError = nameRes.error;
      }
    }

    if (!artistRow && uid) {
      const { data: artistByUid, error: uidError } = await supabaseAdmin
        .from('artists')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (uidError) {
        console.warn(`Secondary lookup by UID failed: ${uidError.message}`);
      } else if (artistByUid) {
        artistRow = artistByUid;
        artistError = null;
      }
    }

    if (artistError) return json({ error: artistError.message }, { status: 500 });
    if (!artistRow) return json({ error: 'Not found' }, { status: 404 });

    const artistId = artistRow.id;

    const [artworksRes, displayRes, setsRes] = await Promise.all([
      supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .eq('artist_id', artistId)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .order('published_at', { ascending: false })
        .limit(60),
      supabaseAdmin
        .from('v_artist_current_displays')
        .select('artwork_id,venue_id,set_id,status')
        .eq('artist_id', artistId),
      supabaseAdmin
        .from('artwork_sets')
        .select('id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,archived_at,set_id)))')
        .eq('artist_id', artistId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false }),
    ]);

    if (artworksRes.error) return json({ error: artworksRes.error.message }, { status: 500 });
    if (displayRes.error) return json({ error: displayRes.error.message }, { status: 500 });
    if (setsRes.error) return json({ error: setsRes.error.message }, { status: 500 });

    const artworks = Array.isArray(artworksRes.data) ? artworksRes.data.map(shapePublicArtwork) : [];
    const artworkMap = new Map<string, any>();
    artworks.forEach((a) => artworkMap.set(a.id, { ...a }));

    const displayRows = Array.isArray(displayRes.data) ? displayRes.data : [];
    const displayArtworkIds = Array.from(new Set(displayRows.map((r: any) => r.artwork_id).filter(Boolean)));
    const missingArtIds = displayArtworkIds.filter((id) => !artworkMap.has(id));

    if (missingArtIds.length) {
      const { data: missingArts, error: missingErr } = await supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .in('id', missingArtIds);
      if (missingErr) return json({ error: missingErr.message }, { status: 500 });
      (missingArts || []).map(shapePublicArtwork).forEach((a) => artworkMap.set(a.id, { ...a }));
    }

    const venueIds = new Set<string>();
    artworkMap.forEach((a) => { if (a.venueId) venueIds.add(a.venueId); });
    displayRows.forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
    const venueMap = new Map<string, any>();
    if (venueIds.size) {
      const { data: venues, error: venueErr } = await supabaseAdmin
        .from('venues')
        .select('id,name,city,state,neighborhood,slug,is_public')
        .in('id', Array.from(venueIds));
      if (venueErr) return json({ error: venueErr.message }, { status: 500 });
      (venues || []).forEach((v) => venueMap.set(v.id, v));
    }

    const setMetaMap = new Map<string, { id: string; title: string; visibility?: string; status?: string }>();
    const sets = (Array.isArray(setsRes.data) ? setsRes.data : []).map((row: any) => {
      const items = Array.isArray(row.items) ? row.items : [];
      const availableItems = items
        .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
        .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !(i.artwork as any).archivedAt);
      const heroImage = row.hero_image_url || availableItems.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;
      setMetaMap.set(row.id, { id: row.id, title: row.title, visibility: row.visibility, status: row.status });
      return {
        id: row.id,
        title: row.title,
        description: row.description || null,
        heroImageUrl: heroImage,
        pieceCount: availableItems.length,
        items: availableItems.slice(0, 6).map((i: any) => i.artwork),
      };
    });

    const displaySetIds = Array.from(new Set(displayRows.map((r: any) => r.set_id).filter(Boolean)));
    const missingSetIds = displaySetIds.filter((id) => !setMetaMap.has(id));
    if (missingSetIds.length) {
      const { data: extraSets, error: extraErr } = await supabaseAdmin
        .from('artwork_sets')
        .select('id,title,visibility,status')
        .in('id', missingSetIds);
      if (extraErr) return json({ error: extraErr.message }, { status: 500 });
      (extraSets || []).forEach((s) => setMetaMap.set(s.id, { id: s.id, title: s.title, visibility: s.visibility, status: s.status }));
    }

    const groups = new Map<string, any>();
    displayRows.forEach((r: any) => {
      const art = artworkMap.get(r.artwork_id);
      if (!art) return;
      const setId = r.set_id || art.setId || null;
      const venue = r.venue_id ? venueMap.get(r.venue_id) : null;
      const venueKey = venue?.id || r.venue_id;
      if (!venueKey) return;

      art.display = {
        venueId: venue?.id || r.venue_id || null,
        venueName: venue?.name || art.venueName || null,
        setId,
        setTitle: setId ? (setMetaMap.get(setId)?.title || null) : null,
      };
      artworkMap.set(art.id, art);

      if (!groups.has(venueKey)) {
        groups.set(venueKey, {
          venue: venue || { id: r.venue_id, name: art.venueName || 'Venue' },
          sets: new Map<string, any>(),
          artworks: [] as any[],
        });
      }
      const group = groups.get(venueKey);
      if (setId) {
        if (!group.sets.has(setId)) {
          group.sets.set(setId, { id: setId, title: setMetaMap.get(setId)?.title || 'Collection', artworks: [] as any[] });
        }
        const setGroup = group.sets.get(setId);
        setGroup.artworks.push(art);
      } else {
        group.artworks.push(art);
      }
    });

    const onDisplay = Array.from(groups.values()).map((g: any) => ({
      venue: g.venue,
      sets: Array.from(g.sets.values()).map((s: any) => ({ ...s, pieceCount: s.artworks.length })),
      artworks: g.artworks,
    }));

    const forSale = Array.from(artworkMap.values());

    const artist = {
      id: artistRow.id,
      slug: (artistRow as any).slug || null,
      name: artistRow.name,
      bio: artistRow.bio || null,
      profilePhotoUrl: (artistRow as any).profile_photo_url || null,
      portfolioUrl: (artistRow as any).portfolio_url || null,
      websiteUrl: (artistRow as any).website_url || null,
      instagramHandle: (artistRow as any).instagram_handle || null,
      cityPrimary: (artistRow as any).city_primary || null,
      citySecondary: (artistRow as any).city_secondary || null,
      artTypes: (artistRow as any).art_types || [],
      isFoundingArtist: !!(artistRow as any).is_founding_artist,
    };

    return json({ artist, forSale, onDisplay, sets });
  }

  // ── Public: single published set with artworks ──
  if (url.pathname.startsWith('/api/public/sets/') && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const setId = parts[4];
    if (!setId) return json({ error: 'Missing set id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('artwork_sets')
      .select('id,artist_id,title,description,hero_image_url,visibility,status,items:artwork_set_items(set_id, artwork_id, sort_order, artwork:artworks(id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,archived_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)))')
      .eq('id', setId)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .maybeSingle();

    if (error) return json({ error: error.message }, { status: 500 });
    if (!data) return json({ error: 'Not found' }, { status: 404 });

    const rawItems = Array.isArray((data as any).items) ? (data as any).items : [];
    const allowedItems = rawItems
      .map((i: any) => ({ ...i, artwork: i.artwork ? shapePublicArtwork(i.artwork) : null }))
      .filter((i: any) => i.artwork && PUBLIC_ARTWORK_STATUSES.includes(String(i.artwork.status || '').toLowerCase()) && !i.artwork.archivedAt);

    const artworkIds = allowedItems.map((i: any) => i.artwork.id);
    const { data: displayRows, error: displayErr } = artworkIds.length
      ? await supabaseAdmin
          .from('v_artist_current_displays')
          .select('artwork_id,venue_id,set_id,status')
          .in('artwork_id', artworkIds)
      : { data: [], error: null } as any;
    if (displayErr) return json({ error: displayErr.message }, { status: 500 });

    const venueIds = new Set<string>();
    (displayRows || []).forEach((r: any) => { if (r.venue_id) venueIds.add(r.venue_id); });
    const venueMap = new Map<string, any>();
    if (venueIds.size) {
      const { data: venues, error: venueErr } = await supabaseAdmin
        .from('venues')
        .select('id,name,city,state,neighborhood,slug,is_public')
        .in('id', Array.from(venueIds));
      if (venueErr) return json({ error: venueErr.message }, { status: 500 });
      (venues || []).forEach((v) => venueMap.set(v.id, v));
    }

    const items = allowedItems.map((i: any) => {
      const displays = (displayRows || []).filter((r: any) => r.artwork_id === i.artwork.id);
      const displayVenues = displays.map((r: any) => venueMap.get(r.venue_id) || { id: r.venue_id, name: i.artwork.venueName || null, city: null, neighborhood: null, slug: null });
      return { artwork: i.artwork, displayVenues };
    });

    const heroImage = (data as any).hero_image_url || items.find((i: any) => i.artwork?.imageUrl)?.artwork?.imageUrl || null;

    return json({
      set: {
        id: data.id,
        artistId: (data as any).artist_id,
        title: data.title,
        description: (data as any).description || null,
        heroImageUrl: heroImage,
        pieceCount: items.length,
        items,
      },
    });
  }

  // ── Public: single artist basic profile (by slug or id) ──
  if (url.pathname.startsWith('/api/artists/') && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const slugOrId = parts[3];
    if (!slugOrId) return json({ error: 'Missing artist id or slug' }, { status: 400 });
    const identifier = decodeURIComponent(slugOrId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const matchFilter = isUuid ? { id: identifier } : { slug: identifier };
    const { data, error } = await supabaseAdmin
      .from('artists')
      .select('id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,art_types,is_public,is_founding_artist,is_live')
      .match(matchFilter)
      .eq('is_public', true)
      .maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });
    if (!data) return json({ error: 'Not found' }, { status: 404 });
    return json({
      id: data.id,
      slug: (data as any).slug || null,
      name: data.name,
      bio: data.bio || null,
      profilePhotoUrl: (data as any).profile_photo_url || null,
      portfolioUrl: (data as any).portfolio_url || null,
      websiteUrl: (data as any).website_url || null,
      instagramHandle: (data as any).instagram_handle || null,
      cityPrimary: (data as any).city_primary || null,
      citySecondary: (data as any).city_secondary || null,
      artTypes: (data as any).art_types || [],
      isFoundingArtist: !!(data as any).is_founding_artist,
      openToNewPlacements: (data as any).is_live !== false,  // null → true
    });
  }

  return null;
}
