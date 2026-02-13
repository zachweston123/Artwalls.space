import React from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { apiPost } from '../../lib/api';

interface MomentumBannerProps {
  onNavigate: (page: string) => void;
  onDismiss: () => void;
}

export default function MomentumBanner({ onNavigate, onDismiss }: MomentumBannerProps) {
  const handleDismiss = async () => {
    onDismiss();
    try {
      await apiPost('/api/artists/dismiss-momentum-banner', {});
    } catch {
      // Best-effort — banner stays dismissed locally this session
    }
  };

  return (
    <div
      className="border-b border-t p-4"
      style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 flex-shrink-0">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--blue)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            Your art is live on Artwalls 🎨
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Unlock more visibility — more active displays, more venue opportunities,
            and better insights. And if a piece sells, you keep more.
          </p>
          <button
            onClick={() => onNavigate('plans-pricing')}
            className="inline-flex items-center gap-1 text-sm font-semibold mt-2 hover:underline"
            style={{ color: 'var(--blue)' }}
          >
            View plans &amp; pricing
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-2)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
          }
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
