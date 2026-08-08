import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  UserCheck,
  ArrowLeftRight,
  Award,
  UserMinus,
  FileText,
  ShieldCheck,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Sparkles,
  GitCommit,
  Building2,
  Briefcase,
  MapPin,
  User
} from 'lucide-react';
import { ChronologicalMilestoneEvent } from '../api/lifecycleApi';

interface ChronologicalLifecycleFlowProps {
  milestones: ChronologicalMilestoneEvent[];
  employeeName: string;
  employeeCode: string;
}

export const ChronologicalLifecycleFlow: React.FC<ChronologicalLifecycleFlowProps> = ({
  milestones = [],
  employeeName,
  employeeCode,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Filter events
  const filteredEvents = milestones.filter((m) => {
    if (filterCategory === 'all') return true;
    return m.category === filterCategory;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (a.date === 'N/A') return 1;
    if (b.date === 'N/A') return -1;
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortAscending ? timeA - timeB : timeB - timeA;
  });

  // Event category counts
  const joiningCount = milestones.filter((m) => m.category === 'joining').length;
  const transferCount = milestones.filter((m) => m.category === 'transfer').length;
  const offboardingCount = milestones.filter((m) => m.category === 'offboarding').length;

  const getEventIcon = (iconType: string) => {
    switch (iconType) {
      case 'user_plus':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case 'user_check':
        return <UserCheck className="w-4 h-4 text-sky-500" />;
      case 'arrow_left_right':
        return <ArrowLeftRight className="w-4 h-4 text-indigo-500" />;
      case 'award':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'user_minus':
        return <UserMinus className="w-4 h-4 text-rose-500" />;
      case 'file_text':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'shield_check':
        return <ShieldCheck className="w-4 h-4 text-teal-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'joining':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px]">Joining & Onboarding</Badge>;
      case 'transfer':
        return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold text-[10px]">Transfer & Movement</Badge>;
      case 'offboarding':
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold text-[10px]">Offboarding & Exit</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Status Transition</Badge>;
    }
  };

  const getStatusNodeColor = (status: string) => {
    if (status === 'completed') return 'bg-emerald-500 ring-4 ring-emerald-500/20 border-white dark:border-slate-900';
    if (status === 'current') return 'bg-indigo-600 ring-4 ring-indigo-500/30 border-white dark:border-slate-900 animate-pulse';
    return 'bg-slate-300 dark:bg-slate-700 ring-2 ring-slate-400/20 border-white dark:border-slate-900';
  };

  return (
    <div className="space-y-6">
      {/* FLOW SUMMARY BANNER */}
      <Card className="border border-border/60 rounded-2xl p-4 bg-card shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Chronological Lifecycle Flow</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Complete journey for <span className="font-bold text-foreground">{employeeName}</span> ({employeeCode}) from Joining ➔ Transfers ➔ Exit
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">Joining</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{joiningCount} Event{joiningCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block uppercase font-bold">Transfers</span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{transferCount} Record{transferCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-bold">Exit / Resign</span>
              <span className="font-extrabold text-rose-700 dark:text-rose-300">{offboardingCount} Record{offboardingCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* FILTER & SORT CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-2 rounded-2xl border border-border/50">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-500" /> Stage:
          </span>
          {[
            { id: 'all', label: `All Events (${milestones.length})` },
            { id: 'joining', label: `Joining (${joiningCount})` },
            { id: 'transfer', label: `Transfers (${transferCount})` },
            { id: 'offboarding', label: `Offboarding (${offboardingCount})` },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={filterCategory === tab.id ? 'default' : 'ghost'}
              onClick={() => setFilterCategory(tab.id)}
              className={`h-7 text-xs font-extrabold px-3 rounded-xl transition-all ${filterCategory === tab.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setSortAscending(!sortAscending)}
          className="h-7 text-xs font-extrabold gap-1.5 rounded-xl border-border/60 ml-auto"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
          {sortAscending ? 'Order: Oldest ➔ Newest' : 'Order: Newest ➔ Oldest'}
        </Button>
      </div>

      {/* TIMELINE FLOW MAP */}
      {sortedEvents.length === 0 ? (
        <Card className="p-8 text-center border rounded-2xl bg-card">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-muted-foreground">No lifecycle milestone events match the selected filter.</p>
        </Card>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 via-indigo-500 to-rose-500">
          {sortedEvents.map((evt, idx) => (
            <div key={evt.id} className="relative group">
              {/* Timeline Connector Node */}
              <div
                className={`absolute -left-[31px] sm:-left-[35px] top-1.5 h-4 w-4 rounded-full border-2 ${getStatusNodeColor(
                  evt.status
                )} shadow-md flex items-center justify-center transition-all group-hover:scale-125`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Event Card */}
              <Card className="p-4 border rounded-2xl bg-card hover:shadow-md transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-muted/60 border shrink-0">
                      {getEventIcon(evt.iconType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-foreground">{evt.title}</span>
                        {getCategoryBadge(evt.category)}
                      </div>
                      {evt.subtitle && (
                        <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                          {evt.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-bold bg-muted px-2.5 py-1 rounded-lg border text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" /> {evt.date}
                    </span>
                    <Badge variant={evt.status === 'completed' ? 'default' : 'outline'} className="text-[10px] font-extrabold capitalize">
                      {evt.status}
                    </Badge>
                  </div>
                </div>

                {/* Event Description */}
                <p className="text-xs text-muted-foreground/90 leading-relaxed font-medium">
                  {evt.description}
                </p>

                {/* Metadata Details Grid (If present) */}
                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                    {evt.metadata.department && (
                      <div className="p-2 rounded-xl bg-muted/30 border flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-muted-foreground font-medium">Dept:</span>
                        <span className="font-extrabold text-foreground">{evt.metadata.department}</span>
                      </div>
                    )}
                    {evt.metadata.designation && (
                      <div className="p-2 rounded-xl bg-muted/30 border flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                        <span className="text-muted-foreground font-medium">Role:</span>
                        <span className="font-extrabold text-foreground">{evt.metadata.designation}</span>
                      </div>
                    )}
                    {evt.metadata.location && (
                      <div className="p-2 rounded-xl bg-muted/30 border flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-muted-foreground font-medium">Loc:</span>
                        <span className="font-extrabold text-foreground">{evt.metadata.location}</span>
                      </div>
                    )}
                    {evt.metadata.fromDept && (
                      <div className="p-2 rounded-xl bg-muted/30 border col-span-1 sm:col-span-2 flex items-center gap-1">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-extrabold text-foreground">{evt.metadata.fromDept} ➔ {evt.metadata.toDept}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
