import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Plus,
  Search,
  Wifi,
  Compass,
  Edit,
  Trash2,
  ExternalLink,
  Building2,
  Globe,
  Radio,
  UserCheck,
} from 'lucide-react';
import { useLocationManagement, GeofenceLocation } from '../hooks/useLocationManagement';
import { AddLocationModal } from '../components/AddLocationModal';

export function LocationManagementPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const isHrPath = location.pathname.startsWith('/hr');
  const mappingRoute = isHrPath ? '/hr/attendance/locations' : '/attendance/employee-locations';
  const { geofences, isLoading, deleteGeofence } = useLocationManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<GeofenceLocation | null>(null);

  // Filter geofences by search query
  const filteredGeofences = geofences.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.geofenceName.toLowerCase().includes(q) ||
      (item.ipAddress && item.ipAddress.toLowerCase().includes(q)) ||
      String(item.latitude).includes(q) ||
      String(item.longitude).includes(q)
    );
  });

  const totalGeofences = geofences.length;
  const officeLocationsCount = geofences.filter((g) => g.isOfficeLocation).length;
  const ipRestrictedCount = geofences.filter((g) => g.ipAddress).length;
  const avgRadius = totalGeofences > 0
    ? Math.round(geofences.reduce((acc, curr) => acc + (curr.radiusMeters || 0), 0) / totalGeofences)
    : 0;

  const handleEdit = (loc: GeofenceLocation) => {
    setEditingLocation(loc);
    setIsAddModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete geofence location "${name}"?`)) {
      await deleteGeofence(id);
    }
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header Banner Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                Location Access Management
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                Geofence & IP Control
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define physical office geofences, GPS coordinates, WiFi IP restrictions, and attendance radiuses.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleAddNew}
          className="h-8 text-xs font-bold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Location
        </Button>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs"
        >
          <MapPin className="w-3.5 h-3.5" />
          Geofence Boundaries
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(mappingRoute)}
          className="h-8 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          Employee Location Mapping
        </Button>
      </div>



      {/* Main Table / Location List Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-4 pt-4 border-b border-border/60 gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Configured Geofence Boundaries</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Employees can only punch attendance when within designated GPS radius or matching WiFi IP.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search locations or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-8 bg-background border-border"
            />
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-12 text-center">Loading location geofences...</div>
          ) : filteredGeofences.length === 0 ? (
            <div className="text-xs text-muted-foreground py-12 text-center flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 text-muted-foreground/40" />
              <p className="font-bold text-foreground text-sm">No Location Geofences Found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Click "Add Location" to configure your first GPS boundary and WiFi IP for attendance verification.
              </p>
              <Button size="sm" onClick={handleAddNew} className="h-8 text-xs font-bold gap-1 px-3 mt-1 bg-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5" /> Add Location
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredGeofences.map((loc) => (
                <div
                  key={loc.id}
                  className="flex flex-col justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{loc.geofenceName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {loc.isOfficeLocation && (
                            <Badge variant="outline" className="text-[9px] font-bold py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                              Primary Office
                            </Badge>
                          )}
                          {loc.allowsRemoteWork ? (
                            <Badge variant="outline" className="text-[9px] font-bold py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                              Remote Allowed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-bold py-0 px-1.5 bg-purple-50 text-purple-700 border-purple-200">
                              On-Site Only
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(loc)}
                        title="Edit location"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDelete(loc.id, loc.geofenceName)}
                        title="Delete location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Geofence Parameters Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/60">
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Compass className="w-3 h-3 text-primary" /> GPS Coordinates
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono font-bold text-foreground">
                        {loc.latitude}, {loc.longitude}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary font-bold hover:underline inline-flex items-center gap-0.5 mt-0.5"
                      >
                        View Map <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Radio className="w-3 h-3 text-primary" /> Geofence Radius
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-foreground">
                        {loc.radiusMeters} Meters
                      </p>
                      <p className="text-[9px] text-muted-foreground">Maximum punch distance</p>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-border/40">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-amber-600" /> WiFi Network IP
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono font-bold text-foreground">
                        {loc.ipAddress ? loc.ipAddress : <span className="text-muted-foreground italic font-sans font-normal">No IP restriction (GPS only)</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Location Modal */}
      <AddLocationModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        editingLocation={editingLocation}
      />
    </div>
  );
}

export default LocationManagementPage;
