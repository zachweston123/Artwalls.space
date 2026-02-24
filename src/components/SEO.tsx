import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonical?: string;
}

function setMeta(property: string, content: string, isOg = false) {
  const attr = isOg ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function SEO({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterCard = 'summary',
  canonical,
}: SEOProps) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) setMeta('description', description);

    // Open Graph
    setMeta('og:title', ogTitle || title, true);
    if (description || ogDescription) setMeta('og:description', ogDescription || description || '', true);
    if (ogImage) setMeta('og:image', ogImage, true);
    if (ogUrl) setMeta('og:url', ogUrl, true);
    setMeta('og:type', 'website', true);
    setMeta('og:site_name', 'Artwalls', true);

    // Twitter Card
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', ogTitle || title);
    if (description || ogDescription) setMeta('twitter:description', ogDescription || description || '');
    if (ogImage) setMeta('twitter:image', ogImage);

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.href = canonical;
    }
  }, [title, description, ogTitle, ogDescription, ogImage, ogUrl, twitterCard, canonical]);

  return null;
}
