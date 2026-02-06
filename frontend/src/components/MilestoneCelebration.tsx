import { useState } from 'react';
import { Share2, X, PartyPopper } from 'lucide-react';

interface MilestoneCelebrationProps {
  babyName: string;
  milestoneType: string;
  achievedDate: string;
  photoUrl?: string | null;
  onClose: () => void;
}

export default function MilestoneCelebration({
  babyName,
  milestoneType,
  achievedDate,
  photoUrl,
  onClose,
}: MilestoneCelebrationProps) {
  const [shared, setShared] = useState(false);

  const formattedDate = new Date(achievedDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shareText = `${babyName} reached a new milestone: ${milestoneType}! ${formattedDate}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: `${babyName}'s Milestone`,
          text: shareText,
        };

        // If there's a photo URL, try to share it as a file
        if (photoUrl) {
          try {
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            const file = new File([blob], 'milestone.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch {
            // Photo share not supported, share text only
          }
        }

        await navigator.share(shareData);
        setShared(true);
      } catch (err) {
        // User cancelled share — not an error
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 'var(--space-lg)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 'var(--space-xl)',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ fontSize: 48, marginBottom: 'var(--space-sm)' }}>
          <PartyPopper size={48} style={{ color: 'var(--primary)' }} />
        </div>

        <h3 style={{
          fontFamily: 'var(--font-family-heading)',
          fontSize: 20,
          marginBottom: 'var(--space-xs)',
          color: 'var(--text)',
        }}>
          Milestone Achieved!
        </h3>

        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-md)' }}>
          {babyName} reached <strong>{milestoneType}</strong> on {formattedDate}
        </p>

        {photoUrl && (
          <img
            src={photoUrl}
            alt={milestoneType}
            style={{
              width: '100%',
              maxWidth: 200,
              height: 'auto',
              borderRadius: 12,
              marginBottom: 'var(--space-md)',
              objectFit: 'cover',
            }}
          />
        )}

        <button
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: 'none',
            background: shared ? 'var(--success)' : 'var(--primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          <Share2 size={18} />
          {shared ? 'Shared!' : 'Share This Moment'}
        </button>
      </div>
    </div>
  );
}
