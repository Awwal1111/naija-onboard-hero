import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAds } from '@/hooks/useAds';
import { cn } from '@/lib/utils';

interface BannerAdProps {
  className?: string;
  dismissible?: boolean;
}

export const BannerAd: React.FC<BannerAdProps> = ({ className, dismissible = true }) => {
  const { ads, trackImpression, trackClick } = useAds('banner');
  const [dismissed, setDismissed] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const currentAd = ads[currentAdIndex];

  useEffect(() => {
    if (currentAd) {
      trackImpression(currentAd.id);
    }
  }, [currentAd?.id]);

  // Rotate ads every 10 seconds if multiple
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  if (!currentAd || dismissed) return null;

  const handleClick = () => {
    trackClick(currentAd.id);
    window.open(currentAd.link_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20",
        className
      )}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer flex items-center gap-4 p-3"
      >
        <img
          src={currentAd.image_url}
          alt={currentAd.title}
          className="h-12 w-12 md:h-16 md:w-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm md:text-base text-foreground truncate">
            {currentAd.title}
          </p>
          {currentAd.description && (
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
              {currentAd.description}
            </p>
          )}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-medium flex-shrink-0">
          Ad
        </span>
      </div>
      {dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};

export default BannerAd;
