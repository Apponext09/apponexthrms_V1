import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function JobOpeningsPage() {
  const jobs = [
    { title: 'DevOps Architect', location: 'Pune HQ', experience: '5-8 Years', desc: 'Manage Kubernetes infrastructure, deployment configurations, and AWS pipelines.' },
    { title: 'Senior React Developer', location: 'Remote / Pune', experience: '4-6 Years', desc: 'Build interactive UI, core features, component libraries, and frontend performance.' },
  ];

  const handleApply = (title: string) => {
    toast.success(`Internal job application submitted for "${title}".`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Internal Job Openings (IJP)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Careers
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply for career progression opportunities or lateral movements within company departments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {jobs.map((job, idx) => (
          <Card key={idx} className="border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <div className="flex justify-between items-center mb-1">
                <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                  Full Time
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">{job.title}</CardTitle>
              <CardDescription className="flex flex-wrap gap-3 mt-1 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {job.location}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 shrink-0" /> {job.experience}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{job.desc}</p>
              <Button 
                onClick={() => handleApply(job.title)}
                className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs"
              >
                Apply for Position <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
