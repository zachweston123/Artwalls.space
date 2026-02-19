/**
 * VenueProfileCompleteness — progress bar + actionable checklist.
 * Shows what's missing and deep-links to the right settings page.
 * Used in the venue dashboard.
 */

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, MapPin, Image, Frame, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VenueProfileCompletenessProps {
  userId: string;
  onNavigate: (page: string) => void;
  /** Called when the completion score is computed, so parent can use it */
  onScoreComputed?: (score: number) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  page: string;
  icon: React.ReactNode;
  weight: number;
}

export function VenueProfileCompleteness({ userId, onNavigate, onScoreComputed }: VenueProfileCompletenessProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      try {
        // Fetch venue profile
        const { data: venue } = await supabase
          .from('venues')
          .select('name,address,bio,labels,cover_photo_url,founded_year')
          .eq('id', userId)
          .maybeSingle();

        // Fetch wallspaces
        const { data: walls } = await supabase
          .from('wallspaces')
          .select('id,width,height,photos')
          .eq('venue_id', userId);

        // Fetch venue photos (cover + any additional)
        const photoCount = [
          venue?.cover_photo_url,
          ...(walls || []).flatMap(w => w.photos || [])
        ].filter(Boolean).length;

        const wallsWithDimensions = (walls || []).filter(w => w.width && w.height);

        if (cancelled) return;

        const checklist: ChecklistItem[] = [
          {
            id: 'name-address',
            label: 'Venue name & address',
            description: 'Add your venue name and street address so artists can find you.',
            done: Boolean(venue?.name && venue?.address),
            page: 'venue-profile',
            icon: <MapPin className="w-4 h-4" />,
            weight: 25,
          },
          {
            id: 'photos',
            label: 'At least 5 photos',
            description: `Upload photos of your space and walls. You have ${photoCount} so far.`,
            done: photoCount >= 5,
            page: 'venue-profile',
            icon: <Image className="w-4 h-4" />,
            weight: 20,
          },
          {
            id: 'wallspace',
            label: 'Wall space with dimensions',
            description: 'Create at least one wall space with width × height measurements.',
            done: wallsWithDimensions.length >= 1,
            page: 'venue-walls',
            icon: <Frame className="w-4 h-4" />,
            weight: 25,
          },
          {
            id: 'schedule',
            label: 'Install / pickup window',
            description: 'Set your preferred schedule for art installations and pickups.',
            done: false, // We'll check the schedule table
            page: 'venue-settings',
            icon: <Clock className="w-4 h-4" />,
            weight: 15,
          },
          {
            id: 'bio-labels',
            label: 'Description & style tags',
            description: 'Write a short bio and tag what art styles fit your space.',
            done: Boolean(venue?.bio && (venue?.labels || []).length > 0),
            page: 'venue-profile',
            icon: <FileText className="w-4 h-4" />,
            weight: 15,
          },
        ];

        // Check if venue has any schedule entries
        const { count: scheduleCount } = await supabase
          .from('venue_schedules')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', userId);

        if (!cancelled) {
          // Update schedule check
          const updated = checklist.map(item =>
            item.id === 'schedule' ? { ...item, done: (scheduleCount || 0) > 0 } : item
          );

          setItems(updated);

          const score = updated.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
          onScoreComputed?.(score);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to compute profile completeness', err);
        if (!cancelled) setLoading(false);
      }
    }
    compute();
    return () => { cancelled = true; };
  }, [userId, onScoreComputed]);

  if (loading) return null;

  const score = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  const allDone = items.every(i => i.done);
  const incomplete = items.filter(i => !i.done);

  if (allDone) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-green-500/30 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Profile 100% complete</p>
          <p className="text-xs text-[var(--text-muted)]">Your venue profile is fully set up and ready for artists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header with progress bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-[var(--text)]">
                Profile completeness
              </span>
              <span className="text-sm font-bold text-[var(--text)]">{score}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-green-500"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--text-muted)] ml-3" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--text-muted)] ml-3" />
        )}
      </button>

      {/* Expanded checklist */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                item.done ? 'bg-green-500/5' : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {item.done ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'text-green-600 dark:text-green-400 line-through' : 'text-[var(--text)]'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
              </div>
              {!item.done && (
                <button
                  onClick={() => onNavigate(item.page)}
                  className="flex-shrink-0 px-3 py-1 text-xs font-medium bg-[var(--blue)] text-[var(--on-blue)] rounded-md hover:bg-[var(--blue-hover)] transition-colors"
                >
                  Fix
                </button>
              )}
            </div>
          ))}

          {incomplete.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] pt-2">
              Complete {incomplete.length} more item{incomplete.length > 1 ? 's' : ''} to reach 100% and unlock Founding Venue eligibility.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
