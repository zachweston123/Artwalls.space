import { useEffect, useMemo, useState } from 'react';
import { Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getVenueSchedule, saveVenueSchedule } from '../../lib/api';
import { generateTimeOptions } from '../../lib/timeOptions';
import { supabase } from '../../lib/supabase';

export function VenueSettingsWithEmptyState() {
  const [hasSchedule, setHasSchedule] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [venueId, setVenueId] = useState<string>('');
  const [venueInfo, setVenueInfo] = useState({ name: '', email: '' });
  const [scheduleConfig, setScheduleConfig] = useState({
    dayOfWeek: 'Thursday',
    startTime: '16:00',
    endTime: '18:00',
    timezone: 'PST',
    slotMinutes: 60 as 15 | 30 | 60 | 120,
  });

  const [tempConfig, setTempConfig] = useState(scheduleConfig);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      const id = user?.id || '';
      setVenueId(id);
      if (user) {
        setVenueInfo({
          name: (user.user_metadata?.name as string) || user.user_metadata?.venue_name || user.email || '',
          email: user.email || '',
        });
      }
      if (id) {
        try {
          const { schedule } = await getVenueSchedule(id);
          if (schedule) {
            const interval = (schedule.installSlotIntervalMinutes ?? schedule.slotMinutes ?? 60) as 15 | 30 | 60 | 120;
            setScheduleConfig({
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              timezone: schedule.timezone || 'PST',
              slotMinutes: interval,
            });
            setTempConfig({
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              timezone: schedule.timezone || 'PST',
              slotMinutes: interval,
            });
            setHasSchedule(true);
          } else {
            setHasSchedule(false);
          }
        } catch {
          setHasSchedule(false);
        }
      }
    }).catch(() => {});
  }, []);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const baseTimeOptions = useMemo(() => {
    const times: string[] = [];
    for (let hour = 6; hour <= 22; hour += 1) {
      ['00', '15', '30', '45'].forEach((minutes) => {
        times.push(`${String(hour).padStart(2, '0')}:${minutes}`);
      });
    }
    return times;
  }, []);

  const timeOptions = useMemo(() => {
    const set = new Set(baseTimeOptions);
    [tempConfig.startTime, tempConfig.endTime].forEach((time) => time && set.add(time));
    return Array.from(set).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }, [baseTimeOptions, tempConfig.endTime, tempConfig.startTime]);

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const validateConfig = () => {
    const newErrors: { [key: string]: string } = {};
    
    const start = timeToMinutes(tempConfig.startTime);
    const end = timeToMinutes(tempConfig.endTime);
    
    if (end <= start) {
      newErrors.endTime = 'End time must be after start time';
    }

    const duration = (end - start) / 60;
    if (duration < 1) {
      newErrors.duration = 'Recommended duration: 1-3 hours';
    }

    if (end - start < tempConfig.slotMinutes) {
      newErrors.slotMinutes = 'Install window is shorter than the selected appointment length';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!(validateConfig() && venueId)) return;

    try {
      await saveVenueSchedule(venueId, {
        dayOfWeek: tempConfig.dayOfWeek,
        startTime: tempConfig.startTime,
        endTime: tempConfig.endTime,
        slotMinutes: tempConfig.slotMinutes,
        installSlotIntervalMinutes: tempConfig.slotMinutes,
        timezone: tempConfig.timezone,
      } as any);

      // Persist locally and hide the empty-state banner
      setScheduleConfig(tempConfig);
      setHasSchedule(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error('Failed to save schedule', e);
      setHasSchedule(false);
      setErrors((prev) => ({ ...prev, general: 'Save failed. Please make sure you are signed in as a venue and try again.' }));
    }
  };

  const getDuration = () => {
    const start = timeToMinutes(tempConfig.startTime);
    const end = timeToMinutes(tempConfig.endTime);
    return (end - start) / 60;
  };

  const slotPreview = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return generateTimeOptions({
      startTime: tempConfig.startTime,
      endTime: tempConfig.endTime,
      intervalMinutes: tempConfig.slotMinutes,
      baseDate: base,
    });
  }, [tempConfig.endTime, tempConfig.slotMinutes, tempConfig.startTime]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Venue Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your venue profile and scheduling preferences</p>
      </div>

      {/* Empty State - No Schedule Set */}
      {!hasSchedule && (
        <div className="max-w-3xl mb-6">
          <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-[var(--warning)] flex-shrink-0" />
              <div>
                <h3 className="text-base mb-1">Install Window Not Set</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Set your weekly install/pickup window to enable artist scheduling. This simplifies coordination and reduces back-and-forth messaging.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        {/* Install & Pickup Window */}
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden mb-6">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--green-muted)] rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--green)]" />
              </div>
              <h2 className="text-xl">Install & Pickup Window</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Set one weekly time window when artists can install or pick up art. This keeps scheduling simple.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Day of Week */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Day of Week</label>
              <select
                value={tempConfig.dayOfWeek}
                onChange={(e) => setTempConfig({ ...tempConfig, dayOfWeek: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Start Time</label>
                <select
                  value={tempConfig.startTime}
                  onChange={(e) => setTempConfig({ ...tempConfig, startTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {formatTime(time)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">End Time</label>
                <select
                  value={tempConfig.endTime}
                  onChange={(e) => setTempConfig({ ...tempConfig, endTime: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border bg-[var(--surface-2)] focus:outline-none focus:ring-2 ${
                    errors.endTime
                      ? 'border-[var(--danger)] focus:ring-[var(--danger)]'
                      : 'border-[var(--border)] focus:ring-[var(--focus)]'
                  }`}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {formatTime(time)}
                    </option>
                  ))}
                </select>
                {errors.endTime && (
                  <p className="text-xs text-[var(--danger)] mt-1">{errors.endTime}</p>
                )}
                {errors.duration && !errors.endTime && (
                  <p className="text-xs text-[var(--warning)] mt-1">{errors.duration}</p>
                )}
              </div>
            </div>

            {/* Slot Length */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Install appointment length</label>
              <select
                value={tempConfig.slotMinutes}
                onChange={(e) => setTempConfig({ ...tempConfig, slotMinutes: Number(e.target.value) as 15 | 30 | 60 | 120 })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-2">This controls the time options artists can pick within your install window.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Recommendation: 15–30 minutes for a single artwork; 60–120 minutes when installing a set from one artist.</p>
              {errors.slotMinutes && (
                <p className="text-xs text-[var(--danger)] mt-1">{errors.slotMinutes}</p>
              )}
              {slotPreview.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-2">Example options: {slotPreview.slice(0, 4).map((o) => o.label).join(', ')}{slotPreview.length > 4 ? '…' : ''}</p>
              )}
            </div>

            {/* Duration Info */}
            {!errors.endTime && getDuration() > 0 && (
              <div className={`p-3 rounded-lg border border-[var(--border)] ${
                getDuration() >= 1 && getDuration() <= 3
                  ? 'bg-[var(--green-muted)] text-[var(--green)]'
                  : 'bg-[var(--surface-2)] text-[var(--warning)]'
              }`}>
                <p className="text-sm">
                  Duration: {getDuration()} hour{getDuration() !== 1 ? 's' : ''}
                  {getDuration() < 1 && ' (Too short - recommended: 1-3 hours)'}
                  {getDuration() > 3 && ' (Consider a shorter window for better scheduling)'}
                </p>
              </div>
            )}

            {/* Timezone Display */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Timezone</label>
              <div className="px-4 py-2 bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)] border border-[var(--border)]">
                {tempConfig.timezone} (Auto-detected)
              </div>
            </div>

            {/* Preview */}
            <div className="bg-[var(--green-muted)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-sm text-[var(--text)]">
                <strong>Preview:</strong> Artists can schedule installs/pickups every{' '}
                {tempConfig.dayOfWeek}, {formatTime(tempConfig.startTime)} – {formatTime(tempConfig.endTime)}.
              </p>
            </div>

            {errors.general && (
              <div className="p-3 rounded-lg border border-[var(--danger)] text-[var(--danger)] bg-[var(--surface-2)]">
                {errors.general}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              <Save className="w-5 h-5" />
              <span>Save Schedule</span>
            </button>
          </div>
        </div>

        {/* Venue Info (Additional Settings Placeholder) */}
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-xl mb-4">Venue Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Venue Name</label>
              <input
                type="text"
                value={venueInfo.name}
                onChange={(e) => setVenueInfo({ ...venueInfo, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Contact Email</label>
              <input
                type="email"
                value={venueInfo.email}
                onChange={(e) => setVenueInfo({ ...venueInfo, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[var(--green)] text-[var(--accent-contrast)] px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Schedule updated successfully!</span>
        </div>
      )}
    </div>
  );
}
