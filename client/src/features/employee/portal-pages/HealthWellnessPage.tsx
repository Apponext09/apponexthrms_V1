import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Health & Wellness</h2>
          <p className="text-xs text-muted-foreground">Register for corporate health programs and wellness benefits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((p, i) => (
          <Card key={i} className="border rounded-2xl shadow-sm flex flex-col justify-between hover:border-violet-600 transition-colors">
            <CardHeader className="pb-3 border-b">
              <span className="text-[9px] uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 font-bold w-max">
                {p.schedule}
              </span>
              <CardTitle className="text-sm font-bold mt-2 flex items-center gap-1.5">
                <HeartPulse className="w-4.5 h-4.5 text-violet-500" /> {p.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <Button 
                onClick={() => handleRegister(p.title)}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-5 rounded-xl shadow gap-1 text-xs"
              >
                Register / Book slot
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
