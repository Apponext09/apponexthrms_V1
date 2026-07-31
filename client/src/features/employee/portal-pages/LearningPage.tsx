import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LearningPage() {
  const [courses, setCourses] = useState([
    { id: 1, name: 'Corporate Compliance & Code of Conduct', duration: '2 hrs', progress: 100, lessons: '4/4', status: 'Completed' },
    { id: 2, name: 'Advanced React Architecture & Patterns', duration: '8 hrs', progress: 45, lessons: '5/12', status: 'In Progress' },
    { id: 3, name: 'Docker & Kubernetes Foundations', duration: '6 hrs', progress: 0, lessons: '0/8', status: 'Assigned' },
  ]);

  const handleStartCourse = (name: string) => {
    toast.success(`Starting course player: "${name}"`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Learning Portal (LMS)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Courses
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access your assigned compliance, technical, and professional development courses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {courses.map((c) => (
          <Card key={c.id} className="border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <div className="flex justify-between items-center mb-1">
                <Badge variant="outline" className={`text-[9px] font-bold ${
                  c.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : c.status === 'In Progress'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {c.status}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold leading-snug text-foreground">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {c.lessons} Lessons</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-mono">{c.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
              <Button 
                onClick={() => handleStartCourse(c.name)}
                className={`w-full h-9 font-bold text-xs gap-1.5 rounded-lg shadow-2xs ${
                  c.status === 'Completed' 
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {c.status === 'Completed' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Review Course
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" /> Start Learning
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
