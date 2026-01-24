import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAds } from '@/hooks/useAds';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FeedAdProps {
  className?: string;
  index?: number; // Used to pick a specific ad from the list
}

export const FeedAd: React.FC<FeedAdProps> = ({ className, index = 0 }) => {
  const { ads, trackImpression, trackClick } = useAds('feed');
  const [hasTracked, setHasTracked] = useState(false);

  const ad = ads[index % Math.max(ads.length, 1)];

  useEffect(() => {
    if (ad && !hasTracked) {
      trackImpression(ad.id);
      setHasTracked(true);
    }
  }, [ad?.id, hasTracked]);

  if (!ad) return null;

  const handleClick = () => {
    trackClick(ad.id);
    window.open(ad.link_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 bg-gradient-to-br from-card to-muted/30",
        className
      )}
    >
      <CardContent className="p-0">
        {/* Ad Image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={ad.image_url}
            alt={ad.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          <Badge 
            className="absolute top-3 left-3 bg-black/70 text-white border-0 text-[10px]"
          >
            Sponsored
          </Badge>
        </div>

        {/* Ad Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-base text-foreground line-clamp-2">
            {ad.title}
          </h3>
          {ad.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ad.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Learn more
            </span>
            <ExternalLink className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedAd;
