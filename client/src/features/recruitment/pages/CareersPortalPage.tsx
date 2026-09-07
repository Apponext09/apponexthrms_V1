import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, MapPin, Search, Calendar, CheckCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';


export const CareersPortalPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  
  // Application Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    totalExperience: '',
    skills: '',
    notes: '',
  });

  // Query published jobs
  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ['open-jobs'],
    queryFn: async () => {
      const res = await api.get('/recruitment/jobs');
      const items = res.data?.data?.items || res.data?.data || [];
      return items.filter((j: any) => j.status === 'published' || j.status === 'active');
    }
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (payload: any) => {
      // First, create the candidate
      const candRes = await api.post('/recruitment/candidates', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        currentCompany: form.currentCompany || null,
        yearsOfExperience: form.totalExperience ? parseFloat(form.totalExperience) : null,
        skills: form.skills || null,
        source: 'direct_apply',
      });


      if (!candRes.data?.success) throw new Error('Failed to create candidate profile');
      const candidateId = candRes.data.data.id;

      // Index in resume_bank so it appears in Resume Source Screen Bank & ATS Screening
      await api.post('/recruitment/resume-bank', {
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        contact: form.phone || undefined,
        company: form.currentCompany || undefined,
        totalExp: form.totalExperience || undefined,
        skills: form.skills || undefined,
        jobId: selectedJob.id,
        position: selectedJob.job_title || selectedJob.jobTitle || 'Software Engineer',
        source: 'Career Portal',
      }).catch(() => {});

      // Then, link application
      return api.post('/recruitment/applications', {
        candidateId,
        jobId: selectedJob.id,
        appliedFromSource: 'Careers Portal',
      });
    },
    onSuccess: () => {
      toast.success('Your application has been submitted successfully!');
      setSelectedJob(null);
      setShowSuccessDialog(true);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        currentCompany: '',
        totalExperience: '',
        skills: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      const errObj = err.response?.data?.error;
      const msg = typeof errObj === 'string' ? errObj : errObj?.message || err.response?.data?.message || 'Failed to submit application';
      toast.error(msg);
    }
  });

  const jobs = jobsResponse || [];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;
    submitApplicationMutation.mutate({});
  };

  const filteredJobs = jobs.filter((j: any) => {
    const query = searchQuery.toLowerCase();
    const title = (j.job_title || j.jobTitle || '').toLowerCase();
    const desc = (j.job_description || j.jobDescription || '').toLowerCase();
    return title.includes(query) || desc.includes(query);
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Careers Portal Header Banner */}
      <div className="bg-card border-b border-border/80 py-16 px-6 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" /> Career Opportunities
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
            Build the Future With Us
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Discover impactful career paths, collaborate with exceptional teams, and help build world-class enterprise software.
          </p>
          
          <div className="max-w-md mx-auto mt-6 flex items-center bg-background rounded-2xl px-4 py-2.5 border border-border shadow-xs">
            <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search positions, teams, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none w-full text-xs text-foreground bg-transparent placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 py-12 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-foreground">Open Positions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredJobs.length} active opportunities available</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Loading open opportunities...</span>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/80 text-muted-foreground text-xs p-8">
            No active job postings found matching search. Check back soon for new openings!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((j: any) => (
              <Card key={j.id} className="bg-card border-border/80 shadow-2xs hover:shadow-xs transition-all rounded-2xl overflow-hidden flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-extrabold text-foreground flex justify-between items-start gap-2">
                    <span>{j.job_title || j.jobTitle}</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {j.job_type || j.jobType || 'Full-time'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs flex-1 flex flex-col justify-between">
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {j.job_description || j.jobDescription || 'No description provided.'}
                  </p>
                  
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" /> {j.location || 'Remote / Hybrid'}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-primary" /> {j.experience_level || j.experienceLevel || 'Mid Level'}</span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button onClick={() => setSelectedJob(j)} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs h-8 rounded-xl shadow-xs cursor-pointer">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* APPLY NOW DIALOG */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-md bg-card border-border rounded-2xl">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-black text-foreground">Apply for {selectedJob.job_title || selectedJob.jobTitle}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleApply} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-xs font-bold text-foreground">First Name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-xs font-bold text-foreground">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-bold text-foreground">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      className="h-9 text-xs rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-bold text-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="currentCompany" className="text-xs font-bold text-foreground">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={form.currentCompany}
                      onChange={(e) => setForm(f => ({ ...f, currentCompany: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="totalExperience" className="text-xs font-bold text-foreground">Experience (Yrs)</Label>
                    <Input
                      id="totalExperience"
                      type="number"
                      value={form.totalExperience}
                      onChange={(e) => setForm(f => ({ ...f, totalExperience: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="skills" className="text-xs font-bold text-foreground">Skills (comma separated)</Label>
                  <Input
                    id="skills"
                    value={form.skills}
                    onChange={(e) => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. React, Node.js, TypeScript"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-[10px]">Cover Letter / Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full p-2 border rounded bg-background"
                    rows={3}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedJob(null)}>Cancel</Button>
                  <Button type="submit" disabled={submitApplicationMutation.isPending} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                    {submitApplicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* SUCCESS CONFIRMATION DIALOG */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm text-center p-6 space-y-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-lg text-slate-800">Application Submitted!</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            Thank you for applying. We have received your application successfully, and our recruitment team will review it shortly.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
