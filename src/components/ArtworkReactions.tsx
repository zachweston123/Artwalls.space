import { useEffect, useState, useCallback } from 'react';
import { Heart, Flame } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { getAnonymousSessionId } from '../lib/session';

interface Counts {
  likeCount: number;
  fireCount: number;
}

interface ViewerState {
  liked: boolean;
  fired: boolean;
}

interface ArtworkReactionsProps {
  artworkId: string;
  className?: string;
}

export function ArtworkReactions({ artworkId, className }: ArtworkReactionsProps) {
  const [counts, setCounts] = useState<Counts>({ likeCount: 0, fireCount: 0 });
  const [viewer, setViewer] = useState<ViewerState>({ liked: false, fired: false });
  const [loading, setLoading] = useState(true);

  // Fetch initial state
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const sessionId = getAnonymousSessionId();
        const data = await apiGet<{
          likeCount: number;
          fireCount: number;
          viewer: ViewerState;
        }>(`/api/artworks/${artworkId}/reactions?sessionId=${sessionId}`);
        if (mounted) {
          setCounts({ likeCount: data.likeCount, fireCount: data.fireCount });
          setViewer(data.viewer);
        }
      } catch (err) {
        console.error('Failed to load reactions', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [artworkId]);

  const handleToggle = useCallback(async (type: 'like' | 'fire') => {
    // Optimistic update
    const prevViewer = { ...viewer };
    const prevCounts = { ...counts };
    
    // Determine new state
    const isAdding = type === 'like' ? !viewer.liked : !viewer.fired;
    
    // Update viewer
    const newViewer = { ...viewer, [type === 'like' ? 'liked' : 'fired']: isAdding };
    setViewer(newViewer);
    
    // Update counts
    const newCounts = { ...counts };
    if (type === 'like') {
        newCounts.likeCount += isAdding ? 1 : -1;
    } else {
        newCounts.fireCount += isAdding ? 1 : -1;
    }
    setCounts(newCounts);

    // Call API
    try {
        const sessionId = getAnonymousSessionId();
        const res = await apiPost<{
          likeCount: number;
          fireCount: number;
          viewer: ViewerState;
        }>(`/api/artworks/${artworkId}/reactions`, {
            type,
            action: 'toggle',
            sessionId
        });
        // Sync with server truth
        setCounts({ likeCount: res.likeCount, fireCount: res.fireCount });
        setViewer(res.viewer);
    } catch (err) {
        console.error('Failed to toggle reaction', err);
        // Rollback
        setViewer(prevViewer);
        setCounts(prevCounts);
    }
  }, [artworkId, viewer, counts]);

  if (loading) return <div className={`h-8 w-32 ${className || ''}`} />; // Invisible spacer

  return (
    <div className={`flex items-center gap-4 ${className || ''}`}>
      <ReactionButton 
        type="like" 
        count={counts.likeCount} 
        active={viewer.liked} 
        onClick={() => handleToggle('like')} 
      />
      <ReactionButton 
        type="fire" 
        count={counts.fireCount} 
        active={viewer.fired} 
        onClick={() => handleToggle('fire')} 
      />
    </div>
  );
}

function ReactionButton({ type, count, active, onClick }: { type: 'like' | 'fire', count: number, active: boolean, onClick: () => void }) {
    const Icon = type === 'like' ? Heart : Flame;
    const colorClass = type === 'like' 
        ? (active ? 'text-red-500 fill-red-500' : 'text-slate-500 hover:text-red-500') 
        : (active ? 'text-orange-500 fill-orange-500' : 'text-slate-500 hover:text-orange-500');

    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
            aria-label={type === 'like' ? 'Like this artwork' : 'Add fire reaction'}
        >
            <Icon className={`w-5 h-5 ${colorClass} transition-colors duration-200`} />
            <span className={active ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
              {count > 0 ? count : ''}
            </span>
        </button>
    );
}
