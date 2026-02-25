import type { WorkerContext } from '../types';
import { isUUID, clampStr, isValidUrl, getErrorMessage } from '../helpers';
import QRCode from 'qrcode';

export async function handleArtworks(wc: WorkerContext): Promise<Response | null> {
  const {
    url,
    method,
    request,
    json,
    text,
    supabaseAdmin,
    env,
    pagesOrigin,
    allowOrigin,
    getUser,
    requireAuthOrFail,
    requireArtist,
    requireVenue,
    isAdminUser,
    applyRateLimit,
    shapePublicArtwork,
    shapePublicArtworkDetail,
    artworkPurchaseUrl,
    generateQrSvg,
    getArtistArtworkLimit,
    getArtistActiveArtworkCount,
    applySecurityHeaders,
    applyProOverride,
    sendSms,
    stripeFetch,
    toForm,
    ctx,
    PUBLIC_ARTWORK_STATUSES,
  } = wc;

  // ══════════════════════════════════════════════════════════════════
  // Public artwork listing
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/artworks' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const artistId = url.searchParams.get('artistId');
    const requester = await getUser(request);
    // SECURITY: Never trust user_metadata.isAdmin — it's user-editable.
    // Only use the server-side isAdminUser() check for admin elevation.
    const isAdmin = requester ? await isAdminUser(requester) : false;
    const isOwner = requester?.id && artistId && requester.id === artistId;
    const isPublicQuery = !(isAdmin || isOwner);
    let query = supabaseAdmin
      .from('artworks')
      .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,venue:venues(name,city,state,neighborhood,slug,is_public)')
      .order('published_at', { ascending: false })
      .limit(50);
    if (isPublicQuery) {
      query = query.eq('is_public', true).in('status', PUBLIC_ARTWORK_STATUSES);
    }
    query = query.is('archived_at', null);
    if (artistId) query = query.eq('artist_id', artistId);
    const { data, error } = await query;
    if (error) return json({ error: error.message }, { status: 500 });
    const artworks = (data || []).map(shapePublicArtwork);
    return json({ artworks });
  }

  // ══════════════════════════════════════════════════════════════════
  // Get reactions
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && url.pathname.endsWith('/reactions') && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const id = parts[3]; // artworkId

    let userId = null;
    let sessionId = url.searchParams.get('sessionId') || request.headers.get('x-session-id');

    const user = await getUser(request);
    if (user) userId = user.id;

    const { count: likeCount, error: likeError } = await supabaseAdmin
      .from('artwork_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('artwork_id', id)
      .eq('reaction_type', 'like');

    const { count: fireCount, error: fireError } = await supabaseAdmin
      .from('artwork_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('artwork_id', id)
      .eq('reaction_type', 'fire');

    if (likeError || fireError) return json({ error: 'Failed to fetch counts' }, { status: 500 });

    // Check viewer status
    let liked = false;
    let fired = false;

    if (userId || sessionId) {
      let query = supabaseAdmin.from('artwork_reactions').select('reaction_type').eq('artwork_id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId!);
      }

      const { data: userReactions } = await query;
      if (userReactions) {
        liked = userReactions.some((r: any) => r.reaction_type === 'like');
        fired = userReactions.some((r: any) => r.reaction_type === 'fire');
      }
    }

    return json({
      likeCount: likeCount || 0,
      fireCount: fireCount || 0,
      viewer: { liked, fired }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Toggle reaction
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && url.pathname.endsWith('/reactions') && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const id = parts[3]; // artworkId

    let body: any = {};
    try { body = await request.json(); } catch (e) { }
    const { type, action } = body;

    if (!['like', 'fire'].includes(type as string)) return json({ error: 'Invalid type' }, { status: 400 });
    
    let userId = null;
    let sessionId = body.sessionId || request.headers.get('x-session-id');

    const user = await getUser(request);
    if (user) userId = user.id;

    if (!userId && !sessionId) return json({ error: 'Session ID required for anonymous reactions' }, { status: 400 });

    // Rate limit
    const rlReact = await applyRateLimit('reactions', request);
    if (rlReact) return rlReact;

    // Find existing
    let query = supabaseAdmin.from('artwork_reactions')
      .select('id')
      .eq('artwork_id', id)
      .eq('reaction_type', type);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data: existing, error: findError } = await query.maybeSingle();

    if (findError) return json({ error: findError.message }, { status: 500 });

    if (existing) {
      // Delete
      await supabaseAdmin.from('artwork_reactions').delete().eq('id', existing.id);
    } else {
      // Insert
      const row: any = {
        artwork_id: id,
        reaction_type: type
      };
      if (userId) row.user_id = userId;
      else row.session_id = sessionId;

      await supabaseAdmin.from('artwork_reactions').insert(row);
    }

    // Return updated counts
    const { count: likeCount } = await supabaseAdmin.from('artwork_reactions').select('*', { count: 'exact', head: true }).eq('artwork_id', id).eq('reaction_type', 'like');
    const { count: fireCount } = await supabaseAdmin.from('artwork_reactions').select('*', { count: 'exact', head: true }).eq('artwork_id', id).eq('reaction_type', 'fire');

    let viewerLiked = false;
    let viewerFired = false;
    if (userId || sessionId) {
      let q = supabaseAdmin.from('artwork_reactions').select('reaction_type').eq('artwork_id', id);
      if (userId) q = q.eq('user_id', userId);
      else q = q.eq('session_id', sessionId);
      const { data: userReactions } = await q;
      if (userReactions) {
        viewerLiked = userReactions.some((r: any) => r.reaction_type === 'like');
        viewerFired = userReactions.some((r: any) => r.reaction_type === 'fire');
      }
    }

    return json({
      likeCount: likeCount || 0,
      fireCount: fireCount || 0,
      viewer: { liked: viewerLiked, fired: viewerFired }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Artwork purchase link + QR (must be before the catch-all artwork GET)
  // SECURITY: requires auth + ownership (artist must own the artwork)
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/link')) {
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });

    // Require authentication
    const user = await getUser(request);
    if (!user) return json({ error: 'Auth required' }, { status: 401 });

    // Verify ownership: the artwork must belong to the calling user (or caller is admin)
    if (supabaseAdmin) {
      const { data: art } = await supabaseAdmin.from('artworks').select('artist_id').eq('id', id).maybeSingle();
      if (!art) return json({ error: 'Artwork not found' }, { status: 404 });
      const admin = await isAdminUser(user.id);
      if (art.artist_id !== user.id && !admin) {
        return json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const purchaseUrl = artworkPurchaseUrl(id);
    const qrSvg = await generateQrSvg(purchaseUrl, 300);
    if (supabaseAdmin) {
      await supabaseAdmin.from('artworks').update({ purchase_url: purchaseUrl, qr_svg: qrSvg, updated_at: new Date().toISOString() }).eq('id', id);
    }
    return json({ purchaseUrl, qrSvg });
  }

  // ══════════════════════════════════════════════════════════════════
  // QR Code SVG endpoint — returns inline SVG for any artwork
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qrcode.svg')) {
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return text('Missing artwork id', { status: 400 });
    if (supabaseAdmin) {
      const { data: art } = await supabaseAdmin.from('artworks').select('id').eq('id', id).maybeSingle();
      if (!art) return text('Artwork not found', { status: 404 });
    }
    const widthParam = url.searchParams.get('w');
    const width = widthParam && Number(widthParam) > 0 ? Number(widthParam) : 300;
    const purchaseUrl = artworkPurchaseUrl(id);
    const svgString = await generateQrSvg(purchaseUrl, width);
    const headers = new Headers();
    headers.set('Content-Type', 'image/svg+xml');
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Vary', 'Origin');
    return new Response(svgString, { status: 200, headers });
  }

  // ══════════════════════════════════════════════════════════════════
  // QR Code PNG endpoint — returns downloadable PNG for any artwork
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qrcode.png')) {
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return text('Missing artwork id', { status: 400 });
    if (supabaseAdmin) {
      const { data: art } = await supabaseAdmin.from('artworks').select('id').eq('id', id).maybeSingle();
      if (!art) return text('Artwork not found', { status: 404 });
    }
    const widthParam = url.searchParams.get('w');
    const width = widthParam && Number(widthParam) > 0 ? Number(widthParam) : 1024;
    const marginParam = url.searchParams.get('margin');
    const margin = marginParam && Number(marginParam) >= 0 ? Number(marginParam) : 1;
    const purchaseUrl = artworkPurchaseUrl(id);
    try {
      const buf = await QRCode.toBuffer(purchaseUrl, { type: 'png', margin, width } as any);
      const headers = new Headers();
      headers.set('Content-Type', 'image/png');
      headers.set('Content-Disposition', `attachment; filename="artwork-${id}-qr.png"`);
      headers.set('Cache-Control', 'public, max-age=3600');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Vary', 'Origin');
      return new Response(buf, { status: 200, headers });
    } catch (e) {
      // Fallback: return SVG if PNG generation fails (e.g. missing canvas in Workers)
      const svgString = await generateQrSvg(purchaseUrl, width);
      const headers = new Headers();
      headers.set('Content-Type', 'image/svg+xml');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Vary', 'Origin');
      return new Response(svgString, { status: 200, headers });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // QR poster endpoint — returns printable HTML poster
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'GET' && url.pathname.endsWith('/qr-poster')) {
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return text('Missing artwork id', { status: 400 });
    let art: any = null;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('artworks').select('id,title,artist_name,venue_name,price_cents,currency,image_url').eq('id', id).maybeSingle();
      if (!data) return text('Artwork not found', { status: 404 });
      art = data;
    }
    const purchaseUrl = artworkPurchaseUrl(id);
    const qrSvg = await generateQrSvg(purchaseUrl, 400);
    const title = art?.title || 'Artwork';
    const artist = art?.artist_name || '';
    const venue = art?.venue_name || '';
    const price = art?.price_cents ? `$${(art.price_cents / 100).toFixed(2)}` : '';
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QR Poster — ${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
    .qr { margin: 1.5rem auto; }
    .price { font-size: 1.25rem; font-weight: bold; margin-top: 1rem; }
    .url { font-size: 0.75rem; color: #999; word-break: break-all; margin-top: 0.5rem; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${[artist, venue].filter(Boolean).join(' · ')}</div>
  <div class="qr">${qrSvg}</div>
  ${price ? `<div class="price">${price}</div>` : ''}
  <div class="url">Scan to view &amp; purchase</div>
</body>
</html>`;
    const posterHeaders = new Headers();
    posterHeaders.set('Content-Type', 'text/html; charset=utf-8');
    posterHeaders.set('Access-Control-Allow-Origin', allowOrigin);
    posterHeaders.set('Vary', 'Origin');
    return new Response(html, { status: 200, headers: posterHeaders });
  }

  // ══════════════════════════════════════════════════════════════════
  // Public: single artwork (catch-all — must come AFTER specific
  // /link, /qrcode.svg, /qrcode.png, /qr-poster endpoints)
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });
    const baseSelect = 'id,title,status,price_cents,currency,image_url,image_urls,artist_id,venue_id,artist_name,venue_name,description,purchase_url,qr_svg,is_public,published_at,archived_at,venue:venues(name,city,state,neighborhood,slug,is_public)';
    let { data, error } = await supabaseAdmin
      .from('artworks')
      .select(baseSelect)
      .eq('id', id)
      .eq('is_public', true)
      .is('archived_at', null)
      .in('status', PUBLIC_ARTWORK_STATUSES)
      .maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });

    // If not public, allow owner/admin to view their own listing
    if (!data) {
      const requester = await getUser(request);
      // SECURITY: Never trust user_metadata.isAdmin — it's user-editable.
      const isAdmin = requester ? await isAdminUser(requester) : false;
      const { data: privateData, error: privateError } = await supabaseAdmin
        .from('artworks')
        .select(baseSelect)
        .eq('id', id)
        .maybeSingle();
      if (privateError) return json({ error: privateError.message }, { status: 500 });
      if (!privateData) return json({ error: 'Not found' }, { status: 404 });
      if (!isAdmin && requester?.id !== (privateData as any).artist_id) return json({ error: 'Forbidden' }, { status: 403 });
      data = privateData;
    }

    // ── Backfill: generate purchase_url + qr_svg for legacy rows ──
    if (supabaseAdmin && data && !(data as any).purchase_url) {
      const backfillUrl = artworkPurchaseUrl(data.id);
      const backfillSvg = await generateQrSvg(backfillUrl, 300);
      // Non-blocking persist — don't fail the read if the write fails
      ctx.waitUntil(
        supabaseAdmin.from('artworks').update({ purchase_url: backfillUrl, qr_svg: backfillSvg }).eq('id', data.id)
      );
      (data as any).purchase_url = backfillUrl;
      (data as any).qr_svg = backfillSvg;
    }

    const artwork = shapePublicArtworkDetail(data);

    let otherWorks: any[] = [];
    if ((data as any).artist_id) {
      const { data: siblings } = await supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_id,artist_name,venue_id,venue_name,is_public,archived_at,published_at,set_id,venue:venues(name,city,state,neighborhood,slug,is_public)')
        .eq('artist_id', (data as any).artist_id)
        .neq('id', data.id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_ARTWORK_STATUSES)
        .order('published_at', { ascending: false })
        .limit(6);
      otherWorks = (siblings || []).map(shapePublicArtwork);
    }

    return json({ ...artwork, otherWorks });
  }

  // ══════════════════════════════════════════════════════════════════
  // Create artwork (artist)
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/artworks' && method === 'POST') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const role = (user.user_metadata?.role as string) || 'artist';
    if (role !== 'artist') return json({ error: 'Only artists can create artworks' }, { status: 403 });
    const rlArtCreate = await applyRateLimit('artwork-create', request);
    if (rlArtCreate) return rlArtCreate;
    const payload = await request.json().catch(() => ({}));
    const priceNumber = Number(payload?.price);
    const price_cents = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0;
    if (price_cents < 0 || price_cents > 100_000_00) return json({ error: 'Price out of range' }, { status: 400 });
    const imageUrlsRaw = Array.isArray(payload?.imageUrls) ? payload.imageUrls.slice(0, 20) : [];
    const imageUrls = imageUrlsRaw.map((u: any) => String(u || '').trim()).filter(Boolean).filter((u: string) => isValidUrl(u));
    const primaryImageUrl = String(payload?.imageUrl || imageUrls[0] || '').trim() || null;
    if (primaryImageUrl && !isValidUrl(primaryImageUrl)) return json({ error: 'Invalid image URL' }, { status: 400 });
    const normalizedImageUrls = primaryImageUrl
      ? [primaryImageUrl, ...imageUrls.filter((u: string) => u !== primaryImageUrl)]
      : imageUrls;
    const dimensionsWidth = Number(payload?.dimensionsWidth);
    const dimensionsHeight = Number(payload?.dimensionsHeight);
    const dimensionsDepth = payload?.dimensionsDepth !== undefined && payload?.dimensionsDepth !== ''
      ? Number(payload?.dimensionsDepth)
      : null;
    const dimensionsUnit = String(payload?.dimensionsUnit || '').trim();
    const medium = String(payload?.medium || '').trim();
    const materials = String(payload?.materials || '').trim();
    const condition = String(payload?.condition || '').trim();
    const knownFlaws = String(payload?.knownFlaws || '').trim();
    const editionType = String(payload?.editionType || '').trim();
    const editionSize = payload?.editionSize !== undefined && payload?.editionSize !== ''
      ? Number(payload?.editionSize)
      : null;
    const shippingTimeEstimate = String(payload?.shippingTimeEstimate || '').trim();

    const allowedConditions = new Set(['new', 'excellent', 'good', 'fair']);
    const allowedEditionTypes = new Set(['original', 'print']);
    const isPublishable =
      price_cents > 0 &&
      Number.isFinite(dimensionsWidth) && dimensionsWidth > 0 &&
      Number.isFinite(dimensionsHeight) && dimensionsHeight > 0 &&
      Boolean(dimensionsUnit) &&
      Boolean(medium) &&
      Boolean(knownFlaws) &&
      Boolean(shippingTimeEstimate) &&
      allowedConditions.has(condition) &&
      allowedEditionTypes.has(editionType) &&
      (editionType !== 'print' || (Number.isFinite(editionSize) && Number(editionSize) > 0)) &&
      normalizedImageUrls.length >= 3;

    if (!isPublishable) {
      return json({ error: 'Missing required listing details. Please complete dimensions, medium, condition, flaws, edition info, shipping estimate, and at least 3 photos.' }, { status: 400 });
    }

    // Enforce plan artwork limit before creating Stripe entities
    const [artworkLimit, activeCount] = await Promise.all([
      getArtistArtworkLimit(user.id),
      getArtistActiveArtworkCount(user.id),
    ]);
    if (Number.isFinite(artworkLimit) && activeCount + 1 > artworkLimit) {
      return json({ error: 'Artwork limit reached for your plan. Upgrade to add more artworks.' }, { status: 403 });
    }
    // Create Stripe Product + Price for marketplace listing
    const artworkId = crypto.randomUUID();
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;
    try {
      const productResp = await stripeFetch('/v1/products', {
        method: 'POST',
        body: toForm({
          name: String(payload?.title || 'Artwork'),
          description: payload?.description || undefined,
          'images[]': primaryImageUrl || undefined,
          'metadata[artworkId]': artworkId,
          'metadata[artistId]': user.id,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const productJson = await productResp.json();
      if (!productResp.ok) throw new Error(productJson?.error?.message || 'Stripe product create failed');
      stripeProductId = productJson.id;

      const priceResp = await stripeFetch('/v1/prices', {
        method: 'POST',
        body: toForm({
          product: stripeProductId,
          unit_amount: price_cents,
          currency: String(payload?.currency || 'usd').toLowerCase(),
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const priceJson = await priceResp.json();
      if (!priceResp.ok) throw new Error(priceJson?.error?.message || 'Stripe price create failed');
      stripePriceId = priceJson.id;
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }

    const insert = {
      id: artworkId,
      artist_id: user.id,
      artist_name: clampStr(payload?.name || user.user_metadata?.name, 200) || null,
      venue_id: null,
      venue_name: null,
      title: clampStr(payload?.title, 300),
      description: clampStr(payload?.description, 5000) || null,
      price_cents,
      currency: String(payload?.currency || 'usd'),
      image_url: primaryImageUrl,
      image_urls: normalizedImageUrls,
      dimensions_width: Number.isFinite(dimensionsWidth) ? dimensionsWidth : null,
      dimensions_height: Number.isFinite(dimensionsHeight) ? dimensionsHeight : null,
      dimensions_depth: Number.isFinite(Number(dimensionsDepth)) ? dimensionsDepth : null,
      dimensions_unit: dimensionsUnit || null,
      medium: medium || null,
      materials: materials || null,
      condition: condition || null,
      known_flaws: knownFlaws || null,
      edition_type: editionType || null,
      edition_size: Number.isFinite(Number(editionSize)) ? editionSize : null,
      shipping_time_estimate: shippingTimeEstimate || null,
      in_space_photo_url: payload?.inSpacePhotoUrl || null,
      color_accuracy_ack: Boolean(payload?.colorAccuracyAck),
      is_publishable: true,
      status: 'available',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    };
    const { data, error } = await supabaseAdmin.from('artworks').insert(insert).select('*').single();
    if (error) return json({ error: error.message }, { status: 500 });

    // Generate QR code + purchase URL for every new artwork
    const purchaseUrl = artworkPurchaseUrl(data.id);
    const qrSvg = await generateQrSvg(purchaseUrl, 300);
    await supabaseAdmin.from('artworks').update({ purchase_url: purchaseUrl, qr_svg: qrSvg }).eq('id', data.id);

    const shaped = {
      id: data.id,
      title: data.title,
      status: data.status,
      price: Math.round((data.price_cents || 0) / 100),
      currency: data.currency,
      imageUrl: data.image_url,
      artistName: data.artist_name,
      venueName: data.venue_name,
      description: data.description,
      purchaseUrl,
      qrSvg,
    };
    return json(shaped, { status: 201 });
  }

  // ══════════════════════════════════════════════════════════════════
  // Approve artwork for display (venue)
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname.startsWith('/api/artworks/') && method === 'POST' && url.pathname.endsWith('/approve')) {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const user = await requireVenue(request);
    if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
    const rlApprove = await applyRateLimit('artwork-approve', request);
    if (rlApprove) return rlApprove;
    const parts = url.pathname.split('/');
    const id = parts[3];
    if (!id) return json({ error: 'Missing artwork id' }, { status: 400 });
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('artworks')
      .select('id,artist_id,archived_at,status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return json({ error: fetchErr.message }, { status: 500 });
    if (!existing) return json({ error: 'Not found' }, { status: 404 });

    const [artworkLimit, activeCount] = await Promise.all([
      getArtistArtworkLimit(existing.artist_id),
      getArtistActiveArtworkCount(existing.artist_id),
    ]);
    if (Number.isFinite(artworkLimit) && activeCount > artworkLimit) {
      return json({ error: 'Artwork limit reached for this artist plan. Please upgrade to approve additional artworks.' }, { status: 403 });
    }
    const venueName = user.user_metadata?.name || null;
    const nowIso = new Date().toISOString();
    const purchaseUrl = artworkPurchaseUrl(id);
    const { data: updated, error } = await supabaseAdmin
      .from('artworks')
      .update({ status: 'active', published_at: nowIso, archived_at: null, venue_id: user.id, venue_name: venueName, purchase_url: purchaseUrl, updated_at: nowIso })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return json({ error: error.message }, { status: 500 });
    if (!updated) return json({ error: 'Not found' }, { status: 404 });
    const qrSvg = await generateQrSvg(purchaseUrl, 300);
    await supabaseAdmin.from('artworks').update({ qr_svg: qrSvg }).eq('id', id);
    if (updated.artist_id) {
      await supabaseAdmin.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: updated.artist_id,
        role: 'artist',
        type: 'artwork_approved',
        title: 'Artwork approved for display',
        message: `${updated.title || 'Artwork'} was approved to display at ${venueName || 'a venue'}.`,
        artwork_id: updated.id,
        created_at: nowIso,
      });
    }
    return json({ ok: true, purchaseUrl, qrSvg });
  }

  // No artwork route matched
  return null;
}
