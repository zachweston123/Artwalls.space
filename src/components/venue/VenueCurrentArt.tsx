import { useState } from 'react';
import { QrCode, MapPin, Calendar, X } from 'lucide-react';
import { mockInstalledArtworks } from '../../data/mockData';
import type { InstalledArtwork } from '../../data/mockData';

export function VenueCurrentArt() {
  const [artworks, setArtworks] = useState<InstalledArtwork[]>(mockInstalledArtworks);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'ending-soon' | 'needs-pickup'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ id: string; action: string } | null>(null);

  const filteredArtworks = artworks.filter(artwork => {
    if (filter === 'all') return true;
    return artwork.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      'active': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Active' },
      'sold': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: 'Sold' },
      'ending-soon': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: 'Ending Soon' },
      'needs-pickup': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Needs Pickup' },
      'ended': { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', label: 'Ended' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const handleAction = (id: string, action: string) => {
    setSelectedAction({ id, action });
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    if (!selectedAction) return;
    
    setArtworks(artworks.map(artwork => {
      if (artwork.id === selectedAction.id) {
        switch (selectedAction.action) {
          case 'mark-sold':
            return { ...artwork, status: 'sold' as const };
          case 'confirm-pickup':
            return { ...artwork, status: 'ended' as const };
          case 'end-display':
            return { ...artwork, status: 'ended' as const };
          default:
            return artwork;
        }
      }
      return artwork;
    }));

    setShowConfirmModal(false);
    setSelectedAction(null);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'mark-sold': return 'Mark as Sold';
      case 'confirm-pickup': return 'Confirm Pickup';
      case 'end-display': return 'End Display';
      default: return action;
    }
  };

  const activeCount = artworks.filter(a => a.status === 'active').length;
  const soldCount = artworks.filter(a => a.status === 'sold').length;
  const endingSoonCount = artworks.filter(a => a.status === 'ending-soon').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Current Artwork</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          {activeCount} active • {soldCount} sold • {endingSoonCount} ending soon
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:bg-neutral-700'
          }`}
        >
          All ({artworks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:bg-neutral-700'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('sold')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'sold'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:bg-neutral-700'
          }`}
        >
          Sold ({soldCount})
        </button>
        <button
          onClick={() => setFilter('ending-soon')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'ending-soon'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:bg-neutral-700'
          }`}
        >
          Ending Soon ({endingSoonCount})
        </button>
      </div>

      {/* Artwork List */}
      <div className="space-y-4">
        {filteredArtworks.map((artwork) => (
          <div
            key={artwork.id}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-6 p-4 sm:p-6">
              {/* Artwork Image */}
              <div className="w-full md:w-48 h-48 md:h-auto bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={artwork.artworkImage}
                  alt={artwork.artworkTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Artwork Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl mb-1 text-neutral-900 dark:text-neutral-50">{artwork.artworkTitle}</h3>
                    <p className="text-neutral-600 dark:text-neutral-300">by {artwork.artistName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(artwork.status)}
                    <span className="text-lg">${artwork.price}</span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">Wall Location</span>
                      <p className="text-neutral-900 dark:text-neutral-50">{artwork.wallSpaceName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">Install Date</span>
                      <p className="text-neutral-900 dark:text-neutral-50">
                        {new Date(artwork.installDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">End Date</span>
                      <p className="text-neutral-900 dark:text-neutral-50">
                        {new Date(artwork.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <QrCode className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">QR Code</span>
                      <button className="text-green-600 dark:text-green-400 hover:text-green-700 dark:text-green-300 underline">
                        View / Print
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {artwork.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button
                        onClick={() => handleAction(artwork.id, 'end-display')}
                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:bg-neutral-700 transition-colors text-sm"
                      >
                        End Display
                      </button>
                    </>
                  )}
                  {artwork.status === 'sold' && (
                    <button
                      onClick={() => handleAction(artwork.id, 'confirm-pickup')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Confirm Pickup Completed
                    </button>
                  )}
                  {artwork.status === 'ending-soon' && (
                    <>
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:bg-blue-900 transition-colors text-sm">
                        Request Replacement
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty States */}
      {filteredArtworks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          {filter === 'all' && (
            <>
              <h3 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">No artwork on display</h3>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Review artist applications to start displaying artwork
              </p>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                View Applications
              </button>
            </>
          )}
          {filter !== 'all' && (
            <>
              <h3 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">No {filter.replace('-', ' ')} artwork</h3>
              <p className="text-neutral-600 dark:text-neutral-300">Try selecting a different filter</p>
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedAction && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-neutral-900 dark:text-neutral-50">Confirm Action</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 hover:bg-neutral-100 dark:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              Are you sure you want to {getActionLabel(selectedAction.action).toLowerCase()}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
