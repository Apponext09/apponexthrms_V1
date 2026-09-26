import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, MapPin, Clock, Search, Trash2, Edit3, CheckCircle2, XCircle, Loader2,
  Building2, Users, Layers, Tag, UserCheck, Shield, Award, Sparkles, Filter, RotateCcw,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, EventRecord } from '../hooks/useEvents';
import { useEventAudienceOptions } from '../hooks/useEventAudienceOptions';
import { EventAudienceAccordion } from './EventAudienceAccordion';
import { EventDescriptionEditor } from './EventDescriptionEditor';

interface EventMasterFormProps {
  hideFiltersAndList?: boolean;
  isNew?: boolean;
  onCancel?: () => void;
  onSave?: (event: EventRecord) => void;
}

export function EventMasterForm({
  hideFiltersAndList = false,
  isNew = false,
  onCancel,
  onSave,
}: EventMasterFormProps) {
  const { data: eventsList = [], isLoading: isFetching } = useEvents();
  const { data: audienceOpts } = useEventAudienceOptions();

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const [isNewMode, setIsNewMode] = useState<boolean>(isNew);
  const [selectedId, setSelectedId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Keep selectedId valid when events load
  useEffect(() => {
    if (!isNewMode && eventsList.length > 0 && (!selectedId || !eventsList.some((e) => e.id === selectedId))) {
      setSelectedId(eventsList[0].id);
    }
  }, [eventsList, selectedId, isNewMode]);

  // Selected event record
  const selectedEvent = useMemo(() => {
    return eventsList.find((e) => e.id === selectedId) || eventsList[0] || null;
  }, [eventsList, selectedId]);

  // Filter States for directory list
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form Field States
  const [formTitle, setFormTitle] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formEventType, setFormEventType] = useState('Townhall');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formEndDate, setFormEndDate] = useState(todayStr);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formDisplayDaysBefore, setFormDisplayDaysBefore] = useState(7);
  const [formDescription, setFormDescription] = useState('');

  // Toggles
  const [formRequireParticipation, setFormRequireParticipation] = useState(false);
  const [formAllowComments, setFormAllowComments] = useState(true);
  const [formSetReminder, setFormSetReminder] = useState(true);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  // Audience Target Selection States
  const [formCompanyIds, setFormCompanyIds] = useState<(string | number)[]>([]);
  const [formLocationIds, setFormLocationIds] = useState<(string | number)[]>([]);
  const [formDepartmentIds, setFormDepartmentIds] = useState<(string | number)[]>([]);
  const [formShiftIds, setFormShiftIds] = useState<(string | number)[]>([]);
  const [formGradeIds, setFormGradeIds] = useState<(string | number)[]>([]);
  const [formEmploymentTypes, setFormEmploymentTypes] = useState<string[]>([]);
  const [formEmployeeStatusIds, setFormEmployeeStatusIds] = useState<(string | number)[]>([]);
  const [formGender, setFormGender] = useState('All');

  // Sync state when selected event changes or when toggling new mode
  useEffect(() => {
    if (isNewMode) {
      setFormTitle('');
      setFormVenue('');
      setFormEventType('Townhall');
      setFormStartDate(todayStr);
      setFormEndDate(todayStr);
      setFormStartTime('09:00');
      setFormEndTime('17:00');
      setFormDisplayDaysBefore(7);
      setFormDescription('');
      setFormRequireParticipation(false);
      setFormAllowComments(true);
      setFormSetReminder(true);
      setFormStatus('Active');
      setFormCompanyIds([]);
      setFormLocationIds([]);
      setFormDepartmentIds([]);
      setFormShiftIds([]);
      setFormGradeIds([]);
      setFormEmploymentTypes([]);
      setFormEmployeeStatusIds([]);
      setFormGender('All');
    } else if (selectedEvent) {
      setFormTitle(selectedEvent.title || '');
      setFormVenue(selectedEvent.venue || '');
      setFormEventType(selectedEvent.eventType || 'Townhall');
      setFormStartDate(selectedEvent.startDate ? String(selectedEvent.startDate).split('T')[0] : todayStr);
      setFormEndDate(selectedEvent.endDate ? String(selectedEvent.endDate).split('T')[0] : todayStr);
      setFormStartTime(selectedEvent.startTime || '09:00');
      setFormEndTime(selectedEvent.endTime || '17:00');
      setFormDisplayDaysBefore(selectedEvent.displayDaysBefore ?? 7);
      setFormDescription(selectedEvent.description || '');
      setFormRequireParticipation(Boolean(selectedEvent.requireParticipation));
      setFormAllowComments(Boolean(selectedEvent.allowComments));
      setFormSetReminder(Boolean(selectedEvent.setReminder));
      setFormStatus(selectedEvent.status || 'Active');
      setFormCompanyIds(selectedEvent.companyIds || []);
      setFormLocationIds(selectedEvent.locationIds || []);
      setFormDepartmentIds(selectedEvent.departmentIds || []);
      setFormShiftIds(selectedEvent.shiftIds || []);
      setFormGradeIds(selectedEvent.gradeIds || []);
      setFormEmploymentTypes((selectedEvent.employmentTypes || []) as string[]);
      setFormEmployeeStatusIds(selectedEvent.employeeStatusIds || []);
      setFormGender(selectedEvent.gender || 'All');
    }
  }, [selectedEvent, isNewMode, todayStr]);

  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast.error('Please enter an event title');
      return;
    }

    const payload: Partial<EventRecord> = {
      title: formTitle,
      venue: formVenue,
      eventType: formEventType,
      startDate: formStartDate,
      endDate: formEndDate,
      startTime: formStartTime,
      endTime: formEndTime,
      displayDaysBefore: Number(formDisplayDaysBefore),
      description: formDescription,
      requireParticipation: formRequireParticipation,
      allowComments: formAllowComments,
      setReminder: formSetReminder,
      status: formStatus,
      isActive: formStatus === 'Active',
      companyIds: formCompanyIds,
      locationIds: formLocationIds,
      departmentIds: formDepartmentIds,
      shiftIds: formShiftIds,
      gradeIds: formGradeIds,
      employmentTypes: formEmploymentTypes,
      employeeStatusIds: formEmployeeStatusIds,
      gender: formGender,
    };

    try {
      if (isNewMode) {
        const created = await createMutation.mutateAsync(payload);
        showToast.success('Event created successfully');
        setIsNewMode(false);
        if (created?.id) setSelectedId(String(created.id));
        if (onSave) onSave(created);
      } else if (selectedId) {
        const updated = await updateMutation.mutateAsync({ id: selectedId, ...payload });
        showToast.success('Event updated successfully');
        if (onSave) onSave(updated);
      }
    } catch (err: any) {
      console.error('[EventMasterForm] Save error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to save event details';
      showToast.error(msg);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!await window.appConfirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast.success('Event deleted successfully');
      if (selectedId === id) {
        setSelectedId('');
        setIsNewMode(true);
      }
    } catch {
      showToast.error('Failed to delete event');
    }
  };

  // Filtered Events Directory List
  const filteredEvents = useMemo(() => {
    return eventsList.filter((ev) => {
      const matchesSearch =
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.eventType && ev.eventType.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || ev.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [eventsList, searchQuery, statusFilter]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Title / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Events Master</h2>
              
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure company events, townhalls, celebration schedules, and segment audience targeting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Back to Masters
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Left, Directory Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className={cn('space-y-6', hideFiltersAndList ? 'lg:col-span-12' : 'lg:col-span-7')}>
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isNewMode ? 'Create New Event' : `Edit Event — ${formTitle || 'Selected Event'}`}
                </h3>
              </div>
            </div>

            {/* Section 1: Event Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>1. Event Basic Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Event Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Q3 All-Hands Townhall, Annual Celebration"
                    className="text-xs h-10 bg-background rounded-xl"
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Event Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="Townhall">Townhall</option>
                    <option value="Celebration">Celebration</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Conference">Conference</option>
                    <option value="Training">Training</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Location / Venue */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Location / Venue</label>
                  <Input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="e.g. Main Auditorium, Building A / Online Zoom"
                    className="text-xs h-10 bg-background rounded-xl"
                  />
                </div>

                {/* Event Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-xs h-10 bg-background rounded-xl font-mono"
                  />
                </div>

                {/* Event End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="text-xs h-10 bg-background rounded-xl font-mono"
                  />
                </div>

                {/* Time Range (Start Time & End Time) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Time Range (Start - End)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="text-xs h-10 bg-background rounded-xl font-mono flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="text-xs h-10 bg-background rounded-xl font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Days Before */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Display Days In Advance
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      value={formDisplayDaysBefore}
                      onChange={(e) => setFormDisplayDaysBefore(Number(e.target.value))}
                      className="text-xs h-10 w-32 bg-background rounded-xl font-semibold"
                    />
                    <span className="text-xs text-muted-foreground">
                      Days before event date to show in employee portal feeds
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Rich-Text Description */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                <span>2. Event Description & Agenda</span>
              </div>
              <EventDescriptionEditor
                value={formDescription}
                onChange={setFormDescription}
              />
            </div>

            {/* Section 3: Audience Targeting Accordions */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>3. Audience Targeting & Scope</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Empty selection = All Employees
                </Badge>
              </div>

              {/* Gender Single Select */}
              <div className="p-3 border border-border/80 rounded-2xl bg-card">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Gender Target
                </label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormGender(g)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        formGender === g
                          ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                          : 'border-border bg-background hover:bg-muted/40 text-foreground'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accordions */}
              <div className="space-y-2">
                <EventAudienceAccordion
                  title="Companies"
                  icon={<Building2 className="h-4 w-4" />}
                  options={audienceOpts?.companies || []}
                  selectedIds={formCompanyIds}
                  onChange={setFormCompanyIds}
                />

                <EventAudienceAccordion
                  title="Locations"
                  icon={<MapPin className="h-4 w-4" />}
                  options={audienceOpts?.locations || []}
                  selectedIds={formLocationIds}
                  onChange={setFormLocationIds}
                />

                <EventAudienceAccordion
                  title="Departments"
                  icon={<Layers className="h-4 w-4" />}
                  options={audienceOpts?.departments || []}
                  selectedIds={formDepartmentIds}
                  onChange={setFormDepartmentIds}
                />

                <EventAudienceAccordion
                  title="Shifts"
                  icon={<Clock className="h-4 w-4" />}
                  options={audienceOpts?.shifts || []}
                  selectedIds={formShiftIds}
                  onChange={setFormShiftIds}
                />

                <EventAudienceAccordion
                  title="Grades"
                  icon={<Award className="h-4 w-4" />}
                  options={audienceOpts?.grades || []}
                  selectedIds={formGradeIds}
                  onChange={setFormGradeIds}
                />

                <EventAudienceAccordion
                  title="Employment Types"
                  icon={<UserCheck className="h-4 w-4" />}
                  options={audienceOpts?.employmentTypes || []}
                  selectedIds={formEmploymentTypes}
                  onChange={(selected) => setFormEmploymentTypes(selected as string[])}
                />

                <EventAudienceAccordion
                  title="Employment Statuses"
                  icon={<Globe className="h-4 w-4" />}
                  options={audienceOpts?.employeeStatuses || []}
                  selectedIds={formEmployeeStatusIds}
                  onChange={setFormEmployeeStatusIds}
                />
              </div>
            </div>

            {/* Section 4: Event Options & Status */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>4. Event Status</span>
              </div>

              {/* Status Selector */}
              <div className="flex items-center justify-between p-3 border border-border/80 rounded-2xl bg-card mt-2">
                <div>
                  <span className="block text-xs font-bold text-foreground">Event Status</span>
                  <span className="text-[11px] text-muted-foreground">Active events appear in employee feeds</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('Active')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      formStatus === 'Active'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('Inactive')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      formStatus === 'Inactive'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-600 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-end gap-3 pt-4 border-t border-border bg-card rounded-b-2xl">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl text-xs">
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSaving} className="rounded-xl text-xs font-bold px-6">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isNewMode ? 'Create Event' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Events Directory List */}
        {!hideFiltersAndList && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Events Directory
                  <Badge variant="secondary" className="text-[10px] rounded-md font-semibold">
                    {filteredEvents.length}
                  </Badge>
                </h3>
                <Button size="sm" onClick={handleAddNewClick} className="rounded-xl text-xs h-8 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Add Event
                </Button>
              </div>

              {/* Search & Status Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search events by title, type, venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs h-9 pl-8 bg-background rounded-xl border-border/80"
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  {(['All', 'Active', 'Inactive'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                        statusFilter === st
                          ? 'border-primary/50 bg-primary/10 text-primary font-bold'
                          : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Directory Record Cards */}
              {isFetching ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading events directory...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No events found matching your search.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredEvents.map((ev) => {
                    const isSelected = !isNewMode && ev.id === selectedId;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setIsNewMode(false);
                          setSelectedId(ev.id);
                        }}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2',
                          isSelected
                            ? 'border-primary/60 bg-primary/5 shadow-2xs'
                            : 'border-border/70 bg-background hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-foreground leading-snug">
                                {ev.title}
                              </h4>
                            </div>
                            {ev.venue && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-muted-foreground/70" />
                                <span className="truncate max-w-[200px]">{ev.venue}</span>
                              </p>
                            )}
                          </div>

                          <Badge
                            variant={ev.status === 'Active' ? 'default' : 'outline'}
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0',
                              ev.status === 'Active'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 border-emerald-500/30'
                                : 'text-rose-500 border-rose-500/30'
                            )}
                          >
                            {ev.status || 'Active'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" /> {ev.startTime} - {ev.endTime}
                          </span>
                          <span className="font-semibold text-primary/80">{ev.eventType}</span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsNewMode(false);
                                setSelectedId(ev.id);
                              }}
                              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                              title="Edit Event"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ev.id, ev.title);
                              }}
                              className="p-1 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500"
                              title="Delete Event"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
