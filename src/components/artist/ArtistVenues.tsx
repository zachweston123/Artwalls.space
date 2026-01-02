import { useState } from 'react';
import { MapPin, Users, X, Image as ImageIcon } from 'lucide-react';
import { mockVenues, mockArtworks, mockWallSpaces } from '../../data/mockData';
import type { Venue } from '../../data/mockData';

export function ArtistVenues() {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const availableArtworks = mockArtworks.filter(a => a.status === 'available');

  const handleApply = () => {
    // Mock application submission
    alert('Application submitted! The venue will review your artwork.');
    setShowApplicationForm(false);
    setSelectedVenue(null);
    setSelectedArtworkId('');
  };

  return (
    <div className="bg-white dark:bg-neutral-950">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Available Venues</h1>
        <p className="text-neutral-600">Find the perfect space to display your artwork</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockVenues.map((venue) => (
          <div key={venue.id} className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow">
            <div className="h-48 bg-neutral-100 overflow-hidden">
              <img
                src={venue.imageUrl}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl mb-1">{venue.name}</h3>
                  <p className="text-sm text-neutral-600">{venue.type}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs whitespace-nowrap">
                  {venue.availableSpaces} available
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {venue.address}
              </div>

              <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{venue.description}</p>

              {/* Wall Spaces Preview */}
              <div className="mb-4">
                <h4 className="text-sm mb-2">Available Wall Spaces</h4>
                <div className="space-y-2">
                  {mockWallSpaces.filter(w => w.available).slice(0, 2).map((wall) => (
                    <div key={wall.id} className="p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {wall.photos && wall.photos.length > 0 && (
                          <div className="w-16 h-16 bg-neutral-200 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={wall.photos[0]}
                              alt={wall.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm mb-1 text-neutral-900">{wall.name}</p>
                          <p className="text-xs text-neutral-600">{wall.width}" × {wall.height}"</p>
                          {wall.photos && wall.photos.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                              <ImageIcon className="w-3 h-3" />
                              {wall.photos.length} photo{wall.photos.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Users className="w-4 h-4" />
                  {venue.wallSpaces} wall spaces
                </div>
                <button
                  onClick={() => {
                    setSelectedVenue(venue);
                    setShowApplicationForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={venue.availableSpaces === 0}
                >
                  Apply to Hang
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showApplicationForm && selectedVenue && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Apply to {selectedVenue.name}</h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedVenue(null);
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-900">
                <strong>{selectedVenue.name}</strong> has {selectedVenue.availableSpaces} wall space(s) available. Select the artwork you'd like to display.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-neutral-700 mb-3">Select Artwork</label>
                {availableArtworks.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-50 rounded-lg">
                    <p className="text-neutral-600">You don't have any available artworks.</p>
                    <p className="text-sm text-neutral-500 mt-1">Upload a new piece to apply</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {availableArtworks.map((artwork) => (
                      <button
                        key={artwork.id}
                        onClick={() => setSelectedArtworkId(artwork.id)}
                        className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                          selectedArtworkId === artwork.id
                            ? 'border-blue-500 shadow-md'
                            : 'border-neutral-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="aspect-square bg-neutral-100">
                          <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-700">
                          <h4 className="text-sm mb-1 text-neutral-900">{artwork.title}</h4>
                          <p className="text-xs text-neutral-600">${artwork.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {availableArtworks.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm text-neutral-700 mb-2">Additional Message (Optional)</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="Tell the venue why your artwork would be a great fit..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowApplicationForm(false);
                        setSelectedVenue(null);
                        setSelectedArtworkId('');
                      }}
                      className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!selectedArtworkId}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Application
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}