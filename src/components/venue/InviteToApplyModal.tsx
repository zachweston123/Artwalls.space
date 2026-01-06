import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { mockWallSpaces } from '../../data/mockData';

interface InviteToApplyModalProps {
  artistName: string;
  venueName: string;
  onSend: (data: InviteData) => void;
  onCancel: () => void;
}

export interface InviteData {
  wallspaceId: string;
  duration: number;
  message: string;
}

export function InviteToApplyModal({ artistName, venueName, onSend, onCancel }: InviteToApplyModalProps) {
  const [formData, setFormData] = useState<InviteData>({
    wallspaceId: '',
    duration: 90,
    message: '',
  });

  const durations = [
    { value: 30, label: '30 Days', sublabel: '1 month' },
    { value: 90, label: '90 Days', sublabel: '3 months' },
    { value: 180, label: '180 Days', sublabel: '6 months' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(formData);
  };

  const selectedWallspace = mockWallSpaces.find(w => w.id === formData.wallspaceId);

  // Template message
  const templateMessage = `Hi ${artistName},\n\nWe'd love to feature your work at ${venueName}. Your artistic style would be a great fit for our space and community.\n\nWe're inviting you to apply for a ${formData.duration}-day display. Please let us know if you're interested!\n\nLooking forward to potentially working together.`;

  const useTemplate = () => {
    setFormData({ ...formData, message: templateMessage });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-[var(--text)]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl mb-1">Invite to Apply</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Invite <span className="text-[var(--text)]">{artistName}</span> to display at your venue
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Select Wallspace */}
          <div>
            <label className="block text-sm text-[var(--text)] mb-3">
              Wall Space <span className="text-[var(--text-muted)]">(Optional)</span>
            </label>
            <div className="space-y-2">
              {/* General Invite Option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, wallspaceId: '' })}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  formData.wallspaceId === ''
                    ? 'border-[var(--green)] bg-[var(--green-muted)]'
                    : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--green)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1">General Invitation</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Let the artist choose from available wall spaces
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.wallspaceId === ''
                      ? 'border-[var(--green)] bg-[var(--green)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {formData.wallspaceId === '' && (
                      <div className="w-2 h-2 bg-[var(--on-blue)] rounded-full"></div>
                    )}
                  </div>
                </div>
              </button>

              {/* Specific Wallspaces */}
              {mockWallSpaces.filter(w => w.available).slice(0, 3).map((wall) => (
                <button
                  key={wall.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, wallspaceId: wall.id })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    formData.wallspaceId === wall.id
                      ? 'border-[var(--green)] bg-[var(--green-muted)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--green)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {wall.photos && wall.photos[0] && (
                      <div className="w-16 h-16 bg-[var(--surface-2)] rounded overflow-hidden flex-shrink-0">
                        <img
                          src={wall.photos[0]}
                          alt={wall.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-1">{wall.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {wall.width}" × {wall.height}"
                      </p>
                      {wall.location && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
                          <MapPin className="w-3 h-3" />
                          {wall.location}
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      formData.wallspaceId === wall.id
                        ? 'border-[var(--green)] bg-[var(--green)]'
                        : 'border-[var(--border)]'
                    }`}>
                      {formData.wallspaceId === wall.id && (
                        <div className="w-2 h-2 bg-[var(--on-blue)] rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Display Duration */}
          <div>
            <label className="block text-sm text-[var(--text)] mb-3">
              Display Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration: duration.value })}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    formData.duration === duration.value
                      ? 'border-[var(--green)] bg-[var(--green-muted)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--green)]'
                  }`}
                >
                  <div className={`text-lg mb-1 ${
                    formData.duration === duration.value
                      ? 'text-[var(--green)]'
                      : 'text-[var(--text)]'
                  }`}>
                    {duration.label}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {duration.sublabel}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm text-[var(--text)]">
                Personal Message <span className="text-[var(--text-muted)]">(Optional)</span>
              </label>
              {formData.message === '' && (
                <button
                  type="button"
                  onClick={useTemplate}
                  className="text-xs text-[var(--green)] hover:opacity-80"
                >
                  Use template
                </button>
              )}
            </div>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              maxLength={300}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              placeholder="Add a personal note to your invitation (optional)..."
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[var(--text-muted)]">
                {formData.message.length}/300 characters
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
            <p className="text-sm text-[var(--text)]">
              <strong>What happens next:</strong> {artistName} will receive your invitation in their inbox. They can review the details and apply with their artwork, or politely decline if they're not interested.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
