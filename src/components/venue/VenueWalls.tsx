import { useState } from 'react';
import { Plus, X, Frame, Upload, Image as ImageIcon } from 'lucide-react';
import { mockWallSpaces } from '../../data/mockData';
import type { WallSpace } from '../../data/mockData';

export function VenueWalls() {
  const [wallSpaces, setWallSpaces] = useState<WallSpace[]>(mockWallSpaces);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWall, setNewWall] = useState({
    name: '',
    width: '',
    height: '',
    description: '',
    photos: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wall: WallSpace = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWall.name,
      width: parseFloat(newWall.width),
      height: parseFloat(newWall.height),
      available: true,
      description: newWall.description,
      photos: newWall.photos,
    };
    setWallSpaces([...wallSpaces, wall]);
    setNewWall({ name: '', width: '', height: '', description: '', photos: [] });
    setShowAddForm(false);
  };

  const toggleAvailability = (id: string) => {
    setWallSpaces(wallSpaces.map(wall =>
      wall.id === id ? { ...wall, available: !wall.available } : wall
    ));
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload
    const mockPhotoUrl = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
    if (newWall.photos.length < 6) {
      setNewWall({ ...newWall, photos: [...newWall.photos, mockPhotoUrl] });
    }
  };

  const removePhoto = (index: number) => {
    setNewWall({ 
      ...newWall, 
      photos: newWall.photos.filter((_, i) => i !== index) 
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-neutral-900">My Wall Spaces</h1>
          <p className="text-neutral-600">
            {wallSpaces.length} total spaces • {wallSpaces.filter(w => w.available).length} available
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Wall Space</span>
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-neutral-900 dark:text-neutral-50">Add New Wall Space</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-neutral-700 mb-2">Wall Name</label>
                <input
                  type="text"
                  required
                  value={newWall.name}
                  onChange={(e) => setNewWall({ ...newWall, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Main Wall, Side Wall, Corner Space"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-700 mb-2">Width (inches)</label>
                  <input
                    type="number"
                    required
                    value={newWall.width}
                    onChange={(e) => setNewWall({ ...newWall, width: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="96"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-700 mb-2">Height (inches)</label>
                  <input
                    type="number"
                    required
                    value={newWall.height}
                    onChange={(e) => setNewWall({ ...newWall, height: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="72"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newWall.description}
                  onChange={(e) => setNewWall({ ...newWall, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the wall location, lighting, vibe..."
                />
              </div>

              {/* Wall Photos Section */}
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">Wall Photos</label>
                <p className="text-xs text-neutral-500 mb-3">
                  Add photos so artists can see the space and vibe. Good lighting recommended. (Up to 6 photos)
                </p>

                {/* Upload Area */}
                {newWall.photos.length < 6 && (
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    className="w-full border-2 border-dashed border-neutral-300 rounded-xl p-8 sm:p-12 text-center hover:border-green-500 transition-colors cursor-pointer mb-4"
                  >
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400 mx-auto mb-3" />
                    <p className="text-neutral-600 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-neutral-500">PNG, JPG up to 10MB</p>
                  </button>
                )}

                {/* Photo Thumbnails */}
                {newWall.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {newWall.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square bg-neutral-100 rounded-lg overflow-hidden group">
                        <img
                          src={photo}
                          alt={`Wall photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Wall Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallSpaces.map((wall) => (
          <div
            key={wall.id}
            className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow"
          >
            {/* Wall Photo Preview */}
            {wall.photos && wall.photos.length > 0 && (
              <div className="h-48 bg-neutral-100 overflow-hidden relative">
                <img
                  src={wall.photos[0]}
                  alt={wall.name}
                  className="w-full h-full object-cover"
                />
                {wall.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white rounded text-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {wall.photos.length} photos
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Frame className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1 text-neutral-900">{wall.name}</h3>
                    <p className="text-sm text-neutral-600">
                      {wall.width}" × {wall.height}"
                    </p>
                  </div>
                </div>
              </div>

              {wall.description && (
                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{wall.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-600">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      wall.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {wall.available ? 'Available' : 'Occupied'}
                  </span>
                </div>

                {wall.currentArtworkId && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 mb-1">Currently displaying</p>
                    <p className="text-sm text-blue-900">Sunset Boulevard</p>
                  </div>
                )}

                <button
                  onClick={() => toggleAvailability(wall.id)}
                  className={`w-full px-4 py-2 rounded-lg transition-colors ${
                    wall.available
                      ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {wall.available ? 'Mark as Occupied' : 'Mark as Available'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {wallSpaces.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Frame className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2 text-neutral-900">No wall spaces yet</h3>
          <p className="text-neutral-600 mb-6">Add your first wall space to start displaying artwork</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Add Your First Wall Space
          </button>
        </div>
      )}
    </div>
  );
}