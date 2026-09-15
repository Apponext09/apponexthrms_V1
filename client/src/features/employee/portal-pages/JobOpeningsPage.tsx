import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Briefcase, MapPin, Building2, Clock, Calendar, CheckCircle2, 
  Search, ArrowRight, Sparkles, FileText, Send, UserCheck, AlertCircle, 
  ExternalLink, Layers, Check, Upload, Paperclip, X, ShieldCheck, FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useInternalJobs, useMyIjpApplications, useApplyToInternalJob, type InternalJob } from '@/features/recruitment/hooks/useIjp';
import { formatApiError } from '@/lib/apiError';

import { useAuthStore } from '@/features/auth/store/authStore';

export default function JobOpeningsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'openings' | 'applications'>('openings');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('all');
  
  // Job detail & apply modal state
  const [selectedJob, setSelectedJob] = useState<InternalJob | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [reasonForMove, setReasonForMove] = useState('Career Growth & Promotion');
  const [availability, setAvailability] = useState('1 Month (Standard Notice)');
  const [relevantExp, setRelevantExp] = useState('');
  const [currentProjects, setCurrentProjects] = useState('');
  const [managerInformed, setManagerInformed] = useState(true);
  
  // Resume upload state
  const [resumeBase64, setResumeBase64] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Queries & Mutations
  const { data: jobsData, isLoading: isLoadingJobs } = useInternalJobs({
    search: searchQuery || undefined,
    pageSize: 100,
  });

  const { data: myApplications = [], isLoading: isLoadingApplications } = useMyIjpApplications();
  const applyMutation = useApplyToInternalJob();

  const jobs = jobsData?.items || [];

  // Map of job IDs already applied to by this employee
  const appliedJobIds = useMemo(() => {
    return new Set(myApplications.map((app) => app.jobId || app.job_id));
  }, [myApplications]);

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      const dept = j.departmentName || j.department_name;
      if (dept) set.add(dept);
    });
    return Array.from(set);
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const dept = job.departmentName || job.department_name;
      const empType = (job.employmentType || job.employment_type || '').toLowerCase();
      if (selectedDepartment !== 'all' && dept !== selectedDepartment) {
        return false;
      }
      if (selectedEmploymentType !== 'all' && empType !== selectedEmploymentType.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [jobs, selectedDepartment, selectedEmploymentType]);

  const handleOpenApply = (job: InternalJob) => {
    setSelectedJob(job);
    setCoverLetter('');
    setReasonForMove('Career Growth & Promotion');
    setAvailability('1 Month (Standard Notice)');
    setRelevantExp('');
    setCurrentProjects('');
    setManagerInformed(true);
    setResumeBase64(null);
    setResumeFileName('');
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Maximum resume size is 10 MB.');
      return;
    }

    const reader = new FileReader();
    setIsUploadingResume(true);
    reader.onload = () => {
      setResumeBase64(reader.result as string);
      setResumeFileName(file.name);
      setIsUploadingResume(false);
      toast.success(`Resume "${file.name}" attached successfully`);
    };
    reader.onerror = () => {
      setIsUploadingResume(false);
      toast.error('Failed to read resume file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const res = await applyMutation.mutateAsync({
        jobId: selectedJob.id,
        coverLetter: coverLetter.trim() || undefined,
        reasonForMove,
        availability,
        relevantExperienceYears: relevantExp.trim() || undefined,
        currentProjects: currentProjects.trim() || undefined,
        managerInformed,
        resumeFile: resumeBase64 || undefined,
        resumeName: resumeFileName || undefined,
      });

      const title = selectedJob.jobTitle || selectedJob.job_title || 'Position';
      toast.success(res?.message || `Application submitted for "${title}"!`);
      setSelectedJob(null);
      setCoverLetter('');
      setResumeBase64(null);
      setResumeFileName('');
      setActiveTab('applications');
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to submit internal application'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Internal Career Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Internal Job Postings (IJP)
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed max-w-2xl">
            Advance your career within our organization. Explore open requisitions across departments, apply for promotions or lateral moves, and track your internal application status.
          </p>
        </div>

        {/* Decorative Background Glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Open Internal Roles</span>
            <div className="text-2xl font-black text-foreground">{jobs.length}</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Hiring Departments</span>
            <div className="text-2xl font-black text-foreground">{departments.length || 1}</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4.5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">My Applications</span>
            <div className="text-2xl font-black text-foreground">{myApplications.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border/60 w-fit">
        <button
          onClick={() => setActiveTab('openings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'openings'
              ? 'bg-background text-foreground shadow-xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-primary" />
          Explore Openings ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-background text-foreground shadow-xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          My Applications ({myApplications.length})
        </button>
      </div>

      {/* TAB 1: EXPLORE OPENINGS */}
      {activeTab === 'openings' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search job title, code, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-border bg-background text-xs rounded-xl shadow-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-10 px-3 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedEmploymentType}
                onChange={(e) => setSelectedEmploymentType(e.target.value)}
                className="h-10 px-3 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Modes</option>
                <option value="onsite">Onsite</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Jobs List Grid */}
          {isLoadingJobs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-card border border-border/70 rounded-2xl p-6 h-64 animate-pulse space-y-4">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-16 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Internal Openings Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                There are currently no internal vacancies matching your search or filters. Check back soon for new career openings!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => {
                const hasApplied = appliedJobIds.has(job.id);
                const title = job.jobTitle || job.job_title || job.title || 'Untitled Opening';
                const code = job.jobCode || job.job_code || `JOB-${job.id}`;
                const description = job.jobDescription || job.job_description || job.description || '';
                const department = job.departmentName || job.department_name;
                const designation = job.designationName || job.designation_name;
                const location = job.locationName || job.location_name;
                const empType = job.employmentType || job.employment_type || 'onsite';
                const jType = job.jobType || job.job_type || 'full_time';
                const expiry = job.expiryDate || job.expiry_date;
                const positions = job.noOfPositions || job.no_of_positions || 1;

                return (
                  <Card 
                    key={job.id} 
                    className="border border-border/80 rounded-2xl shadow-2xs bg-card flex flex-col justify-between hover:border-blue-500/40 hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    <div>
                      {/* Card Header */}
                      <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                {code}
                              </span>
                              {positions > 1 && (
                                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  {positions} Openings
                                </span>
                              )}
                            </div>
                            <CardTitle className="text-base font-black text-foreground group-hover:text-primary transition-colors">
                              {title}
                            </CardTitle>
                          </div>

                          {hasApplied ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold uppercase px-2.5 py-1 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Applied
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold capitalize bg-background border-border text-foreground">
                              {empType}
                            </Badge>
                          )}
                        </div>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground font-medium">
                          {department && (
                            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-border/60">
                              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              {department}
                            </span>
                          )}
                          {designation && (
                            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-border/60">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              {designation}
                            </span>
                          )}
                          {location && (
                            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-border/60">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {location}
                            </span>
                          )}
                          {jType && (
                            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-border/60 capitalize">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {jType.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </CardHeader>

                      {/* Card Body */}
                      <CardContent className="p-5 space-y-4">
                        <div 
                          className="text-xs text-muted-foreground line-clamp-3 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: description || '<p class="italic">No description provided.</p>' }}
                        />

                        {/* Skills Preview */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {job.skills.slice(0, 4).map((skill, idx) => (
                              <span 
                                key={idx} 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 4 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 text-muted-foreground">
                                +{job.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Card Footer */}
                    <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-border/40 mt-auto">
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {expiry ? (
                          <span>Deadline: <strong className="text-foreground">{new Date(expiry).toLocaleDateString()}</strong></span>
                        ) : (
                          <span>Open for applications</span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleOpenApply(job)}
                        variant={hasApplied ? "outline" : "default"}
                        size="sm"
                        className={`h-9 px-4 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs ${
                          hasApplied 
                            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' 
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {hasApplied ? (
                          <>View Details <Check className="w-3.5 h-3.5" /></>
                        ) : (
                          <>View & Apply <ArrowRight className="w-3.5 h-3.5" /></>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {isLoadingApplications ? (
            <div className="bg-card border border-border/80 rounded-2xl p-8 text-center text-xs text-muted-foreground">
              Loading your applications...
            </div>
          ) : myApplications.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Applications Submitted</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You haven't applied to any internal job postings yet. Explore open roles in the first tab to submit your interest!
              </p>
              <Button 
                onClick={() => setActiveTab('openings')}
                className="text-xs font-bold rounded-xl h-9 mt-2 bg-primary text-primary-foreground"
              >
                Browse Openings
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => {
                const appId = app.applicationId || app.application_id || app.id;
                const title = app.jobTitle || app.job_title || 'Position';
                const code = app.jobCode || app.job_code || `JOB-${app.jobId || app.job_id}`;
                const status = app.applicationStatus || app.application_status || 'applied';
                const appliedDate = app.appliedAt || app.applied_at;
                const dept = app.departmentName || app.department_name;
                const note = app.coverLetter || app.cover_letter;
                const resumeUrl = app.resumeUrl || app.resume_url;
                const managerStatus = app.managerApprovalStatus || app.manager_approval_status;
                const managerComments = app.managerComments || app.manager_comments;

                return (
                  <div 
                    key={appId}
                    className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs hover:border-border transition-colors flex flex-col items-start gap-4"
                  >
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                            {code}
                          </span>
                          <h4 className="text-sm font-bold text-foreground">{title}</h4>
                        </div>

                        {/* Application / Manager Approval Status Badge */}
                        <div className="flex items-center gap-2">
                          {(status === 'pending_manager' || managerStatus === 'Pending' || managerStatus === 'pending' || (!managerStatus && status === 'applied')) ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> Pending Manager Clearance (NOC)
                            </span>
                          ) : (status === 'rejected' || managerStatus === 'Rejected' || managerStatus === 'rejected') ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3.5 h-3.5" /> Manager Declined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Manager Approved & Active in Resume Bank
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {dept && (
                          <span>Department: <strong className="text-foreground">{dept}</strong></span>
                        )}
                        {appliedDate && (
                          <span>Applied on: <strong className="text-foreground">{new Date(appliedDate).toLocaleDateString()}</strong></span>
                        )}
                        {resumeUrl && (
                          <a 
                            href={resumeUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> View Attached Resume <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Manager Review Notes if any */}
                      {managerComments && (
                        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Reporting Manager Endorsement / Remarks:
                          </span>
                          <p className="text-muted-foreground">{managerComments}</p>
                        </div>
                      )}

                      {note && (
                        <div className="text-xs bg-muted/40 p-3.5 rounded-xl border border-border/50 text-muted-foreground whitespace-pre-line leading-relaxed">
                          <span className="font-bold text-foreground block text-[11px] mb-1">Application Dossier & Details:</span>
                          {note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW JOB & APPLY DIALOG */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-border/80 shadow-2xl">
          {selectedJob && (() => {
            const title = selectedJob.jobTitle || selectedJob.job_title || selectedJob.title || 'Untitled Opening';
            const code = selectedJob.jobCode || selectedJob.job_code || `JOB-${selectedJob.id}`;
            const description = selectedJob.jobDescription || selectedJob.job_description || selectedJob.description || '';
            const department = selectedJob.departmentName || selectedJob.department_name;
            const designation = selectedJob.designationName || selectedJob.designation_name;
            const location = selectedJob.locationName || selectedJob.location_name;
            const empType = selectedJob.employmentType || selectedJob.employment_type || 'onsite';
            const jType = selectedJob.jobType || selectedJob.job_type || 'full_time';
            const expLevel = selectedJob.experienceLevel || selectedJob.experience_level;
            const positions = selectedJob.noOfPositions || selectedJob.no_of_positions || 1;
            const isApplied = appliedJobIds.has(selectedJob.id);

            return (
              <>
                {/* Header */}
                <DialogHeader className="px-6 py-5 border-b border-border/60 bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {code}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Internal Job Opening (IJP)
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-black text-foreground">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Review job requirements and submit your internal transfer/promotion application.
                  </DialogDescription>
                </DialogHeader>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-card flex-1 space-y-6">
                  {/* Meta details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/40 rounded-xl border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Department</span>
                      <span className="font-bold text-foreground">{department || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Designation</span>
                      <span className="font-bold text-foreground">{designation || 'Open Role'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Location</span>
                      <span className="font-bold text-foreground">{location || 'Headquarters'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Work Mode</span>
                      <span className="font-bold text-foreground capitalize">{empType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Job Type</span>
                      <span className="font-bold text-foreground capitalize">{jType.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Experience Level</span>
                      <span className="font-bold text-foreground capitalize">{expLevel || 'Mid Level'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Open Positions</span>
                      <span className="font-bold text-foreground">{positions}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-1.5">
                      Job Description & Responsibilities
                    </h4>
                    <div 
                      className="text-xs leading-relaxed text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: description || '<p>No detailed description provided.</p>' }}
                    />
                  </div>

                  {/* Application Section */}
                  {isApplied ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div>You have already submitted an application for this position.</div>
                        <div className="text-[11px] text-muted-foreground font-normal">Our talent acquisition team and hiring managers will review your profile.</div>
                      </div>
                    </div>
                  ) : (
                    <form id="ijp-apply-form" onSubmit={handleApplySubmit} className="space-y-4 pt-4 border-t border-border/60">
                      <div className="p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/20 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">Applying as: {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}</span>
                            <span className="text-[11px] text-muted-foreground">First step: Clearance endorsement by your reporting manager, then forwarded to ATS & Resume Screen Bank.</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                          Manager NOC & IJP
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Primary Reason for Applying *
                          </label>
                          <select
                            value={reasonForMove}
                            onChange={(e) => setReasonForMove(e.target.value)}
                            className="w-full h-10 px-3 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                          >
                            <option value="Career Growth & Promotion">Career Growth & Promotion</option>
                            <option value="Skill & Technical Alignment">Skill & Technical Alignment</option>
                            <option value="Department / Team Transfer">Department / Team Transfer</option>
                            <option value="Relocation / Location Change">Relocation / Location Change</option>
                            <option value="Higher Responsibilities & Challenge">Higher Responsibilities & Challenge</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Transition Availability / Handover Notice *
                          </label>
                          <select
                            value={availability}
                            onChange={(e) => setAvailability(e.target.value)}
                            className="w-full h-10 px-3 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                          >
                            <option value="Immediate (Within 15 Days)">Immediate (Within 15 Days)</option>
                            <option value="1 Month (Standard Notice)">1 Month (Standard Notice)</option>
                            <option value="45 - 60 Days">45 - 60 Days</option>
                            <option value="Flexible upon transition handover">Flexible upon transition handover</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Relevant Experience in this Domain
                          </label>
                          <Input
                            placeholder="e.g. 2.5 years in Backend / DevOps"
                            value={relevantExp}
                            onChange={(e) => setRelevantExp(e.target.value)}
                            className="h-10 text-xs rounded-xl bg-background border-border"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Current Company Projects Highlight
                          </label>
                          <Input
                            placeholder="e.g. Lead Core API Migration, HRMS Billing Engine"
                            value={currentProjects}
                            onChange={(e) => setCurrentProjects(e.target.value)}
                            className="h-10 text-xs rounded-xl bg-background border-border"
                          />
                        </div>
                      </div>

                      {/* Resume / CV Upload Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-primary" /> Upload Updated Resume / CV (PDF, DOCX)
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">Max 10 MB</span>
                        </label>
                        
                        {resumeFileName ? (
                          <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-bold text-foreground truncate">{resumeFileName}</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded">Ready</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResumeBase64(null);
                                setResumeFileName('');
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">Click to upload your resume</span>
                            <span className="text-[10px] text-muted-foreground">Supported formats: PDF, DOC, DOCX</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={handleResumeFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Statement of Interest / Why are you the right fit?</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <Textarea
                          placeholder="Share your interest in this role, key achievements, or how your background aligns with the responsibilities..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows={3}
                          className="text-xs rounded-xl bg-background border-border resize-none"
                        />
                      </div>

                      <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="manager-informed"
                          checked={managerInformed}
                          onChange={(e) => setManagerInformed(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="manager-informed" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer select-none">
                          I confirm that I have informed / will inform my current reporting manager regarding this internal job application in accordance with company IJP policies.
                        </label>
                      </div>
                    </form>
                  )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setSelectedJob(null)}
                    className="rounded-xl text-xs font-bold h-9"
                  >
                    Close
                  </Button>

                  {!isApplied && (
                    <Button
                      type="submit"
                      form="ijp-apply-form"
                      disabled={applyMutation.isPending || isUploadingResume}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs h-9 gap-1.5 shadow-xs"
                    >
                      {applyMutation.isPending ? (
                        'Submitting...'
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Submit Internal Application
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
