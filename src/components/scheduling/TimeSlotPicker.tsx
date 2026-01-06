import React from 'react';
import { Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVenueAvailability } from '../../lib/api';

interface TimeSlotPickerProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string;
  type: 'install' | 'pickup';
  artworkTitle: string;
  onConfirm: (timeIso: string) => void;
}

export function TimeSlotPicker({ isOpen, onClose, venueId, type, artworkTitle, onConfirm }: TimeSlotPickerProps) {
  const [selectedSlot, setSelectedSlot] = React.useState<string>('');
  const [weeklySlots, setWeeklySlots] = React.useState<Array<{ weekStart: Date; slots: string[] }>>([]);
  const [slotMinutes, setSlotMinutes] = React.useState<number>(30);
  const [windowDay, setWindowDay] = React.useState<string>('');
  const [startLabel, setStartLabel] = React.useState<string>('');
  const [endLabel, setEndLabel] = React.useState<string>('');
  const [weekStart, setWeekStart] = React.useState<Date>(() => {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0,0,0,0);
    return d;
  });

  const fetchAvailability = React.useCallback(async () => {
    try {
      const weeksToShow = 4;
      const promises: Promise<ReturnType<typeof getVenueAvailability>>[] = [] as any;
      const starts: Date[] = [];
      for (let i = 0; i < weeksToShow; i++) {
        const s = new Date(weekStart);
        s.setDate(s.getDate() + i * 7);
        starts.push(s);
        promises.push(getVenueAvailability(venueId, s.toISOString()) as any);
      }
      const results = await Promise.all(promises);
      const agg = results.map((r, idx) => ({ weekStart: starts[idx], slots: (r as any).slots || [], meta: r })) as any;
      setWeeklySlots(agg.map((a: any) => ({ weekStart: a.weekStart, slots: a.slots })));
      // take metadata from first
      const meta = results[0] as any;
      setSlotMinutes(meta?.slotMinutes || 30);
      setWindowDay(meta?.dayOfWeek || '');
      setStartLabel(meta?.startTime ? formatTimeLabel(meta.startTime) : '');
      setEndLabel(meta?.endTime ? formatTimeLabel(meta.endTime) : '');
    } catch (e) {
      setWeeklySlots([]);
    }
  }, [venueId, weekStart]);

  React.useEffect(() => {
    if (!isOpen) return;
    fetchAvailability();
    const t = setInterval(fetchAvailability, 4000);
    return () => clearInterval(t);
  }, [isOpen, fetchAvailability]);

  const formatTimeLabel = (timeHHmm: string) => {
    const [hour, minute] = timeHHmm.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const formatIsoToLabel = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const mm = m.toString().padStart(2, '0');
    return `${displayHour}:${mm} ${ampm}`;
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      onConfirm(selectedSlot);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Modal - Desktop / Bottom Sheet - Mobile */}
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div className="bg-[var(--surface-1)] rounded-t-2xl lg:rounded-2xl max-w-lg w-full lg:max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div>
              <h3 className="text-xl mb-1 text-[var(--text)]">Schedule {type === 'install' ? 'Install' : 'Pickup'}</h3>
              <p className="text-sm text-[var(--text-muted)]">{artworkTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Window Info */}
          <div className="p-6 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[var(--blue)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-[var(--text)] mb-1">Install/Pickup Window</p>
                <p className="text-[var(--text-muted)]">
                  {windowDay ? `${windowDay}s, ${startLabel} – ${endLabel}` : 'No schedule set'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-1)]"
                  onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-1)]"
                  onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="p-6 max-h-[50vh] lg:max-h-96 overflow-y-auto">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Select a {slotMinutes}-minute time slot for this or next {windowDay ? windowDay.toLowerCase() : ''}.
            </p>
            {weeklySlots.length === 0 || weeklySlots.every(w => w.slots.length === 0) ? (
              <div className="text-sm text-[var(--text-muted)]">No available slots. Try another week.</div>
            ) : (
              <div className="space-y-5">
                {weeklySlots.map(({ weekStart, slots }) => (
                  <div key={weekStart.toISOString()}>
                    <div className="text-xs text-[var(--text-muted)] mb-2">
                      Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {slots.map((slotIso) => (
                        <button
                          key={slotIso}
                          onClick={() => setSelectedSlot(slotIso)}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            selectedSlot === slotIso
                              ? 'border-[var(--blue)] bg-[var(--surface-2)] text-[var(--blue)]'
                              : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--blue)] hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          {formatIsoToLabel(slotIso)}
                        </button>
                      ))}
                      {slots.length === 0 && (
                        <div className="text-sm text-[var(--text-muted)]">No slots this week</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-2)]">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedSlot}
                className="flex-1 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Time
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
