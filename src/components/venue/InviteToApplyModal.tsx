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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl mb-1">Invite to Apply</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Invite <span className="text-neutral-900 dark:text-neutral-50">{artistName}</span> to display at your venue
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Select Wallspace */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Wall Space <span className="text-neutral-500">(Optional)</span>
            </label>
            <div className="space-y-2">
              {/* General Invite Option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, wallspaceId: '' })}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  formData.wallspaceId === ''
                    ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1">General Invitation</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Let the artist choose from available wall spaces
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.wallspaceId === ''
                      ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}>
                    {formData.wallspaceId === '' && (
                      <div className="w-2 h-2 bg-white dark:bg-neutral-200 rounded-full"></div>
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
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {wall.photos && wall.photos[0] && (
                      <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={wall.photos[0]}
                          alt={wall.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-1">{wall.name}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        {wall.width}" × {wall.height}"
                      </p>
                      {wall.location && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          <MapPin className="w-3 h-3" />
                          {wall.location}
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      formData.wallspaceId === wall.id
                        ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {formData.wallspaceId === wall.id && (
                        <div className="w-2 h-2 bg-white dark:bg-neutral-200 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Display Duration */}
          <div>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-3">
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
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <div className={`text-lg mb-1 ${
                    formData.duration === duration.value
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-neutral-900 dark:text-neutral-50'
                  }`}>
                    {duration.label}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {duration.sublabel}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm text-neutral-700 dark:text-neutral-300">
                Personal Message <span className="text-neutral-500">(Optional)</span>
              </label>
              {formData.message === '' && (
                <button
                  type="button"
                  onClick={useTemplate}
                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
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
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              placeholder="Add a personal note to your invitation (optional)..."
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formData.message.length}/300 characters
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-200">
              <strong>What happens next:</strong> {artistName} will receive your invitation in their inbox. They can review the details and apply with their artwork, or politely decline if they're not interested.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
