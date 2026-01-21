import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { City, searchCities } from '../../data/cities';

interface CitySelectProps {
  value: string;
  onChange: (cityName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function CitySelect({
  value,
  onChange,
  placeholder = 'Search cities...',
  disabled = false,
  label,
}: CitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Update search results
  useEffect(() => {
    const query = searchQuery || value;
    if (query) {
      setResults(searchCities(query));
      setHighlightedIndex(0);
    } else {
      setResults([]);
    }
  }, [searchQuery, value]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => (i + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => (i - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[highlightedIndex]) {
            selectCity(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
        default:
          break;
      }
    },
    [isOpen, results, highlightedIndex]
  );

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Handle clicks outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function selectCity(city: City) {
    onChange(`${city.name}, ${city.state}`);
    setSearchQuery('');
    setIsOpen(false);
  }

  function clearSelection() {
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  }

  const displayValue = value || '';
  const hasValue = value.length > 0;

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium mb-2 text-[var(--text)]">
          {label}
        </label>
      )}
      
      <div
        ref={containerRef}
        className="relative"
      >
        {/* Input Field */}
        <div
          className={`
            relative flex items-center w-full h-12 px-4 rounded-xl
            border border-[var(--border)] bg-[var(--surface-2)]
            focus-within:border-[var(--blue)] focus-within:ring-2 focus-within:ring-[var(--blue)]/20
            hover:border-[var(--border-hover)] transition-all duration-200
            box-border
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Search className="w-5 h-5 text-[var(--text-muted)] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={isOpen ? searchQuery : displayValue}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // If user is clearing their input, ensure it updates
              if (e.target.value === '' && !isOpen) {
                  onChange('');
              }
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              // Populate search query with current value when opening so user can edit it
              if (displayValue && !searchQuery) {
                setSearchQuery(displayValue);
              }
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--text-muted)] text-sm font-medium leading-none overflow-hidden text-ellipsis whitespace-nowrap"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={isOpen ? 'city-listbox' : undefined}
            aria-activedescendant={isOpen && results[highlightedIndex] ? `city-option-${highlightedIndex}` : undefined}
          />
          {hasValue && !isOpen && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-[var(--surface-1)] rounded transition-colors flex-shrink-0"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {/* Dropdown List */}
        {isOpen && results.length > 0 && (
          <ul
            id="city-listbox"
            ref={listRef}
            role="listbox"
            className="absolute z-[100] w-full mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl max-h-64 overflow-y-auto"
            style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)' }}
          >
            {results.map((city, index) => (
              <li key={`${city.name}-${city.state}`} role="presentation">
                <button
                  id={`city-option-${index}`}
                  type="button"
                  onClick={() => selectCity(city)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full text-left px-4 py-3 transition-colors duration-100
                    ${
                      index === highlightedIndex
                        ? 'bg-[var(--blue)] text-white'
                        : 'hover:bg-[var(--surface-2)] text-[var(--text)]'
                    }
                  `}
                  aria-selected={index === highlightedIndex}
                  role="option"
                >
                  <div className="font-medium text-sm leading-none mb-1">{city.name}</div>
                  <div className="text-xs opacity-90">{city.state}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty State */}
        {isOpen && searchQuery && results.length === 0 && (
          <div 
            className="absolute z-[100] w-full mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 text-center text-[var(--text-muted)] text-sm"
            style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)' }}
          >
            No cities found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Help Text */}
      {value && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          ✓ Selected: {value}
        </p>
      )}
    </div>
  );
}
