/**
 * Miscellaneous routes — root health text, dynamic sitemap.
 */

import type { WorkerContext } from '../types';

export async function handleMisc(wc: WorkerContext): Promise<Response | null> {
  const { url, method, json, text, supabaseAdmin, applySecurityHeaders } = wc;

  // ── Root health text ──
  if (url.pathname === '/') {
    return text('Artwalls API OK');
  }

  // ── Dynamic sitemap ──
  if (url.pathname === '/sitemap.xml' && method === 'GET') {
    const BASE = 'https://artwalls.space';
    const now = new Date().toISOString().split('T')[0];

    const staticPages: { loc: string; freq: string; priority: string }[] = [
      { loc: '/',                  freq: 'weekly',  priority: '1.0' },
      { loc: '/why-artwalls',      freq: 'monthly', priority: '0.8' },
      { loc: '/venues',            freq: 'monthly', priority: '0.8' },
      { loc: '/find',              freq: 'weekly',  priority: '0.9' },
      { loc: '/pricing',           freq: 'monthly', priority: '0.6' },
      { loc: '/policies',          freq: 'yearly',  priority: '0.3' },
      { loc: '/privacy-policy',    freq: 'yearly',  priority: '0.3' },
      { loc: '/terms-of-service',  freq: 'yearly',  priority: '0.3' },
      { loc: '/artist-agreement',  freq: 'yearly',  priority: '0.3' },
      { loc: '/venue-agreement',   freq: 'yearly',  priority: '0.3' },
    ];

    const citySlugs = [
      'new-york','boston','philadelphia','washington','baltimore','pittsburgh',
      'atlanta','charlotte','miami','tampa','orlando','memphis','nashville',
      'new-orleans','raleigh','richmond','charleston','jacksonville',
      'chicago','detroit','minneapolis','milwaukee','indianapolis','columbus',
      'cleveland','cincinnati','st-louis','kansas-city','omaha',
      'houston','dallas','san-antonio','austin','fort-worth','el-paso',
      'phoenix','albuquerque','oklahoma-city','tucson',
      'los-angeles','san-francisco','san-diego','san-jose','seattle',
      'portland','denver','salt-lake-city','las-vegas','sacramento','honolulu',
    ];

    const urls: string[] = [];

    for (const p of staticPages) {
      urls.push(`  <url>\n    <loc>${BASE}${p.loc}</loc>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`);
    }

    for (const slug of citySlugs) {
      urls.push(`  <url>\n    <loc>${BASE}/find/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    if (supabaseAdmin) {
      try {
        const { data: artists } = await supabaseAdmin
          .from('artists')
          .select('slug,updated_at')
          .eq('is_public', true)
          .not('slug', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(2000);

        if (artists) {
          for (const a of artists) {
            if (!a.slug) continue;
            const lastmod = a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : now;
            urls.push(`  <url>\n    <loc>${BASE}/p/artist/${encodeURIComponent(a.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
          }
        }
      } catch (e) {
        console.warn('[sitemap] artists query failed:', e);
      }

      try {
        const { data: artworks } = await supabaseAdmin
          .from('artworks')
          .select('id,updated_at')
          .eq('is_public', true)
          .is('archived_at', null)
          .in('status', ['available', 'active', 'published'])
          .order('updated_at', { ascending: false })
          .limit(5000);

        if (artworks) {
          for (const aw of artworks) {
            const lastmod = aw.updated_at ? new Date(aw.updated_at).toISOString().split('T')[0] : now;
            urls.push(`  <url>\n    <loc>${BASE}/#/purchase-${aw.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`);
          }
        }
      } catch (e) {
        console.warn('[sitemap] artworks query failed:', e);
      }

      try {
        const { data: venues } = await supabaseAdmin
          .from('venues')
          .select('id,slug,updated_at')
          .order('updated_at', { ascending: false })
          .limit(2000);

        if (venues) {
          for (const v of venues) {
            const venuePath = v.slug ? `/venues/${encodeURIComponent(v.slug)}` : `/venues/${v.id}`;
            const lastmod = v.updated_at ? new Date(v.updated_at).toISOString().split('T')[0] : now;
            urls.push(`  <url>\n    <loc>${BASE}${venuePath}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
          }
        }
      } catch (e) {
        console.warn('[sitemap] venues query failed:', e);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    const sitemapHeaders = new Headers();
    sitemapHeaders.set('Content-Type', 'application/xml; charset=utf-8');
    sitemapHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    applySecurityHeaders(sitemapHeaders);
    return new Response(xml, { status: 200, headers: sitemapHeaders });
  }

  return null;
}
