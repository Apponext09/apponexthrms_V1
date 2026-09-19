import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Users,
  Clock,
  Video,
  MapPin,
  Edit2,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useLmsBatches,
  useLmsCourses,
  useCreateLmsBatch,
  useUpdateLmsBatch,
  useDeleteLmsBatch,
} from '../api/useLms';
import type { LmsBatch } from '../types/lms.types';
import { toast } from 'sonner';

export function BatchManagementPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<LmsBatch | null>(null);

  const [form, setForm] = useState({
    courseId: undefined as number | undefined,
    title: '',
    trainerName: '',
    startDate: '',
    endDate: '',
    scheduleTime: '10:00 AM - 11:30 AM',
    scheduleDays: 'Mon - Fri',
    todaySessionTime: '',
    sessionNotice: '',
    mode: 'online' as 'online' | 'offline',
    maxSeats: 30,
    meetingLink: '',
    location: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
  });

  const { data: batches = [], isLoading } = useLmsBatches({
    status: selectedStatus,
    search,
  });
  const { data: courses = [] } = useLmsCourses();

  const createMutation = useCreateLmsBatch();
  const updateMutation = useUpdateLmsBatch();
  const deleteMutation = useDeleteLmsBatch();

  const handleOpenCreate = () => {
    setEditingBatch(null);
    setForm({
      courseId: courses[0]?.id || undefined,
      title: '',
      trainerName: '',
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
      scheduleTime: '10:00 AM - 11:30 AM',
      scheduleDays: 'Mon - Fri',
      todaySessionTime: '',
      sessionNotice: '',
      mode: 'online',
      maxSeats: 30,
      meetingLink: '',
      location: '',
      status: 'upcoming',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (batch: LmsBatch) => {
    setEditingBatch(batch);
    setForm({
      courseId: batch.courseId || batch.course_id || undefined,
      title: batch.title,
      trainerName: batch.trainerName || batch.trainer_name || '',
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().slice(0, 16) : '',
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().slice(0, 16) : '',
      scheduleTime: batch.scheduleTime || (batch as any).schedule_time || '10:00 AM - 11:30 AM',
      scheduleDays: batch.scheduleDays || (batch as any).schedule_days || 'Mon - Fri',
      todaySessionTime: batch.todaySessionTime || (batch as any).today_session_time || '',
      sessionNotice: batch.sessionNotice || (batch as any).session_notice || '',
      mode: batch.mode || 'online',
      maxSeats: Number(batch.maxSeats || batch.max_seats || 30),
      meetingLink: batch.meetingLink || batch.meeting_link || '',
      location: batch.location || '',
      status: batch.status || 'upcoming',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      courseId: Number(form.courseId),
      maxSeats: Number(form.maxSeats),
    };

    if (editingBatch) {
      await updateMutation.mutateAsync({ id: editingBatch.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (await window.appConfirm('Are you sure you want to delete this batch?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Instructor-Led Batches & Schedules
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate cohort schedules, virtual meeting links, classroom slots, and trainer rosters.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-lg">
          <Plus className="w-4 h-4" /> Schedule New Batch
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search batches by title or trainer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg bg-background"
          />
        </div>

        <select
          value={selectedStatus || ''}
          onChange={(e) => setSelectedStatus(e.target.value || undefined)}
          className="h-9 text-xs rounded-lg border border-border bg-background px-3 font-semibold text-foreground focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40 rounded-xl" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border/80 rounded-xl shadow-2xs">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Batches Scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Schedule virtual or classroom sessions for blended or instructor-led courses.
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Schedule Batch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => {
            const seatsFilled = Number(batch.seatsFilled || batch.seats_filled || 0);
            const maxSeats = Number(batch.maxSeats || batch.max_seats || 30);
            const seatPct = maxSeats > 0 ? Math.round((seatsFilled / maxSeats) * 100) : 0;

            return (
              <Card
                key={batch.id}
                className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/40 transition-all bg-card flex flex-col justify-between"
              >
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex justify-between items-center mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        batch.status === 'upcoming'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                          : batch.status === 'ongoing'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {batch.status?.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-bold capitalize">
                      {batch.mode === 'online' ? '🌐 Virtual Online' : '🏢 In-Person'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground leading-snug">{batch.title}</CardTitle>
                  <CardDescription className="text-xs font-medium text-primary"></CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                    <p className="flex items-center gap-2 font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'TBD'} -{' '}
                      {batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'TBD'}
                    </p>
                    {(batch.scheduleTime || (batch as any).schedule_time) && (
                      <p className="flex items-center gap-1.5 font-semibold text-primary text-[11px] bg-primary/5 p-1.5 rounded-lg border border-primary/10">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span>
                          Daily: <strong>{batch.scheduleTime || (batch as any).schedule_time}</strong>{' '}
                          ({batch.scheduleDays || (batch as any).schedule_days || 'Mon - Fri'})
                        </span>
                      </p>
                    )}
                    {(batch.todaySessionTime || (batch as any).today_session_time) && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-800 dark:text-amber-200">
                        <p className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          Today's Live Class: {batch.todaySessionTime || (batch as any).today_session_time}
                        </p>
                        {(batch.sessionNotice || (batch as any).session_notice) && (
                          <p className="text-[10px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                            Notice: {batch.sessionNotice || (batch as any).session_notice}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="flex items-center gap-2 font-medium">
                      <Users className="w-3.5 h-3.5 text-primary" /> Trainer:{' '}
                      <span className="font-bold text-foreground">{batch.trainerName || batch.trainer_name || 'Assigned Staff'}</span>
                    </p>
                    {batch.mode === 'online' && (batch.meetingLink || (batch as any).meeting_link) ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                        <a
                          href={batch.meetingLink || (batch as any).meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline truncate"
                        >
                          <Video className="w-3.5 h-3.5 shrink-0 text-primary animate-pulse" />
                          <span className="truncate">Join Live Session</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = batch.meetingLink || (batch as any).meeting_link;
                            navigator.clipboard.writeText(link);
                            toast.success('Meeting link copied to clipboard!');
                          }}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                          title="Copy Meeting Link"
                        >
                          Copy
                        </Button>
                      </div>
                    ) : batch.mode === 'online' ? (
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <Video className="w-3.5 h-3.5" /> Meeting link pending
                      </p>
                    ) : null}
                    {batch.mode === 'offline' && batch.location && (
                      <p className="flex items-center gap-2 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {batch.location}
                      </p>
                    )}

                  {/* Seat Capacity Progress */}
                  <div className="space-y-1 pt-1 border-t border-border/60">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">Seats Filled</span>
                      <span className="text-foreground font-mono">
                        {seatsFilled} / {maxSeats} ({seatPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          seatPct >= 100 ? 'bg-rose-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, seatPct)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                {/* Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(batch)}
                    className="h-8 text-xs font-semibold gap-1.5 flex-1 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(batch.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {editingBatch ? 'Edit Batch Schedule & Notice' : 'Schedule Batch'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Batch Title *</Label>
              <Input
                required
                placeholder="e.g. Q3 React Cohort - Weekend Batch"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Associated Course *</Label>
              <select
                required
                value={form.courseId || ''}
                onChange={(e) => setForm({ ...form, courseId: Number(e.target.value) })}
                className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Trainer Name</Label>
                <Input
                  placeholder="e.g. Sarah Connor"
                  value={form.trainerName}
                  onChange={(e) => setForm({ ...form, trainerName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Max Seats</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxSeats}
                  onChange={(e) => setForm({ ...form, maxSeats: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Daily Fixed Schedule */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 border border-border/80 rounded-xl">
              <div className="space-y-1">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Daily Fixed Time Slot
                </Label>
                <Input
                  placeholder="e.g. 10:00 AM - 11:30 AM"
                  value={form.scheduleTime}
                  onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Schedule Days</Label>
                <Input
                  placeholder="e.g. Mon - Fri or Sat - Sun"
                  value={form.scheduleDays}
                  onChange={(e) => setForm({ ...form, scheduleDays: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Today's Live Class Override / Daily Notice (Admin quick control) */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  ⚡ Today's Live Class (Daily Timing Override & Notice)
                </Label>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-semibold">
                  Visible to Employees
                </span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Today's Live Class Time (Override if changed today)
                </Label>
                <Input
                  placeholder="e.g. Today at 4:30 PM (Rescheduled) or leave blank for regular time"
                  value={form.todaySessionTime}
                  onChange={(e) => setForm({ ...form, todaySessionTime: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Today's Session Topic / Class Notice
                </Label>
                <Input
                  placeholder="e.g. Today's Topic: Redux Toolkit & Live Q&A session"
                  value={form.sessionNotice}
                  onChange={(e) => setForm({ ...form, sessionNotice: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Cohort Start Date</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Cohort End Date</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Training Mode</Label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as any })}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                >
                  <option value="online">Online / Virtual</option>
                  <option value="offline">In-Person Classroom</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Batch Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {form.mode === 'online' ? (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Virtual Meeting Link (Zoom/Google Meet/Teams)</Label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Classroom / Room Location</Label>
                <Input
                  placeholder="e.g. Training Hall B, 3rd Floor"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {editingBatch ? 'Save Changes' : 'Schedule Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
