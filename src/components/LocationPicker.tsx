import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MapPin, Search, Navigation, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerProps {
  value?: { lat: number; lng: number; address: string };
  onChange: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationPicker = ({
  value,
  onChange,
  placeholder = 'Search location...'
}: LocationPickerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value);
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Nigeria center coordinates
  const defaultCenter = { lat: 9.082, lng: 8.6753 };

  // Search for locations using OpenStreetMap Nominatim API
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ng&limit=5`,
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

  // Confirm selection
  const confirmSelection = () => {
    if (selectedLocation) {
      onChange(selectedLocation);
      setOpen(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchLocations(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start text-left font-normal"
        onClick={() => setOpen(true)}
      >
        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate">
          {value?.address || placeholder}
        </span>
      </Button>

      {/* Location Picker Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select Location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a location in Nigeria..."
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
              className="w-full"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
            >
              <Navigation className="h-4 w-4 mr-2" />
              {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>

            {/* Search Results */}
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

            {searching && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Searching...
              </div>
            )}

            {/* Map Preview */}
            <div
              ref={mapRef}
              className="h-48 rounded-lg bg-muted overflow-hidden relative"
            >
              {selectedLocation ? (
                <>
                  <iframe
                    title="Location Preview"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.01}%2C${selectedLocation.lat - 0.01}%2C${selectedLocation.lng + 0.01}%2C${selectedLocation.lat + 0.01}&layer=mapnik&marker=${selectedLocation.lat}%2C${selectedLocation.lng}`}
                    allowFullScreen
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-2">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {selectedLocation.address}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Search or use current location</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSelection} disabled={!selectedLocation}>
              Confirm Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationPicker;
