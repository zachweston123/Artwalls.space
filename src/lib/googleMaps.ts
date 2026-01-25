let loaderPromise: Promise<void> | null = null;

function hasGooglePlaces(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.maps?.places;
}

export function loadGoogleMaps(apiKey: string, libraries = 'places'): Promise<void> {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
  if (hasGooglePlaces()) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${libraries}`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function getGooglePlaces() {
  if (!hasGooglePlaces()) return null;
  return (window as any).google.maps.places as typeof google.maps.places;
}
