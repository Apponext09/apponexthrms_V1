import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Loader2,
  Clock,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useLmsIntegrationSettings,
  useSyncLmsPlatform,
} from '../api/useLms';
import type { LmsIntegrationSetting, LmsPlatform } from '../types/lms.types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLATFORM_META: Record<
  string,
  { label: string; color: string; description: string; logoText: string }
> = {
  udemy: {
    label: 'Udemy for Business',
    color: 'from-violet-600 to-purple-700',
    description: 'Import courses from your Udemy for Business subscription into the HRMS LMS catalog.',
    logoText: 'U',
  },
  coursera: {
    label: 'Coursera for Teams / Enterprise',
    color: 'from-blue-600 to-cyan-700',
    description: 'Import university-accredited courses, degrees & skill paths from Coursera Enterprise.',
    logoText: 'C',
  },
  linkedin: {
    label: 'LinkedIn Learning',
    color: 'from-sky-600 to-blue-800',
    description: 'Import personalized role pathways, expert micro-modules & certificates from LinkedIn Learning.',
    logoText: 'in',
  },
};

/**
 * LmsIntegrationImportModal
 *
 * Shown when an admin clicks "Import from Platform" in CourseManagementPage.
 * Lists all enabled platforms and lets the admin trigger an on-demand sync.
 * The sync result (imported/skipped counts) is shown inline after completion.
 */
export function LmsIntegrationImportModal({ open, onClose }: Props) {
  const { data: settings = [], isLoading } = useLmsIntegrationSettings();
  const syncMutation = useSyncLmsPlatform();

  const [syncResults, setSyncResults] = useState<
    Record<string, { imported: number; skipped: number; message: string }>
  >({});

  const enabledPlatforms = settings.filter((s) => s.isEnabled);

  const handleSync = async (platform: LmsPlatform) => {
    const result = await syncMutation.mutateAsync(platform);
    setSyncResults((prev) => ({
      ...prev,
      [platform]: { imported: result.imported, skipped: result.skipped, message: result.message },
    }));
  };

  const formatLastSynced = (ts: string | null) => {
    if (!ts) return 'Never synced';
    const d = new Date(ts);
    return `Last synced: ${d.toLocaleDateString('en-IN')} at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-600" />
              Import Courses from Platform
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sync courses from connected learning platforms into your LMS catalog.
            Employees can then enroll and track progress directly inside the HRMS portal.
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          )}

          {!isLoading && enabledPlatforms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No platforms are currently enabled.</p>
              <p className="text-xs mt-1">
                Go to <strong>LMS Settings → Integrations</strong> to enable a platform.
              </p>
            </div>
          )}

          {enabledPlatforms.map((setting: LmsIntegrationSetting) => {
            const meta = PLATFORM_META[setting.platform];
            const result = syncResults[setting.platform];
            const isSyncing =
              syncMutation.isPending &&
              (syncMutation.variables as LmsPlatform) === setting.platform;

            return (
              <div
                key={setting.platform}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
              >
                {/* Platform header */}
                <div className={`bg-gradient-to-r ${meta.color} p-4 flex items-center gap-3`}>
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                    {meta.logoText}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{meta.label}</h3>
                    <p className="text-white/70 text-xs mt-0.5">{meta.description}</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-xs">
                    Enabled
                  </Badge>
                </div>

                {/* Sync info + action */}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3.5 w-3.5" />
                    {formatLastSynced(setting.lastSyncedAt)}
                  </div>

                  {/* Sync result banner */}
                  {result && (
                    <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
                            {result.message}
                          </p>
                          {(result.imported > 0 || result.skipped > 0) && (
                            <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                              {result.imported} new • {result.skipped} updated
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!setting.isConfigured && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          API credentials not configured. Add them in{' '}
                          <strong>LMS Settings → Integrations</strong> to enable real sync.
                          A dry-run (0 courses) will still succeed.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => handleSync(setting.platform)}
                    disabled={isSyncing}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
                    size="sm"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Now from{' '}
                        {setting.platform.charAt(0).toUpperCase() + setting.platform.slice(1)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
