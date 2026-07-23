import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function JobOpeningsPage() {
  const jobs = [
    { title: 'DevOps Architect', location: 'Pune HQ', experience: '5-8 Years', desc: 'Manage Kubernetes infrastructure, deployment configurations and AWS pipelines.' },
    { title: 'Senior React Developer', location: 'Remote / Pune', experience: '4-6 Years', desc: 'Work on building highly interactive user interfaces, optimization and library management.' },
  ];

  const handleApply = (title: string) => {
    toast.success(`Internal job application submitted for "${title}".`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Internal Job Openings (IJP)</h2>
        <p className="text-xs text-muted-foreground">Apply for career progressions or lateral movements within company departments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job, idx) => (
          <Card key={idx} className="border rounded-2xl shadow-sm flex flex-col justify-between hover:border-violet-600 transition-colors">
            <CardHeader className="pb-3 border-b">
              <span className="text-[9px] uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 font-bold w-max">
                Full Time
              </span>
              <CardTitle className="text-sm font-bold mt-2">{job.title}</CardTitle>
              <CardDescription className="flex flex-wrap gap-3 mt-1 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {job.experience}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{job.desc}</p>
              <Button 
                onClick={() => handleApply(job.title)}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-5 rounded-xl shadow gap-1 text-xs"
              >
                Apply for Position <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
