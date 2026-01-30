import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: PlaceDetails) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
}

export interface PlaceDetails {
  formattedAddress: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete;
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

// Load Google Maps script once
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleMapsLoading) {
      return;
    }

    googleMapsLoading = true;

    window.initGoogleMapsCallback = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your address...',
  label = 'Address',
  helpText,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY)');
      setIsReady(true); // Still allow manual input
      return;
    }

    setIsLoading(true);

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoading(false);
        setIsReady(true);

        if (inputRef.current && window.google) {
          // Initialize autocomplete
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              types: ['address'],
              componentRestrictions: { country: 'us' }, // Limit to US addresses
              fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
            }
          );

          // Listen for place selection
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (!place || !place.formatted_address) return;

            const details: PlaceDetails = {
              formattedAddress: place.formatted_address,
              placeId: place.place_id,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
            };

            // Parse address components
            place.address_components?.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number') || types.includes('route')) {
                details.streetAddress = details.streetAddress
                  ? `${details.streetAddress} ${component.long_name}`
                  : component.long_name;
              }
              if (types.includes('locality')) {
                details.city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                details.state = component.short_name;
              }
              if (types.includes('postal_code')) {
                details.zipCode = component.long_name;
              }
              if (types.includes('country')) {
                details.country = component.short_name;
              }
            });

            setLocalValue(place.formatted_address);
            onChange(place.formatted_address, details);
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        setIsLoading(false);
        setIsReady(true);
      });

    return () => {
      // Cleanup if needed
      if (autocompleteRef.current) {
        window.google?.maps.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    // Only call onChange for manual typing if autocomplete isn't active
    if (!window.google) {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    // Update parent with current value on blur (for manual entry without selection)
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm text-[var(--text-muted)] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleManualChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          disabled={isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
        )}
      </div>
      {helpText && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{helpText}</p>
      )}
      {!apiKey && isReady && (
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Address autocomplete unavailable. Enter address manually.
        </p>
      )}
    </div>
  );
}
