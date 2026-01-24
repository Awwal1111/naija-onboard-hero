import React, { useEffect, useState } from 'react';
import { useAds } from '@/hooks/useAds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarAdProps {
  className?: string;
}

export const SidebarAd: React.FC<SidebarAdProps> = ({ className }) => {
  const { ads, trackImpression, trackClick } = useAds('sidebar');
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentAd = ads[currentIndex];

  useEffect(() => {
    if (currentAd) {
      trackImpression(currentAd.id);
    }
  }, [currentAd?.id]);

  // Rotate every 15 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  if (!currentAd) return null;

  const handleClick = () => {
    trackClick(currentAd.id);
    window.open(currentAd.link_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Featured</CardTitle>
          <Badge variant="secondary" className="text-[10px]">Ad</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <img
          src={currentAd.image_url}
          alt={currentAd.title}
          className="w-full aspect-square rounded-lg object-cover"
        />
        <div>
          <h4 className="font-semibold text-sm line-clamp-2">{currentAd.title}</h4>
          {currentAd.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {currentAd.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarAd;
