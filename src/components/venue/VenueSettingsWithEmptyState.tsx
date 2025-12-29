import { useState } from 'react';
import { Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';

export function VenueSettingsWithEmptyState() {
  const [hasSchedule, setHasSchedule] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    dayOfWeek: 'Thursday',
    startTime: '16:00',
    endTime: '18:00',
    timezone: 'PST',
  });

  const [tempConfig, setTempConfig] = useState(scheduleConfig);
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

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const validateConfig = () => {
    const newErrors: { [key: string]: string } = {};
    
    const start = parseInt(tempConfig.startTime.replace(':', ''));
    const end = parseInt(tempConfig.endTime.replace(':', ''));
    
    if (end <= start) {
      newErrors.endTime = 'End time must be after start time';
    }
    
    const duration = (end - start) / 100;
    if (duration < 1) {
      newErrors.duration = 'Recommended duration: 1-3 hours';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateConfig()) {
      setScheduleConfig(tempConfig);
      setHasSchedule(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const getDuration = () => {
    const start = parseInt(tempConfig.startTime.replace(':', ''));
    const end = parseInt(tempConfig.endTime.replace(':', ''));
    const hours = (end - start) / 100;
    return hours;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Venue Settings</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Manage your venue profile and scheduling preferences</p>
      </div>

      {/* Empty State - No Schedule Set */}
      {!hasSchedule && (
        <div className="max-w-3xl mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="text-base text-yellow-900 dark:text-yellow-200 mb-1 text-neutral-900 dark:text-neutral-50">Install Window Not Set</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Set your weekly install/pickup window to enable artist scheduling. This simplifies coordination and reduces back-and-forth messaging.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        {/* Install & Pickup Window */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl text-neutral-900 dark:text-neutral-50">Install & Pickup Window</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Set one weekly time window when artists can install or pick up art. This keeps scheduling simple.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Day of Week */}
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Day of Week</label>
              <select
                value={tempConfig.dayOfWeek}
                onChange={(e) => setTempConfig({ ...tempConfig, dayOfWeek: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={tempConfig.startTime}
                  onChange={(e) => setTempConfig({ ...tempConfig, startTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={tempConfig.endTime}
                  onChange={(e) => setTempConfig({ ...tempConfig, endTime: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                    errors.endTime
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-neutral-300 dark:border-neutral-600 focus:ring-green-500'
                  }`}
                />
                {errors.endTime && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.endTime}</p>
                )}
              </div>
            </div>

            {/* Duration Info */}
            {!errors.endTime && getDuration() > 0 && (
              <div className={`p-3 rounded-lg ${
                getDuration() >= 1 && getDuration() <= 3
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
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
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Timezone</label>
              <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300">
                {tempConfig.timezone} (Auto-detected)
              </div>
            </div>

            {/* Preview */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 border border-green-100 dark:border-green-900">
              <p className="text-sm text-green-900 dark:text-green-200">
                <strong>Preview:</strong> Artists can schedule installs/pickups every{' '}
                {tempConfig.dayOfWeek}, {formatTime(tempConfig.startTime)} – {formatTime(tempConfig.endTime)}.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              <Save className="w-5 h-5" />
              <span>Save Schedule</span>
            </button>
          </div>
        </div>

        {/* Venue Info (Additional Settings Placeholder) */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-xl mb-4 text-neutral-900 dark:text-neutral-50">Venue Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Venue Name</label>
              <input
                type="text"
                defaultValue="The Corner Café"
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Contact Email</label>
              <input
                type="email"
                defaultValue="venue@example.com"
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Schedule updated successfully!</span>
        </div>
      )}
    </div>
  );
}
