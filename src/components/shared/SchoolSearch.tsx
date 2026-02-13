import { useEffect, useState, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface School {
  id: string;
  name: string;
  type: string;
  city?: string;
  state?: string;
  country: string;
  verified: boolean;
  email_domain?: string;
}

interface SchoolSearchProps {
  selectedSchoolId: string;
  selectedSchoolName: string;
  onSchoolSelect: (id: string, name: string) => void;
}

export function SchoolSearch({
  selectedSchoolId,
  selectedSchoolName,
  onSchoolSelect,
}: SchoolSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for schools
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(10);

        if (error) throw error;
        setResults(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to search schools:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSchool = (school: School) => {
    onSchoolSelect(school.id, school.name);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSchoolSelect('', '');
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const getSchoolTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'university': '🎓 University',
      'college': '🎓 College',
      'art_school': '🎨 Art School',
      'high_school': '📚 High School',
    };
    return labels[type] || type;
  };

  const getLocationLabel = (school: School) => {
    const parts = [];
    if (school.city) parts.push(school.city);
    if (school.state) parts.push(school.state);
    if (school.country) parts.push(school.country);
    return parts.join(', ');
  };

  return (
    <div ref={searchRef} className="relative">
      {!selectedSchoolName ? (
        <div className="relative">
          <div data-input-wrapper="" className="flex items-center px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] focus-within:border-[var(--focus)] focus-within:ring-2 focus-within:ring-[var(--focus)]/30 transition-colors">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowDropdown(true)}
              className="flex-1 ml-2 bg-transparent border-none outline-none text-[var(--text)] placeholder:text-[var(--text-muted)]"
              placeholder="Search for your school..."
            />
            {loading && <Loader2 className="w-4 h-4 text-[var(--blue)] animate-spin" />}
          </div>

          {showDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg z-50">
              <div className="max-h-64 overflow-y-auto">
                {results.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--surface-2)] border-b border-[var(--border)] last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[var(--text)]">{school.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[var(--text-muted)]">
                            {getSchoolTypeLabel(school.type)}
                          </span>
                          {school.verified && (
                            <span className="text-xs text-[var(--green)]">✓ Verified</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {getLocationLabel(school)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg p-4 text-center text-[var(--text-muted)] z-50">
              <p>No schools found. Try another search term.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex-1">
            <p className="font-medium text-[var(--text)]">{selectedSchoolName}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Selected for student verification
            </p>
          </div>
          <button
            onClick={handleClear}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title="Clear selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
