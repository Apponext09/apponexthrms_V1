import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Smartphone, Fingerprint, Save, Sliders, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import type { Employee } from '@/types';

interface EmployeeCheckInSettingProps {
  employee: Employee;
  /** If true, settings are read-only showing status only (employee self-view). Admin side gets edit controls. */
  readOnly?: boolean;
}

export function EmployeeCheckInSetting({ employee, readOnly = false }: EmployeeCheckInSettingProps) {
  // 3 Core Toggle States
  const [webCheckIn, setWebCheckIn] = useState(true);
  const [mobileCheckIn, setMobileCheckIn] = useState(true);
  const [biometricCheckIn, setBiometricCheckIn] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast.success('Check-in / out settings updated successfully');
    }, 250);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      <Card className="w-full border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Check In Out Setting
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {readOnly
                  ? `Your current check-in & check-out access authorizations.`
                  : `Configure check-in and check-out authorization modes for ${employee.firstName}.`}
              </CardDescription>
            </div>

            {/* Save Settings button — strictly Admin Side ONLY (!readOnly) */}
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" /> Save Settings
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Informational banner on Employee Portal view */}
          {readOnly && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-blue-500/8 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-400 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              Check-in access settings are configured by your Organization Admin.
            </div>
          )}

          {/* 3-Column Balanced Compact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Web Check In/Out */}
            <div className="p-5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  {webCheckIn ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Web Check In/Out</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clock in and clock out access via web browser portal.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Portal Access</span>
                {readOnly ? (
                  /* Employee Side: Status Display Only (No switch) */
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                  </span>
                ) : (
                  /* Admin Side: Interactive Switch Control */
                  <Switch
                    checked={webCheckIn}
                    onCheckedChange={setWebCheckIn}
                    aria-label="Toggle web check-in access"
                  />
                )}
              </div>
            </div>

            {/* Card 2: Mobile Check In/Out */}
            <div className="p-5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  {mobileCheckIn ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Mobile Check In/Out</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clock in and clock out access via mobile application.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Mobile Access</span>
                {readOnly ? (
                  /* Employee Side: Status Display Only (No switch) */
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                  </span>
                ) : (
                  /* Admin Side: Interactive Switch Control */
                  <Switch
                    checked={mobileCheckIn}
                    onCheckedChange={setMobileCheckIn}
                    aria-label="Toggle mobile check-in access"
                  />
                )}
              </div>
            </div>

            {/* Card 3: Biometric Check In/Out */}
            <div className="p-5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  {biometricCheckIn ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Biometric Check In/Out</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Punch access via physical biometric hardware scanners.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Hardware Punch</span>
                {readOnly ? (
                  /* Employee Side: Status Display Only (No switch) */
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                  </span>
                ) : (
                  /* Admin Side: Interactive Switch Control */
                  <Switch
                    checked={biometricCheckIn}
                    onCheckedChange={setBiometricCheckIn}
                    aria-label="Toggle biometric check-in access"
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
