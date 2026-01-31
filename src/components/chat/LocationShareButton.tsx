import React, { useState } from 'react';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationShareButtonProps {
  onLocationSelect: (location: LocationData) => void;
  disabled?: boolean;
}

export const LocationShareButton: React.FC<LocationShareButtonProps> = ({
  onLocationSelect,
  disabled = false
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Search for locations using OpenStreetMap Nominatim API
  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NaijaLancers App'
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Could not search locations. Try again.',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NaijaLancers App'
          }
        }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setSelectedLocation({ lat: latitude, lng: longitude, address });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        toast({
          title: 'Location Error',
          description: 'Could not get your location. Please search manually.',
          variant: 'destructive'
        });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle search result selection
  const selectResult = (result: SearchResult) => {
    setSelectedLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  // Confirm and share location
  const handleShareLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setOpen(false);
      setSelectedLocation(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchLocations(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedLocation(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 hover:bg-accent rounded-full transition-colors"
        disabled={disabled}
        title="Share location"
      >
        <MapPin className="h-5 w-5 text-text-secondary" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Share Location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Current Location Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>

            {/* Search Results */}
            {searching && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            )}

            {searchResults.length > 0 && (
              <Card className="max-h-48 overflow-y-auto">
                <div className="divide-y">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      className="w-full p-3 text-left hover:bg-accent transition-colors"
                      onClick={() => selectResult(result)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm line-clamp-2">{result.display_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Selected Location Preview */}
            {selectedLocation && (
              <div className="space-y-3">
                <div className="h-40 rounded-lg overflow-hidden relative">
                  <iframe
                    title="Location Preview"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.01}%2C${selectedLocation.lat - 0.01}%2C${selectedLocation.lng + 0.01}%2C${selectedLocation.lat + 0.01}&layer=mapnik&marker=${selectedLocation.lat}%2C${selectedLocation.lng}`}
                  />
                </div>
                
                <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground line-clamp-2">
                    {selectedLocation.address}
                  </p>
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleShareLocation}
                >
                  <MapPin className="h-4 w-4" />
                  Share This Location
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationShareButton;
