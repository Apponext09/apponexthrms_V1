import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import {
  Clock,
  MapPin,
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowUpDown,
  User,
  Coffee,
  CalendarDays,
  FileText,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Loader2,
  List,
  Grid,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface RosterDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  shift?: any;
}

export default function ShiftRosterPage() {
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [submittingSwap, setSubmittingSwap] = useState(false);

  // States
  const [todayShift, setTodayShift] = useState<any>(null);
  const [rosterInfo, setRosterInfo] = useState<any>(null);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Always start on the user's current calendar month. A fixed development
  // month made the sidebar-selected roster appear disconnected from Today.
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [shiftsRangeMap, setShiftsRangeMap] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [officeLocation, setOfficeLocation] = useState<{ lat: number; lng: number; name: string; radius: number } | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Swap Request Form States
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapDate, setSwapDate] = useState('');
  const [swapWithEmployeeId, setSwapWithEmployeeId] = useState('');
  const [swapReason, setSwapReason] = useState('');

  // Selected Date Details Popover/Overlay
  const [selectedDayDetails, setSelectedDayDetails] = useState<any>(null);

  // Helper local date string builder
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper 12h format
  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '--';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Fetch today's shift
  const fetchTodayShift = async () => {
    try {
      const res = await apiClient.get('/attendance/my-shifts/today');
      if (res.data?.success && res.data?.data) {
        setTodayShift(res.data.data);
      } else {
        setTodayShift(null);
      }
    } catch (err) {
      console.error('Failed to fetch today shift:', err);
    }
  };

  // Fetch roster pattern info
  const fetchRosterPattern = async () => {
    setLoadingRoster(true);
    try {
      const res = await apiClient.get('/attendance/my-roster-pattern');
      if (res.data?.success && res.data?.data) {
        setRosterInfo(res.data.data);
      } else {
        setRosterInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch roster pattern:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Fetch swap requests history
  const fetchSwapRequests = async () => {
    setLoadingSwaps(true);
    try {
      const res = await apiClient.get('/attendance/shift-swap-requests/mine');
      if (res.data?.success && res.data?.data) {
        setSwapRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch swap requests:', err);
    } finally {
      setLoadingSwaps(false);
    }
  };

  // Fetch employees list for swap selection (only those with active shift assignments)
  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/attendance/shifts/assignments?isCurrent=true&pageSize=500');
      if (res.data?.success && Array.isArray(res.data.data)) {
        // Extract unique employees from active assignments
        const uniqueMap = new Map();
        res.data.data.forEach((assignment: any) => {
          const empId = assignment.employee_id || assignment.employeeId;
          if (empId && !uniqueMap.has(empId)) {
            uniqueMap.set(empId, {
              id: empId,
              firstName: assignment.first_name || assignment.firstName || '',
              lastName: assignment.last_name || assignment.lastName || '',
              employeeCode: assignment.employee_code || assignment.employeeCode || ''
            });
          }
        });
        setEmployees(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch eligible employees list:', err);
    }
  };

  // Fetch shifts for the calendar month range
  const fetchShiftsForMonth = async (date: Date) => {
    setLoadingShifts(true);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Add pads for grid query
    const padStart = new Date(firstDay);
    padStart.setDate(firstDay.getDate() - 7);
    const padEnd = new Date(lastDay);
    padEnd.setDate(lastDay.getDate() + 7);

    const fromStr = formatDateLocal(padStart);
    const toStr = formatDateLocal(padEnd);

    try {
      const res = await apiClient.get(`/attendance/my-shifts?from=${fromStr}&to=${toStr}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const map: Record<string, any> = {};
        res.data.data.forEach((s: any) => {
          map[s.date] = s;
        });
        setShiftsRangeMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch shifts in range:', err);
      toast.error('Failed to load roster dates');
    } finally {
      setLoadingShifts(false);
    }
  };

  // Handle month changes
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Initialize page data
  useEffect(() => {
    fetchTodayShift();
    fetchRosterPattern();
    fetchSwapRequests();
    fetchEmployees();

    // 1. Fetch Geofence Locations configured in Admin
    const fetchOfficeLoc = async () => {
      try {
        const res = await apiClient.get('/attendance/locations');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const loc = res.data.data[0];
          setOfficeLocation({
            lat: Number(loc.latitude || 19.0330),
            lng: Number(loc.longitude || 73.0297),
            name: loc.geofence_name || loc.geofenceName || 'Office Geofence',
            radius: Number(loc.radius_meters || loc.geofence_radius_m || 200)
          });
        } else {
          setOfficeLocation({
            lat: 19.0330,
            lng: 73.0297,
            name: 'Navi Mumbai HQ Geofence',
            radius: 200
          });
        }
      } catch (err) {
        setOfficeLocation({
          lat: 19.0330,
          lng: 73.0297,
          name: 'Navi Mumbai HQ Geofence',
          radius: 200
        });
      }
    };
    fetchOfficeLoc();

    // 2. Fetch User Geolocation (Active Location Tracker)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error fetching geolocation:', error);
        },
        { enableHighAccuracy: true }
      );
    }

    // 3. Dynamically Load Leaflet assets
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);

    // Pulse animation keyframes style tag for custom user marker ring
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const mapRef = React.useRef<any>(null);

  // 4. Render Leaflet Map (Robust Ref-based initialization)
  useEffect(() => {
    if (!leafletLoaded || !officeLocation) return;
    const L = (window as any).L;
    if (!L) return;

    const timer = setTimeout(() => {
      const mapContainer = document.getElementById('roster-map');
      if (!mapContainer) return;

      // Clean up previous map instance if any
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Map cleanup error:', e);
        }
        mapRef.current = null;
      }

      try {
        // Initialize Leaflet Map
        const map = L.map('roster-map', {
          zoomControl: false,
          attributionControl: false
        }).setView([officeLocation.lat, officeLocation.lng], 15);

        // Add OpenStreetMap layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Render Office marker
        const officeIcon = L.divIcon({
          html: `<div style="
            background-color: #4f46e5;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2.5px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.4);
          "></div>`,
          className: 'custom-leaflet-marker-office',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        L.marker([officeLocation.lat, officeLocation.lng], { icon: officeIcon }).addTo(map)
          .bindPopup(officeLocation.name)
          .openPopup();

        // Render Geofence Bounds Circle
        L.circle([officeLocation.lat, officeLocation.lng], {
          color: '#4f46e5',
          fillColor: '#4f46e5',
          fillOpacity: 0.15,
          radius: officeLocation.radius
        }).addTo(map);

        // Render User marker if coordinates are resolved
        if (userCoords) {
          const userIcon = L.divIcon({
            html: `<div style="
              background-color: #ef4444;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              border: 2.5px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.4);
              position: relative;
            ">
              <div class="pulse-ring" style="
                position: absolute;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: rgba(239, 68, 68, 0.25);
                top: -8px;
                left: -8px;
                animation: pulse 1.8s infinite;
              "></div>
            </div>`,
            className: 'custom-leaflet-marker-user',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map)
            .bindPopup('Your Current Location');

          // Fit bounds to cover both the employee and office location
          const bounds = L.latLngBounds([
            [officeLocation.lat, officeLocation.lng],
            [userCoords.lat, userCoords.lng]
          ]);
          map.fitBounds(bounds.pad(0.3));
        }

        mapRef.current = map;
      } catch (err) {
        console.error('Error during Leaflet init:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, [leafletLoaded, officeLocation, userCoords]);

  // Fetch shifts when viewed month changes
  useEffect(() => {
    fetchShiftsForMonth(currentMonth);
  }, [currentMonth]);

  // Submit Shift Swap Request
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('👉 handleSwapSubmit triggered:', { swapDate, swapWithEmployeeId, swapReason });
    
    if (!swapDate || !swapWithEmployeeId) {
      const msg = `Validation failed: ${!swapDate ? 'Please choose a Date. ' : ''}${!swapWithEmployeeId ? 'Please choose a Teammate.' : ''}`;
      console.warn(msg);
      window.appAlert(msg);
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingSwap(true);
    try {
      const selectedDayShift = shiftsRangeMap[swapDate];
      const reqShiftId = selectedDayShift ? selectedDayShift.shiftId : null;

      const payload = {
        requestShiftDate: swapDate,
        requestedShiftId: reqShiftId,
        swapWithEmployeeId: parseInt(swapWithEmployeeId, 10),
        swapShiftDate: swapDate, // Assuming same day swap for simplicity
        reason: swapReason
      };

      console.log('Sending API Swap payload:', payload);

      const res = await apiClient.post('/attendance/shift-swap-requests', payload);
      console.log('API Response received:', res.data);

      if (res.data?.success) {
        window.appAlert('Shift swap request submitted successfully!');
        toast.success('Shift swap request submitted successfully!');
        setIsSwapModalOpen(false);
        setSwapDate('');
        setSwapWithEmployeeId('');
        setSwapReason('');
        fetchSwapRequests();
      } else {
        const errorMsg = res.data?.error?.message || 'Failed to submit shift swap';
        console.error(errorMsg);
        window.appAlert(`Error: ${errorMsg}`);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Something went wrong';
      console.error('Swap API Exception:', err);
      window.appAlert(`API Exception: ${errMsg}`);
      toast.error(errMsg);
    } finally {
      setSubmittingSwap(false);
    }
  };

  // Open swap dialog with default date
  const triggerSwapForDate = (dateStr: string) => {
    const dayShift = shiftsRangeMap[dateStr];
    if (dayShift?.isOffDay) {
      toast.warning('You do not have a shift assigned on off days.');
      return;
    }
    setSwapDate(dateStr);
    setIsSwapModalOpen(true);
  };

  // Calendar cells builder
  const getCalendarCells = (): RosterDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const cells: RosterDay[] = [];

    // Prepend previous month trailing days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const d = new Date(year, month - 1, day);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        shift: shiftsRangeMap[dateStr]
      });
    }

    // Current month days
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        shift: shiftsRangeMap[dateStr]
      });
    }

    // Append next month leading days
    const totalCells = 42; // Standard 6-row layout
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        shift: shiftsRangeMap[dateStr]
      });
    }

    return cells;
  };

  const calendarCells = getCalendarCells();

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 px-2 py-0.5 rounded-full font-bold">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Pending</Badge>;
    }
  };

  const formatRosterDays = (days?: string[]) => {
    if (!days || days.length === 0) return 'None';
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  };

  return (
    <div className="space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> My Shifts & Roster
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">Shift Schedule</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            View your shift schedule, weekly roster rules, and coordinate swaps with teammates.
          </p>
        </div>
        <Button
          id="btn-request-swap-header"
          onClick={() => setIsSwapModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-lg gap-1.5 shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Request Shift Swap
        </Button>
      </div>

      {/* Today's Shift Card */}
      <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Roster Status</span>
            </div>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {todayShift && !todayShift.isOffDay && (
            <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg bg-primary text-primary-foreground">
              {formatTime12h(todayShift.startTime)} - {formatTime12h(todayShift.endTime)}
            </span>
          )}
        </div>

        <CardContent className="p-4 sm:p-5">
          {todayShift ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Shift info */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-start gap-3">
                  <div 
                    className="p-3 rounded-xl text-white shadow-2xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: todayShift.color || 'hsl(var(--primary))' }}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-foreground leading-tight">
                        {todayShift.shiftName}
                      </h4>
                      <span className="font-mono text-[10px] font-bold py-0.5 px-2 rounded-md border" style={{ color: todayShift.color, borderColor: todayShift.color }}>
                        {todayShift.shiftCode}
                      </span>
                      {todayShift.isNightShift && (
                        <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">Night Shift</span>
                      )}
                      {todayShift.isFlexible && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">Flexible</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {todayShift.description || 'No description provided for this shift.'}
                    </p>
                  </div>
                </div>

                {/* Grid metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Timings', value: todayShift.isFlexible ? 'Flexible Start' : `${formatTime12h(todayShift.startTime)} - ${formatTime12h(todayShift.endTime)}` },
                    { label: 'Grace Period', value: `${todayShift.gracePeriodMinutes || 0} mins` },
                    { label: 'Break Duration', value: `${todayShift.breakDurationMinutes || 0} mins` },
                    { label: 'Roster Type', value: todayShift.isOffDay ? 'Off Day' : 'Working Day', accent: true },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="space-y-1 bg-muted/30 p-3 rounded-lg border border-border/70">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{label}</span>
                      <span className={`text-xs font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* real checkin map */}
              <div className="relative rounded-xl overflow-hidden border border-border/70 bg-muted/20 h-44 flex flex-col justify-end shadow-inner p-3">
                <div id="roster-map" className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
                
                <div className="z-[1000] flex justify-between items-center text-[10px] text-muted-foreground font-semibold w-full bg-card/90 backdrop-blur-sm p-2 rounded border border-border/50">
                  <span className="font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Office Location Map
                  </span>
                  <span>Active Bounds</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3 bg-muted/20 rounded-lg border border-dashed border-border">
              <div className="p-3 rounded-full bg-muted text-muted-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">No Shift Scheduled Today</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                  You are marked as OFF today or no shift pattern has been assigned.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content: Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* LEFT/MID: Calendar & Shifts List (Span 2) */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Shift Schedule</CardTitle>
                <CardDescription className="text-xs">Browse calendar grid or list layout</CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggles */}
                <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className={`h-7 px-2.5 rounded-md text-xs font-bold gap-1 ${
                      viewMode === 'calendar' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" /> Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`h-7 px-2.5 rounded-md text-xs font-bold gap-1 ${
                      viewMode === 'list' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> List
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* Calendar Navigator */}
              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/60">
                <span className="text-sm font-bold text-foreground">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-lg border-border bg-background"
                    onClick={prevMonth}
                    disabled={loadingShifts}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-lg text-xs font-bold border-border bg-background"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    }}
                  >
                    Current
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-lg border-border bg-background"
                    onClick={nextMonth}
                    disabled={loadingShifts}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {loadingShifts ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              ) : viewMode === 'calendar' ? (
                <div className="space-y-3">
                  {/* Grid Header */}
                  <div className="grid grid-cols-7 gap-1.5 text-center mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <span key={d} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Grid Cells */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarCells.map((cell, idx) => {
                      const hasShift = cell.shift && !cell.shift.isOffDay;
                      const shiftColor = cell.shift?.color || 'hsl(var(--muted-foreground))';
                      const isToday = formatDateLocal(new Date()) === cell.dateStr;

                      return (
                        <Popover key={`${cell.dateStr}-${idx}`}>
                          <PopoverTrigger asChild>
                            <button
                              id={`calendar-cell-${cell.dateStr}`}
                              className={`w-full min-h-[80px] sm:min-h-[100px] rounded-xl border p-2 flex flex-col justify-between items-start transition-all relative group hover:border-primary/40 ${
                                cell.isCurrentMonth
                                  ? 'bg-card border-border/70'
                                  : 'bg-muted/20 border-border/30 text-muted-foreground'
                              } ${
                                isToday 
                                  ? 'ring-2 ring-primary border-primary/30' 
                                  : ''
                              }`}
                            >
                              {/* Day Number */}
                              <span className={`text-xs font-bold ${
                                isToday ? 'text-primary' : 'text-foreground'
                              }`}>
                                {cell.date.getDate()}
                              </span>

                              {/* Shift indicator */}
                              {cell.shift ? (
                                cell.shift.isOffDay ? (
                                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider">OFF</span>
                                ) : (
                                  <div className="w-full flex items-center justify-between gap-1 mt-auto">
                                    <span 
                                      className="h-1.5 w-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: shiftColor }}
                                    />
                                    <span className="text-[9px] font-bold truncate max-w-[55px] uppercase font-mono" style={{ color: shiftColor }}>
                                      {cell.shift.shiftCode}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground/60">No shift</span>
                              )}
                            </button>
                          </PopoverTrigger>

                          {/* Day Details Popover */}
                          <PopoverContent className="w-68 p-4 rounded-xl shadow-xl border border-border/80 bg-card z-50">
                            {cell.shift ? (
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <h4 className="text-sm font-black text-foreground">
                                      {cell.shift.isOffDay ? 'Off Day' : cell.shift.shiftName}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground font-bold">
                                      {cell.date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                  {!cell.shift.isOffDay && (
                                    <span 
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono uppercase" 
                                      style={{ backgroundColor: `${shiftColor}20`, color: shiftColor, border: `1px solid ${shiftColor}40` }}
                                    >
                                      {cell.shift.shiftCode}
                                    </span>
                                  )}
                                </div>

                                {!cell.shift.isOffDay ? (
                                  <div className="space-y-2.5">
                                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border/60 pt-2.5">
                                      <div>
                                        <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Timings</span>
                                        <span className="font-bold text-foreground">
                                          {cell.shift.isFlexible ? 'Flexible' : `${formatTime12h(cell.shift.startTime)} - ${formatTime12h(cell.shift.endTime)}`}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Break</span>
                                        <span className="font-bold text-foreground">{cell.shift.breakDurationMinutes || 0} mins</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Grace Period</span>
                                        <span className="font-bold text-foreground">{cell.shift.gracePeriodMinutes || 0} mins</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Status</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Active</span>
                                      </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-muted-foreground leading-normal border-t border-border/60 pt-2">
                                      {cell.shift.description || 'No specific descriptions.'}
                                    </p>

                                    <Button
                                      id={`btn-swap-${cell.dateStr}`}
                                      size="sm"
                                      onClick={() => triggerSwapForDate(cell.dateStr)}
                                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 rounded-lg shadow-2xs"
                                    >
                                      Request Shift Swap
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="border-t border-border/60 pt-2.5 text-center">
                                    <p className="text-xs text-muted-foreground">
                                      Weekly roster off day. No work shift assigned for this date.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center">No shifts data loaded for this date.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* LIST VIEW */
                <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
                  {calendarCells.filter(c => c.isCurrentMonth).map((cell) => {
                    const isOff = !cell.shift || cell.shift.isOffDay;
                    const shiftColor = cell.shift?.color || 'hsl(var(--muted-foreground))';

                    return (
                      <div 
                        key={cell.dateStr}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isOff ? 'bg-muted/20 border-border/40' : 'bg-card border-border/70 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-start min-w-[60px]">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">
                              {cell.date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-sm font-black text-foreground">
                              {cell.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>

                          <div>
                            {isOff ? (
                              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Off Day
                              </span>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shiftColor }} />
                                  {cell.shift.shiftName}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground font-mono">
                                  ({formatTime12h(cell.shift.startTime)} - {formatTime12h(cell.shift.endTime)})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {!isOff && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => triggerSwapForDate(cell.dateStr)}
                            className="text-primary hover:text-primary/80 hover:bg-primary/10 font-bold text-xs rounded-lg h-7"
                          >
                            Swap
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Roster rules & Swap requests */}
        <div className="space-y-5">
          
          {/* Roster Pattern Panel */}
          <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">Roster Cycle Rules</CardTitle>
              <CardDescription className="text-xs">Your current week rotation rules</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {loadingRoster ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : rosterInfo?.rosterPattern ? (
                <div className="space-y-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Week Pattern</span>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      Working Days: {formatRosterDays(rosterInfo.rosterPattern.daysIncluded)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-muted/30 p-3 rounded-lg border border-border/60">
                    <div>
                      <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Pattern Cycle Week</span>
                      <span className="font-bold text-foreground">Week {rosterInfo.currentWeek}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{rosterInfo.currentStatus}</span>
                    </div>
                    <div className="col-span-2 border-t border-border/60 pt-2 mt-1">
                      <span className="text-muted-foreground font-bold block uppercase tracking-wider text-[8px]">Next Rotation Change</span>
                      <span className="font-bold text-primary font-mono">
                        {rosterInfo.nextChangeDate ? new Date(rosterInfo.nextChangeDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Continuous'}
                      </span>
                    </div>
                  </div>

                  {rosterInfo.rosterPattern.excludedWorkingPattern?.sat && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Special Saturday Rule</span>
                      <p className="text-[11px] text-muted-foreground leading-normal font-medium mt-0.5">
                        Saturdays (2nd and 4th) are working, requiring a clock-in at {formatTime12h(rosterInfo.rosterPattern.excludedWorkingPattern.sat.checkInTime || '09:00:00')}.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Policies In-Effect</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rosterInfo.rosterPattern.behaviorToggles?.excludeBreakTime && (
                        <span className="bg-muted text-muted-foreground border border-border text-[9px] font-bold py-0.5 px-2 rounded-md">Break Excluded</span>
                      )}
                      {rosterInfo.rosterPattern.behaviorToggles?.noLateDeduction && (
                        <span className="bg-muted text-muted-foreground border border-border text-[9px] font-bold py-0.5 px-2 rounded-md">No Late Deduct</span>
                      )}
                      <span className="bg-muted text-muted-foreground border border-border text-[9px] font-bold py-0.5 px-2 rounded-md">Geofence Active</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No active pattern info available.</p>
              )}
            </CardContent>
          </Card>

          {/* Swap History List */}
          <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">Swap Requests</CardTitle>
              <CardDescription className="text-xs">Your shift swap request history</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {loadingSwaps ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : swapRequests.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {swapRequests.map((req) => {
                    const reqDate = new Date(req.requestShiftDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    const swapDateVal = new Date(req.swapShiftDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    const swapColor = req.requestedShiftColor || 'hsl(var(--primary))';

                    return (
                      <div 
                        key={req.id} 
                        className="p-3 rounded-lg border border-border/70 hover:border-border transition-all space-y-2 bg-muted/10"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Request Date</span>
                            <span className="text-xs font-bold text-foreground">{reqDate}</span>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="space-y-1 text-[11px] border-t border-border/60 pt-2">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-bold flex items-center gap-1"><User className="w-3 h-3 text-primary" /> Swap With:</span>
                            <span className="font-bold text-foreground">{req.swapWithFirstName} {req.swapWithLastName}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-bold">My Shift:</span>
                            <span className="font-bold flex items-center gap-1.5" style={{ color: swapColor }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: swapColor }} />
                              {req.requestedShiftName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-bold">Colleague Shift:</span>
                            <span className="font-bold text-foreground">{req.swapShiftName} ({req.swapShiftCode})</span>
                          </div>
                          {req.reason && (
                            <p className="text-[10px] italic text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded-md border border-border/50">
                              "{req.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
                  <FileText className="w-7 h-7 text-muted-foreground/40" />
                  <p className="text-xs font-semibold">No shift swap requests</p>
                  <p className="text-[10px] text-muted-foreground/70">Submit swap requests to coordinate roster dates.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Shift Swap Dialog Modal */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-md p-5 rounded-xl shadow-2xl border border-border bg-card">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> Swap Shift Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Coordinate and exchange scheduled shift timings with an active teammate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSwapSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="swap-date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Requested Shift Date</Label>
              <Select value={swapDate} onValueChange={setSwapDate}>
                <SelectTrigger id="swap-date" className="rounded-lg border-border bg-muted/50 h-9 text-xs font-semibold">
                  <SelectValue placeholder="Choose shift date..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(shiftsRangeMap).filter((wd: any) => !wd.isOffDay).length > 0 ? (
                    Object.values(shiftsRangeMap)
                      .filter((wd: any) => !wd.isOffDay)
                      .sort((a: any, b: any) => a.date.localeCompare(b.date))
                      .map((wd: any) => {
                        const formatted = new Date(wd.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <SelectItem key={wd.date} value={wd.date}>
                            {formatted} — {wd.shiftName}
                          </SelectItem>
                        );
                      })
                  ) : (
                    <div className="p-3 text-center text-xs text-muted-foreground">No working shifts scheduled.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-colleague" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Choose Teammate</Label>
              <Select value={swapWithEmployeeId} onValueChange={setSwapWithEmployeeId}>
                <SelectTrigger id="swap-colleague" className="rounded-lg border-border bg-muted/50 h-9 text-xs font-semibold">
                  <SelectValue placeholder="Select colleague..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)} className="text-xs font-semibold">
                        {emp.firstName} {emp.lastName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-muted-foreground">No colleagues found.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-reason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Swap</Label>
              <Textarea
                id="swap-reason"
                placeholder="Brief reason for requested roster change..."
                required
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="rounded-lg border-border bg-muted/50 text-xs font-medium min-h-[75px] focus-visible:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border/60 gap-2 flex sm:flex-row justify-end">
              <DialogClose asChild>
                <Button 
                  id="btn-cancel-swap"
                  type="button" 
                  variant="outline" 
                  className="rounded-lg text-xs font-bold border-border h-9"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                id="btn-submit-swap"
                type="submit"
                disabled={submittingSwap}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 rounded-lg shadow-2xs h-9 gap-1.5"
              >
                {submittingSwap ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
