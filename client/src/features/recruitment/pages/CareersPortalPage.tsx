import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, MapPin, DollarSign, Search, Calendar, CheckCircle } from 'lucide-react';
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

      // Then, link application
      return api.post('/recruitment/applications', {
        candidateId: candRes.data.data.id,
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
      toast.error(err.response?.data?.error || 'Failed to submit application');
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Careers Portal Header */}
      <div className="bg-slate-900 text-white py-12 px-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Join Our Outstanding Team</h1>
        <p className="text-slate-400 mt-2 text-md max-w-xl mx-auto">Discover open jobs, build your career, and solve hard problems alongside industry experts.</p>
        
        <div className="max-w-md mx-auto mt-6 flex items-center bg-white rounded-md px-3 py-2 text-slate-800 shadow">
          <Search className="h-4 w-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search open positions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none w-full text-xs text-slate-800 bg-transparent"
          />
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 py-10 flex-1">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Published Job Opportunities ({filteredJobs.length})</h2>

        {isLoading ? (
          <p className="text-center py-12 text-slate-500 text-xs">Loading open opportunities...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border text-slate-500 text-xs">
            No active job postings found matching search. Check back later!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((j: any) => (
              <Card key={j.id} className="hover:shadow-md transition-shadow border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-bold text-slate-800 flex justify-between items-start gap-2">
                    {j.job_title || j.jobTitle}
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 capitalize shrink-0 text-[10px]">
                      {j.job_type || j.jobType || 'Full-time'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-slate-500 line-clamp-3 leading-relaxed">
                    {j.job_description || j.jobDescription || 'No description provided.'}
                  </p>
                  
                  <div className="flex gap-4 text-slate-500 pt-2 border-t text-[10px]">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Remote / Location</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> {j.experience_level || j.experienceLevel || 'Mid Level'}</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => setSelectedJob(j)} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                      Apply Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* APPLY NOW DIALOG */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-md">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>Apply for {selectedJob.job_title || selectedJob.jobTitle}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleApply} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-[10px]">First Name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-[10px]">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-[10px]">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[10px]">Phone Number</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentCompany" className="text-[10px]">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={form.currentCompany}
                      onChange={(e) => setForm(f => ({ ...f, currentCompany: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalExperience" className="text-[10px]">Total Experience (Yrs)</Label>
                    <Input
                      id="totalExperience"
                      type="number"
                      value={form.totalExperience}
                      onChange={(e) => setForm(f => ({ ...f, totalExperience: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills" className="text-[10px]">Skills (comma separated)</Label>
                  <Input
                    id="skills"
                    value={form.skills}
                    onChange={(e) => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. React, Node.js, TypeScript"
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
