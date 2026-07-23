import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Clock, BookOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LearningPage() {
  const [courses, setCourses] = useState([
    { id: 1, name: 'Corporate Compliance & Code of Conduct', duration: '2 hrs', progress: 100, lessons: '4/4', status: 'Completed' },
    { id: 2, name: 'Advanced React Architecture and Patterns', duration: '8 hrs', progress: 45, lessons: '5/12', status: 'In Progress' },
    { id: 3, name: 'Docker & Kubernetes Foundations', duration: '6 hrs', progress: 0, lessons: '0/8', status: 'Assigned' },
  ]);

  const handleStartCourse = (name: string) => {
    toast.success(`Starting course player: "${name}"`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Learning Management System (LMS)</h2>
          <p className="text-xs text-muted-foreground">Access your assigned compliance and professional self-development courses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((c) => (
          <Card key={c.id} className="border rounded-2xl shadow-sm flex flex-col justify-between hover:border-violet-600 transition-colors">
            <CardHeader className="pb-3 border-b">
              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 w-max ${
                c.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : c.status === 'In Progress' ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-800'
              }`}>{c.status}</span>
              <CardTitle className="text-sm font-bold leading-snug">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {c.lessons} Lessons</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground">{c.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    c.status === 'Completed' ? 'bg-emerald-500' : 'bg-violet-600'
                  }`} style={{ width: `${c.progress}%` }}></div>
                </div>
              </div>
              <Button 
                onClick={() => handleStartCourse(c.name)}
                className={`w-full py-5 rounded-xl font-bold text-xs gap-1.5 ${
                  c.status === 'Completed' 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow'
                }`}
              >
                {c.status === 'Completed' ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Review Course
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" /> Start Learning
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
