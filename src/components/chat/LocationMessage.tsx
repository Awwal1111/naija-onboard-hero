import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationMessageProps {
  location: LocationData;
  isOwn?: boolean;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({ location, isOwn = false }) => {
  const openInMaps = () => {
    // Open in Google Maps
    const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  const mapPreviewUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005}%2C${location.lat - 0.005}%2C${location.lng + 0.005}%2C${location.lat + 0.005}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;

  return (
    <Card className={`overflow-hidden max-w-[280px] ${isOwn ? 'bg-primary/10' : 'bg-muted'}`}>
      {/* Map Preview */}
      <div className="relative h-32 w-full">
        <iframe
          title="Location Preview"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={mapPreviewUrl}
          className="pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground line-clamp-2 font-medium">
              {location.address}
            </p>
          </div>
        </div>
      </div>
      
      {/* Open in Maps Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none border-t text-xs gap-2"
        onClick={openInMaps}
      >
        <ExternalLink className="h-3 w-3" />
        Open in Maps
      </Button>
    </Card>
  );
};

// Helper to parse location from message content
export const parseLocationMessage = (content: string): LocationData | null => {
  try {
    // Format: 📍 Location: {"lat":X,"lng":Y,"address":"..."}
    const match = content.match(/📍 Location: ({.*})/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to create location message content
export const createLocationMessageContent = (location: LocationData): string => {
  return `📍 Location: ${JSON.stringify(location)}`;
};

export default LocationMessage;
