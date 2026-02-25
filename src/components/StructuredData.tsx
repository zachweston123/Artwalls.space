import { useEffect, useRef } from 'react';

/**
 * StructuredData — injects a `<script type="application/ld+json">` tag into
 * `<head>` and cleans it up on unmount / data change.
 *
 * Usage:
 *   <StructuredData data={{ "@type": "Organization", ... }} />
 *   <StructuredData data={[orgSchema, websiteSchema]} />
 */

interface StructuredDataProps {
  /** A single JSON-LD object or an array of objects (rendered as @graph). */
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Remove any previous script injected by this instance
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }

    const payload = Array.isArray(data)
      ? { '@context': 'https://schema.org', '@graph': data }
      : { '@context': 'https://schema.org', ...data };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(payload);
    script.setAttribute('data-structured-data', 'true');
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      script.remove();
    };
  }, [JSON.stringify(data)]);

  return null;
}

// ── Pre-built schema helpers ─────────────────────────────────────────────────

const SITE_URL = 'https://artwalls.space';

/** Organization + WebSite — used on every page via App.tsx */
export function siteSchemas() {
  return [
    {
      '@type': 'Organization',
      name: 'Artwalls',
      url: SITE_URL,
      logo: `${SITE_URL}/og-image.png`,
      sameAs: [],
      description:
        'Artwalls connects local artists with cafés, restaurants, and venues to display, rotate, and sell artwork on real walls.',
    },
    {
      '@type': 'WebSite',
      name: 'Artwalls',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/find/{city_slug}`,
        },
        'query-input': 'required name=city_slug',
      },
    },
  ] as Record<string, unknown>[];
}

/** Product-like schema for an artwork on its purchase page */
export function artworkSchema(opts: {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  artistName?: string;
  url: string;
  availability?: 'InStock' | 'SoldOut';
}) {
  return {
    '@type': 'Product',
    name: opts.name,
    ...(opts.description && { description: opts.description }),
    ...(opts.image && { image: opts.image }),
    ...(opts.artistName && {
      brand: { '@type': 'Person', name: opts.artistName },
    }),
    url: opts.url,
    ...(opts.price != null && {
      offers: {
        '@type': 'Offer',
        price: opts.price,
        priceCurrency: (opts.currency || 'USD').toUpperCase(),
        availability: `https://schema.org/${opts.availability ?? 'InStock'}`,
        seller: { '@type': 'Organization', name: 'Artwalls' },
      },
    }),
  } as Record<string, unknown>;
}

/** Person schema for a public artist profile */
export function artistSchema(opts: {
  name: string;
  description?: string;
  image?: string;
  url: string;
  sameAs?: string[];
}) {
  return {
    '@type': 'Person',
    name: opts.name,
    ...(opts.description && { description: opts.description }),
    ...(opts.image && { image: opts.image }),
    url: opts.url,
    ...(opts.sameAs?.length && { sameAs: opts.sameAs }),
  } as Record<string, unknown>;
}
