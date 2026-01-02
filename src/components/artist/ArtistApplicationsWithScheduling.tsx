import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { mockApplications, mockVenueSchedule } from '../../data/mockData';
import type { Application } from '../../data/mockData';
import { TimeSlotPicker } from '../scheduling/TimeSlotPicker';
import { InstallRules } from '../scheduling/InstallRules';
import { DurationBadge } from '../scheduling/DisplayDurationSelector';

export function ArtistApplicationsWithScheduling() {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledInstalls, setScheduledInstalls] = useState<{ [key: string]: string }>({});

  const handleScheduleInstall = (app: Application) => {
    setSelectedApp(app);
    setShowSchedulePicker(true);
  };

  const handleTimeConfirm = (time: string) => {
    if (!selectedApp) return;

    const formatTime = (timeString: string) => {
      const [hour, minute] = timeString.split(':');
      const h = parseInt(hour);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const day = mockVenueSchedule.dayOfWeek.substring(0, 3);
      return `${day} ${displayHour}:${minute} ${ampm}`;
    };

    setScheduledInstalls({
      ...scheduledInstalls,
      [selectedApp.id]: formatTime(time),
    });

    setShowSchedulePicker(false);
    setSelectedApp(null);
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900">My Applications</h1>
        <p className="text-neutral-600">
          {pendingCount} pending • {approvedCount} approved
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {applications.map((application) => (
          <div
            key={application.id}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow dark:hover:shadow-lg"
          >
            <div className="h-48 bg-neutral-100 overflow-hidden">
              <img
                src={application.artworkImage}
                alt={application.artworkTitle}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg mb-1 text-neutral-900">{application.artworkTitle}</h3>
                  <p className="text-sm text-neutral-600">{application.venueName}</p>
                </div>
                {getStatusBadge(application.status)}
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
                <Calendar className="w-4 h-4" />
                Applied {new Date(application.appliedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>

              {/* Approved - Schedule Install Flow */}
              {application.status === 'approved' && (
                <div>
                  {/* Display Duration Info */}
                  {(application as any).approvedDuration && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-sm text-green-900">Display term:</span>
                        <DurationBadge duration={(application as any).approvedDuration} size="md" />
                      </div>
                      <p className="text-xs text-green-700">
                        You'll rotate or pick up the artwork during the venue's weekly window after the end date.
                      </p>
                    </div>
                  )}

                  {!scheduledInstalls[application.id] ? (
                    <div className="bg-green-50 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm text-green-900 mb-1">Application Approved!</h4>
                          <p className="text-xs text-green-700">
                            Install window: {mockVenueSchedule.dayOfWeek}s, {formatTime(mockVenueSchedule.startTime)} – {formatTime(mockVenueSchedule.endTime)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleScheduleInstall(application)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Choose an Install Time
                      </button>
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm text-blue-900 mb-1">Install Scheduled</h4>
                          <p className="text-blue-700">
                            <strong>{scheduledInstalls[application.id]}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleScheduleInstall(application)}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}

                  {/* Install Rules */}
                  <InstallRules variant="accordion" />
                </div>
              )}

              {/* Pending */}
              {application.status === 'pending' && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <Clock className="w-4 h-4" />
                    <span>Awaiting venue review</span>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {application.status === 'rejected' && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <XCircle className="w-4 h-4" />
                    <span>Application not approved</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2 text-neutral-900">No applications yet</h3>
          <p className="text-neutral-600 mb-6">Apply to display your artwork at local venues</p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Browse Venues
          </button>
        </div>
      )}

      {/* Time Slot Picker Modal */}
      {showSchedulePicker && selectedApp && (
        <TimeSlotPicker
          isOpen={showSchedulePicker}
          onClose={() => {
            setShowSchedulePicker(false);
            setSelectedApp(null);
          }}
          windowDay={mockVenueSchedule.dayOfWeek}
          startTime={mockVenueSchedule.startTime}
          endTime={mockVenueSchedule.endTime}
          type="install"
          artworkTitle={selectedApp.artworkTitle}
          onConfirm={handleTimeConfirm}
        />
      )}
    </div>
  );
}