import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { loadGoogleMaps, getGooglePlaces } from '../../lib/googleMaps';

declare const google: any;

export interface VenuePlaceDetails {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  googleMapsUri?: string | null;
  websiteUri?: string | null;
  nationalPhoneNumber?: string | null;
}

interface VenuePlacesSearchProps {
  onPlaceSelect: (place: VenuePlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VenuePlacesSearch({ onPlaceSelect, placeholder = 'Search a coffee shop, restaurant, bar…', disabled }: VenuePlacesSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<any>(null);
  const placesRef = useRef<any>(null);

  useEffect(() => {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setError('Missing Google Maps API key.');
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => {
        const places = getGooglePlaces();
        if (!places) throw new Error('Google Places unavailable');
        serviceRef.current = new places.AutocompleteService();
        placesRef.current = new places.PlacesService(document.createElement('div'));
        setReady(true);
      })
      .catch((err) => {
        console.error('Google Maps load failed', err);
        setError('Failed to load Google Places.');
      });
  }, []);

  useEffect(() => {
    if (!ready || query.trim().length < 2 || disabled) {
      setPredictions([]);
      return;
    }

    const handler = setTimeout(() => {
      setLoading(true);
      serviceRef.current?.getPlacePredictions(
        { input: query, types: ['establishment'] },
        (results) => {
          setPredictions(results || []);
          setLoading(false);
        }
      );
    }, 250);

    return () => clearTimeout(handler);
  }, [query, ready, disabled]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prediction: any) => {
    if (!placesRef.current) return;
    setLoading(true);
    placesRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'formatted_address', 'url', 'website', 'international_phone_number', 'formatted_phone_number', 'place_id'],
      },
      (place: any, status: any) => {
        setLoading(false);
        if (!place || status !== google.maps.places.PlacesServiceStatus.OK) {
          setError('Unable to load venue details.');
          return;
        }
        const details: VenuePlaceDetails = {
          placeId: place.place_id || prediction.place_id,
          displayName: (place as any).displayName?.text || place.name || prediction.structured_formatting?.main_text || 'Venue',
          formattedAddress: (place as any).formattedAddress || place.formatted_address || prediction.description || '',
          googleMapsUri: (place as any).googleMapsUri || place.url || null,
          websiteUri: (place as any).websiteUri || place.website || null,
          nationalPhoneNumber:
            (place as any).nationalPhoneNumber || place.formatted_phone_number || place.international_phone_number || null,
        };
        setQuery('');
        setPredictions([]);
        onPlaceSelect(details);
      }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus-within:ring-2 focus-within:ring-[var(--focus)]">
        <Search className="w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || !!error}
          className="flex-1 ml-2 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
        {loading && <Loader2 className="w-4 h-4 text-[var(--blue)] animate-spin" />}
      </div>

      {error && (
        <div className="mt-2 text-xs text-[var(--warning)]">
          {error}
        </div>
      )}

      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--surface-2)] border-b border-[var(--border)] last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--text)]">{p.structured_formatting?.main_text || p.description}</p>
                    {p.structured_formatting?.secondary_text && (
                      <p className="text-xs text-[var(--text-muted)]">{p.structured_formatting.secondary_text}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
