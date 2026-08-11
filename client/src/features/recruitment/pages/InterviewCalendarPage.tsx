import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, Clock, User, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const InterviewCalendarPage: React.FC = () => {
  // Query today's interviews
  const { data: todayResponse, isLoading: todayLoading } = useQuery({
    queryKey: ['interviews-today'],
    queryFn: async () => {
      const res = await api.get('/recruitment/interviews/today');
      return res.data?.data || [];
    }
  });

  // Query upcoming interview schedule
  const { data: scheduleResponse, isLoading: scheduleLoading } = useQuery({
    queryKey: ['interviews-schedule'],
    queryFn: async () => {
      const res = await api.get('/recruitment/interviews/schedule');
      return res.data?.data || [];
    }
  });

  const todayInterviews = todayResponse || [];
  const upcomingInterviews = scheduleResponse || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'rescheduled': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Rescheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Interview Schedule</h1>
        <p className="text-gray-500 mt-1">Manage scheduled interviews, view your panel list, and join online video rounds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's list */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Today's Interviews ({todayInterviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {todayLoading ? (
                <p className="p-6 text-center text-xs text-slate-500">Loading today's schedule...</p>
              ) : todayInterviews.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No interviews scheduled for today.
                </div>
              ) : (
                <div className="divide-y">
                  {todayInterviews.map((int: any) => (
                    <div key={int.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          {int.candidate_name || 'Candidate'}
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-medium">{int.interview_type}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-4">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {int.scheduled_date || 'N/A'}</span>
                          <span>Round {int.interview_round || 1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {int.meeting_url && (
                          <Button size="sm" onClick={() => window.open(int.meeting_url)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 h-8 text-xs">
                            <Video className="w-3.5 h-3.5" /> Join Room
                          </Button>
                        )}
                        {getStatusBadge(int.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table for all upcoming */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Upcoming Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type & Round</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-500">
                        Loading upcoming schedule...
                      </TableCell>
                    </TableRow>
                  ) : upcomingInterviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                        No upcoming interviews scheduled.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcomingInterviews.map((int: any) => (
                      <TableRow key={int.id}>
                        <TableCell className="font-medium text-slate-900">{int.candidate_name || `Candidate #${int.candidate_id}`}</TableCell>
                        <TableCell>
                          <span className="capitalize">{int.interview_type || 'General'}</span> (Round {int.interview_round})
                        </TableCell>
                        <TableCell>{int.scheduled_date || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(int.status)}</TableCell>
                        <TableCell className="text-right">
                          {int.meeting_url ? (
                            <Button size="sm" variant="outline" onClick={() => window.open(int.meeting_url)} className="h-7 text-[10px] flex items-center gap-1 ml-auto">
                              <Video className="w-3 h-3 text-blue-600" /> Join Link
                            </Button>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Panel stats/cards */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold text-slate-700">Interview Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <p className="font-bold text-slate-800">1. Prepare Feedback</p>
                <p className="mt-1">Provide clear feedback scorecard immediately following completion of the round.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">2. Record Decision</p>
                <p className="mt-1">Recruiter decision should be updated once all interviewers submit ratings.</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[10px] text-slate-500">
                Facing meeting room issues? Contact HR recruitment panel desk.
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
