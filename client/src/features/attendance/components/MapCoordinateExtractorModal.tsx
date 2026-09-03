import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Globe, Search, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface MapCoordinateExtractorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCoordinates: (coords: { latitude: string; longitude: string; locationName?: string }) => void;
}

export function MapCoordinateExtractorModal({
  open,
  onOpenChange,
  onSelectCoordinates,
}: MapCoordinateExtractorModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'search'>('link');
  const [mapUrl, setMapUrl] = useState('');
  const [extractedLat, setExtractedLat] = useState('');
  const [extractedLon, setExtractedLon] = useState('');

  // Address search state
  const [addressQuery, setAddressQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);

  // Extract coordinates from Google Maps Link / String
  const handleExtractFromLink = () => {
    const raw = mapUrl.trim();
    if (!raw) {
      showToast.error('Please paste a Google Maps link or coordinates');
      return;
    }

    // 1. Check for @lat,lon
    const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      setExtractedLat(Number(atMatch[1]).toFixed(7));
      setExtractedLon(Number(atMatch[2]).toFixed(7));
      showToast.success('Extracted GPS coordinates from Google Maps link!');
      return;
    }

    // 2. Check for ?q=lat,lon or &q=lat,lon
    const qMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      setExtractedLat(Number(qMatch[1]).toFixed(7));
      setExtractedLon(Number(qMatch[2]).toFixed(7));
      showToast.success('Extracted GPS coordinates from Google Maps link!');
      return;
    }

    // 3. Check for /search/lat,lon or /dir/lat,lon
    const pathMatch = raw.match(/\/(?:search|dir|place)\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/);
    if (pathMatch) {
      setExtractedLat(Number(pathMatch[1]).toFixed(7));
      setExtractedLon(Number(pathMatch[2]).toFixed(7));
      showToast.success('Extracted GPS coordinates from Google Maps link!');
      return;
    }

    // 4. Check for plain "lat, lon" or "lat,lon"
    const plainMatch = raw.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (plainMatch) {
      setExtractedLat(Number(plainMatch[1]).toFixed(7));
      setExtractedLon(Number(plainMatch[2]).toFixed(7));
      showToast.success('Detected latitude and longitude values!');
      return;
    }

    // 5. General pair match anywhere in string
    const generalMatch = raw.match(/(-?\d{1,3}\.\d{4,15})\s*,\s*(-?\d{1,3}\.\d{4,15})/);
    if (generalMatch) {
      setExtractedLat(Number(generalMatch[1]).toFixed(7));
      setExtractedLon(Number(generalMatch[2]).toFixed(7));
      showToast.success('Extracted coordinates from link!');
      return;
    }

    showToast.error('Could not detect coordinates in link. Try searching by address instead.');
  };

  // Search Address via OpenStreetMap Nominatim Geocoding API
  const handleSearchAddress = async () => {
    const q = addressQuery.trim();
    if (!q) {
      showToast.error('Please enter an address or place name to search');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        {
          headers: {
            'User-Agent': 'ApponextHRMS/1.0',
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
        showToast.success(`Found ${data.length} matching locations`);
      } else {
        showToast.error('No matching location found. Please try a broader location name.');
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
      showToast.error('Failed to search location. Check internet connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyExtracted = () => {
    if (!extractedLat || !extractedLon) {
      showToast.error('No coordinates extracted yet');
      return;
    }
    onSelectCoordinates({
      latitude: extractedLat,
      longitude: extractedLon,
    });
    onOpenChange(false);
  };

  const handleSelectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    onSelectCoordinates({
      latitude: Number(item.lat).toFixed(7),
      longitude: Number(item.lon).toFixed(7),
      locationName: item.display_name.split(',')[0],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border border-border/80 shadow-lg rounded-xl bg-card p-4 select-none">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Globe className="w-4 h-4 text-primary" />
            Extract Location Coordinates
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Paste a Google Maps share link or search by office address to auto-fill latitude and longitude.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 pt-2 border-b border-border/60 pb-2">
          <Button
            type="button"
            variant={activeTab === 'link' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('link')}
            className={`h-7 text-xs font-bold gap-1.5 ${
              activeTab === 'link' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            1. Paste Google Maps Link
          </Button>

          <Button
            type="button"
            variant={activeTab === 'search' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('search')}
            className={`h-7 text-xs font-bold gap-1.5 ${
              activeTab === 'search' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            2. Search Address / Place
          </Button>
        </div>

        {/* Tab 1: Google Maps Link */}
        {activeTab === 'link' && (
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Google Maps Link or URL *</Label>
              <div className="flex gap-2">
                <Input
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="e.g. https://www.google.com/maps/place/.../@19.0760,72.8777,15z"
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExtractFromLink}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                >
                  Extract
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Paste any link copied from Google Maps, share link, or @lat,lon coordinate format.
              </p>
            </div>

            {extractedLat && extractedLon && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" /> Extracted GPS Coordinates
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-emerald-700 block">Latitude:</span>
                    <span className="font-bold">{extractedLat}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-emerald-700 block">Longitude:</span>
                    <span className="font-bold">{extractedLon}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyExtracted}
                  className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
                >
                  Apply Coordinates to Location Form
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Search Address / Place */}
        {activeTab === 'search' && (
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Office Address / Landmark / City *</Label>
              <div className="flex gap-2">
                <Input
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
                  placeholder="e.g. Baner Road, Pune, Maharashtra"
                  className="h-8 text-xs font-semibold"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isSearching}
                  onClick={handleSearchAddress}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 gap-1"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </Button>
              </div>
            </div>

            {/* Results List */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1 no-scrollbar">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Select Matching Place:</span>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-2.5 rounded-lg border border-border/80 hover:border-primary bg-card hover:bg-primary/5 cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-foreground text-xs">{item.display_name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          Lat: {Number(item.lat).toFixed(6)}, Lon: {Number(item.lon).toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
