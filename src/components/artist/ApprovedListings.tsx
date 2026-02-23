import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';
import { artworkPurchaseUrl } from '../../lib/artworkQrUrl';
import { QrCode, Download, Eye, EyeOff, Copy, Check } from 'lucide-react';

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  status: 'active';
  venue_id: string;
  venue_name: string;
  install_time_option?: 'quick' | 'standard' | 'flexible';
  created_at: string;
}

export function ApprovedListings() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrStates, setQrStates] = useState<{ [key: string]: boolean }>({});
  const [copyStates, setCopyStates] = useState<{ [key: string]: boolean }>({});
  const [qrLoadingStates, setQrLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [qrErrorStates, setQrErrorStates] = useState<{ [key: string]: string | null }>({});

  useEffect(() => {
    fetchApprovedArtworks();
  }, []);

  const fetchApprovedArtworks = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) return;

      const { data, error } = await supabase
        .from('artworks')
        .select(`
          id,
          title,
          image_url,
          status,
          venue_id,
          install_time_option,
          created_at,
          venues(name)
        `)
        .eq('artist_id', user.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        venue_name: item.venues?.name || 'Unknown Venue',
      }));

      setArtworks(formatted);
    } catch (error) {
      console.error('Failed to fetch approved artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQrVisibility = (id: string) => {
    setQrStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyQrUrl = (id: string) => {
    const purchaseLink = artworkPurchaseUrl(id);
    navigator.clipboard.writeText(purchaseLink);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const downloadQrCode = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/artworks/${id}/qrcode.png`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${id}.png`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert(`Failed to download QR code: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const downloadPoster = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/artworks/${id}/qr-poster`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-poster-${id}.html`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download poster:', error);
      alert(`Failed to download poster: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const getInstallTimeLabel = (option?: string) => {
    switch (option) {
      case 'quick':
        return '⚡ Quick (24-48 hrs)';
      case 'standard':
        return '📅 Standard (1 week)';
      case 'flexible':
        return '🔄 Flexible (2 weeks)';
      default:
        return 'Standard installation';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading approved artworks...</p>
        </div>
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <QrCode className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-semibold text-text mb-2">No approved artworks yet</h2>
        <p className="text-text-secondary">
          Once your artworks are approved by a venue, you’ll be able to generate and download QR codes here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Approved & Ready to Install</h1>
        <p className="text-text-secondary">
          View and download QR codes for your approved artworks. Test them before printing and installing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map(artwork => (
          <div 
            key={artwork.id} 
            className="bg-surface-1 border border-border rounded-lg overflow-hidden hover:border-green/50 transition-colors"
          >
            {/* Artwork Image */}
            <div className="aspect-square bg-surface-2 relative overflow-hidden">
              {artwork.image_url ? (
                <img 
                  src={artwork.image_url} 
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-text-secondary opacity-50">No image</div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <div>
                <h3 className="font-semibold text-text truncate">{artwork.title}</h3>
                <p className="text-sm text-text-secondary">{artwork.venue_name}</p>
              </div>

              {/* Install Time Option */}
              <div className="text-sm bg-green/10 border border-green/30 rounded px-2 py-1 text-green-700 dark:text-green-300">
                {getInstallTimeLabel(artwork.install_time_option)}
              </div>

              {/* QR Code Preview (Togglable) */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleQrVisibility(artwork.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-2 hover:bg-surface-3 rounded border border-border text-sm font-medium text-text transition-colors"
                >
                  {qrStates[artwork.id] ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide QR Code
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show QR Code
                    </>
                  )}
                </button>

                {qrStates[artwork.id] && (
                  <div className="bg-white p-3 rounded border border-border flex items-center justify-center min-h-56">
                    {qrLoadingStates[artwork.id] && (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green mx-auto mb-2"></div>
                        <p className="text-sm text-text-secondary">Generating QR code...</p>
                      </div>
                    )}
                    {qrErrorStates[artwork.id] && (
                      <div className="text-center">
                        <p className="text-sm text-red-600">⚠️ {qrErrorStates[artwork.id]}</p>
                        <button 
                          onClick={() => {
                            setQrLoadingStates(prev => ({ ...prev, [artwork.id]: true }));
                            setQrErrorStates(prev => ({ ...prev, [artwork.id]: null }));
                          }}
                          className="text-xs text-green mt-2 hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    {!qrLoadingStates[artwork.id] && !qrErrorStates[artwork.id] && (
                      <img 
                        src={`${API_BASE}/api/artworks/${artwork.id}/qrcode.svg`}
                        alt="QR Code"
                        className="h-48 w-48"
                        onLoadStart={() => setQrLoadingStates(prev => ({ ...prev, [artwork.id]: true }))}
                        onLoad={() => setQrLoadingStates(prev => ({ ...prev, [artwork.id]: false }))}
                        onError={() => {
                          setQrLoadingStates(prev => ({ ...prev, [artwork.id]: false }));
                          setQrErrorStates(prev => ({ ...prev, [artwork.id]: 'Failed to load QR code. Ensure artwork is approved.' }));
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Test Instructions */}
              {qrStates[artwork.id] && (
                <div className="text-xs bg-blue/10 border border-blue/30 rounded p-2 text-blue-700 dark:text-blue-300">
                  ✓ Test: Stand 6-10 feet away, scan with phone camera, verify landing page shows correct artwork and price
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => copyQrUrl(artwork.id)}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-green/10 hover:bg-green/20 border border-green/30 rounded text-green-700 dark:text-green-300 text-sm font-medium transition-colors"
                  title="Copy artwork link to clipboard"
                >
                  {copyStates[artwork.id] ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadQrCode(artwork.id)}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-green/10 hover:bg-green/20 border border-green/30 rounded text-green-700 dark:text-green-300 text-sm font-medium transition-colors"
                  title="Download QR code as PNG (print-ready)"
                >
                  <Download className="h-4 w-4" />
                  PNG
                </button>

                <button
                  onClick={() => downloadPoster(artwork.id)}
                  className="col-span-2 flex items-center justify-center gap-1 py-2 px-3 bg-green/10 hover:bg-green/20 border border-green/30 rounded text-green-700 dark:text-green-300 text-sm font-medium transition-colors"
                  title="Download printable poster with QR code"
                >
                  <Download className="h-4 w-4" />
                  Download Poster
                </button>
              </div>

              {/* Footer Info */}
              <div className="text-xs text-text-secondary pt-2 border-t border-border">
                <p>Created: {new Date(artwork.created_at).toLocaleDateString()}</p>
                <p className="text-green font-medium">✓ Approved & Ready</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
