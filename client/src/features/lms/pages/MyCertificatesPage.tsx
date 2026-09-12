import React, { useState } from 'react';
import {
  Award,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMyLmsCertificates } from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmployeeLmsHeader } from '../components/EmployeeLmsHeader';
import type { LmsCertificate } from '../types/lms.types';

export function MyCertificatesPage() {
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : 0;

  const { data: certificates = [], isLoading } = useMyLmsCertificates(employeeId);
  const [selectedCert, setSelectedCert] = useState<LmsCertificate | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* ── LMS Academy Header ─────────────────────────────────── */}
      <EmployeeLmsHeader
        title="My Verified Course Certificates & Badges"
        subtitle="Digital credentials and verified certificates awarded upon passing course examinations with qualifying scores."
      />

      {/* Certificates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40 rounded-xl" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="py-20 text-center bg-card border border-border/80 rounded-xl shadow-2xs">
          <Award className="w-12 h-12 mx-auto text-amber-500/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Certificates Earned Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Complete your enrolled courses and pass the knowledge examinations to earn certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className="border border-border/80 rounded-xl shadow-2xs hover:border-amber-500/40 transition-all bg-card flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                    VERIFIED
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground">{cert.courseTitle || (cert as any).course_title}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Credential ID: {cert.certificateNumber || (cert as any).certificate_number}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{' '}
                    {new Date(cert.issuedOn || (cert as any).issued_on).toLocaleDateString()}
                  </span>
                  {cert.score && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Score: {cert.score}%
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/60">
                <Button
                  size="sm"
                  onClick={() => setSelectedCert(cert)}
                  className="w-full h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  <Award className="w-3.5 h-3.5" /> View Digital Certificate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Certificate Preview Modal ─────────────────────────── */}
      <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
        <DialogContent className="max-w-3xl p-6 print:p-0 print:border-none">
          {selectedCert && (
            <div className="space-y-6">
              {/* Printable Certificate Frame */}
              <div
                id="certificate-print-area"
                className="border-8 border-amber-600/30 rounded-2xl p-8 bg-gradient-to-b from-amber-500/5 via-card to-amber-500/5 text-center space-y-4 relative overflow-hidden shadow-lg"
              >
                <div className="flex justify-center items-center gap-2 text-amber-600 font-bold uppercase tracking-widest text-xs">
                  <Sparkles className="w-4 h-4" /> Certificate of Completion <Sparkles className="w-4 h-4" />
                </div>

                <h2 className="text-3xl font-black text-foreground tracking-tight pt-2">
                  ApponextHRMS Learning Academy
                </h2>

                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  This is proudly presented to
                </p>

                <h1 className="text-2xl font-black text-primary border-b border-border/80 pb-2 inline-block px-8">
                  {selectedCert.employeeName || (selectedCert as any).employee_name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Valued Employee'}
                </h1>

                <p className="text-xs text-muted-foreground max-w-lg mx-auto pt-2">
                  for successfully completing all curriculum modules, practical assessments, and demonstrating mastery in
                </p>

                <h3 className="text-lg font-black text-foreground">
                  {selectedCert.courseTitle || (selectedCert as any).course_title}
                </h3>

                <div className="pt-6 flex justify-between items-center text-xs text-muted-foreground border-t border-border/60">
                  <div className="text-left">
                    <p className="font-bold text-foreground">Verified Credential</p>
                    <p className="font-mono text-[10px]">{selectedCert.certificateNumber || (selectedCert as any).certificate_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">Date Awarded</p>
                    <p className="font-mono text-[10px]">
                      {new Date(selectedCert.issuedOn || (selectedCert as any).issued_on).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 print:hidden">
                <Button variant="outline" size="sm" onClick={() => setSelectedCert(null)}>
                  Close
                </Button>
                <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-primary font-bold">
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
