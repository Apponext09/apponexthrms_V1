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
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Wifi, Compass, Loader2, Plus, Save, Globe } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useLocationManagement, GeofenceLocation } from '../hooks/useLocationManagement';
import { MapCoordinateExtractorModal } from './MapCoordinateExtractorModal';

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation?: GeofenceLocation | null;
}

export function AddLocationModal({
  open,
  onOpenChange,
  editingLocation,
}: AddLocationModalProps) {
  const { createGeofence, updateGeofence, fetchCurrentIp, isSaving } = useLocationManagement();

  const [geofenceName, setGeofenceName] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<string>('500');
  const [ipAddress, setIpAddress] = useState('');
  const [isOfficeLocation, setIsOfficeLocation] = useState(true);
  const [allowsRemoteWork, setAllowsRemoteWork] = useState(false);

  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [isFetchingIp, setIsFetchingIp] = useState(false);
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);

  // Sync editing location data when modal opens
  React.useEffect(() => {
    if (editingLocation) {
      setGeofenceName(editingLocation.geofenceName || '');
      setLatitude(editingLocation.latitude ? String(editingLocation.latitude) : '');
      setLongitude(editingLocation.longitude ? String(editingLocation.longitude) : '');
      setRadiusMeters(editingLocation.radiusMeters ? String(editingLocation.radiusMeters) : '500');
      setIpAddress(editingLocation.ipAddress || '');
      setIsOfficeLocation(editingLocation.isOfficeLocation ?? true);
      setAllowsRemoteWork(editingLocation.allowsRemoteWork ?? false);
    } else {
      setGeofenceName('');
      setLatitude('');
      setLongitude('');
      setRadiusMeters('500');
      setIpAddress('');
      setIsOfficeLocation(true);
      setAllowsRemoteWork(false);
    }
  }, [editingLocation, open]);

  // Handler to fetch current GPS coordinates from browser
  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      showToast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setIsFetchingGps(false);
        showToast.success('Current GPS coordinates detected!');
      },
      (error) => {
        setIsFetchingGps(false);
        showToast.error(`Failed to get location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handler to fetch current network IP address
  const handleFetchIp = async () => {
    setIsFetchingIp(true);
    try {
      const ip = await fetchCurrentIp();
      if (ip) {
        setIpAddress(ip);
        showToast.success(`WiFi IP Address detected: ${ip}`);
      } else {
        showToast.error('Unable to auto-detect current IP address');
      }
    } finally {
      setIsFetchingIp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!geofenceName.trim()) {
      showToast.error('Please enter a location name');
      return;
    }
    if (!latitude || !longitude) {
      showToast.error('Please specify latitude and longitude coordinates');
      return;
    }
    if (!radiusMeters || Number(radiusMeters) <= 0) {
      showToast.error('Please enter a valid radius in meters (e.g. 500)');
      return;
    }

    try {
      const payload = {
        geofenceName: geofenceName.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
        ipAddress: ipAddress.trim() || undefined,
        isOfficeLocation,
        allowsRemoteWork,
      };

      if (editingLocation) {
        await updateGeofence(editingLocation.id, payload);
      } else {
        await createGeofence(payload);
      }

      onOpenChange(false);
    } catch {
      // Toast handled in hook
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border border-border/80 shadow-lg rounded-xl bg-card">
          <DialogHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold">
                  {editingLocation ? 'Edit Attendance Location' : 'Add Attendance Location'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Set GPS coordinates, radius, and WiFi IP for punch boundary verification.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            {/* Location Name */}
            <div>
              <Label htmlFor="geofenceName" className="text-xs font-semibold text-foreground">
                Location Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="geofenceName"
                placeholder="e.g. Headquarters Office, Ahilyanagar Branch"
                className="mt-1 h-9 text-xs"
                value={geofenceName}
                onChange={(e) => setGeofenceName(e.target.value)}
              />
            </div>

            {/* GPS Coordinates with Auto-Fetch */}
            <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-primary" /> GPS Coordinates
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold gap-1 px-2 bg-card hover:bg-muted text-primary border-primary/30"
                    onClick={() => setIsExtractorOpen(true)}
                  >
                    <Globe className="w-3 h-3 text-primary" />
                    Maps Link / Address
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold gap-1 px-2 bg-card hover:bg-muted"
                    onClick={handleFetchGps}
                    disabled={isFetchingGps}
                  >
                    {isFetchingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3 text-primary" />}
                    GPS Auto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label htmlFor="latitude" className="text-[11px] font-medium text-muted-foreground">
                    Latitude <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="latitude"
                    placeholder="e.g. 19.094833"
                    className="mt-1 h-9 text-xs font-mono"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-[11px] font-medium text-muted-foreground">
                    Longitude <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="longitude"
                    placeholder="e.g. 74.748011"
                    className="mt-1 h-9 text-xs font-mono"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>
            </div>

          {/* WiFi IP Address with Auto-Fetch */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="ipAddress" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-primary" /> Company WiFi IP Address
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] font-medium text-primary hover:underline px-1.5"
                onClick={handleFetchIp}
                disabled={isFetchingIp}
              >
                {isFetchingIp ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fetch Current WiFi IP'}
              </Button>
            </div>
            <Input
              id="ipAddress"
              placeholder="e.g. 192.168.1.100 or 103.45.12.89"
              className="h-9 text-xs font-mono"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Optional: Restricts attendance punch to authorized office router IP.
            </p>
          </div>

          {/* Radius in Meters */}
          <div>
            <Label htmlFor="radiusMeters" className="text-xs font-semibold text-foreground">
              Geofence Radius (Meters) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="radiusMeters"
              type="number"
              placeholder="e.g. 500"
              className="mt-1 h-9 text-xs"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Allowed distance radius in meters from office center (e.g. 500m).
            </p>
          </div>

          {/* Location Toggles */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOfficeLocation"
                checked={isOfficeLocation}
                onCheckedChange={(checked) => setIsOfficeLocation(Boolean(checked))}
              />
              <label htmlFor="isOfficeLocation" className="text-xs font-medium text-foreground cursor-pointer">
                Primary Physical Office Location
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowsRemoteWork"
                checked={allowsRemoteWork}
                onCheckedChange={(checked) => setAllowsRemoteWork(Boolean(checked))}
              />
              <label htmlFor="allowsRemoteWork" className="text-xs font-medium text-foreground cursor-pointer">
                Allow Remote Punch in this location
              </label>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold px-4"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <MapCoordinateExtractorModal
      open={isExtractorOpen}
      onOpenChange={setIsExtractorOpen}
      onSelectCoordinates={(coords) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        if (coords.locationName && !geofenceName) {
          setGeofenceName(coords.locationName);
        }
      }}
    />
  </>
  );
}
