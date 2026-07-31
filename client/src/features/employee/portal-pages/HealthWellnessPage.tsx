import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';

export default function HealthWellnessPage() {
  const plans = [
    { title: 'Annual Health Checkup', schedule: 'Scheduled on Aug 15', desc: 'Complimentary full-body checkup package at partner hospitals.', status: 'Active' },
    { title: 'Mental Health Counseling', schedule: 'Available 24x7', desc: 'Confidential support, sessions, and guidance with expert therapists.', status: 'Active' },
  ];

  const handleRegister = (title: string) => {
    toast.success(`Registered successfully for: "${title}". Details sent to your email.`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Health & Wellness
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Benefits
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register for corporate health programs, medical checkups, and wellness benefits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map((p, i) => (
          <Card key={i} className="border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <div className="flex justify-between items-center mb-1">
                <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                  {p.schedule}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-primary shrink-0" /> {p.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <Button 
                onClick={() => handleRegister(p.title)}
                className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs"
              >
                Register / Book Slot
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
