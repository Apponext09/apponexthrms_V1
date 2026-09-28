import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserMinus,
} from "lucide-react";
import { apiClient } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import { useEmployee } from "../hooks/useEmployees";
import type { EmployeeLifecycleDetails } from "@/features/HR/EmployeeLifecycle/api/lifecycleApi";
import { ChronologicalLifecycleFlow } from "@/features/HR/EmployeeLifecycle/components/ChronologicalLifecycleFlow";

// Keep status colors restrained and meaningful across the employee portal.
const STAGES: Record<string, { label: string; badge: string; dot: string }> = {
  candidate: {
    label: "Candidate",
    badge:
      "dark:border-[#526880] dark:bg-[#263c5e] dark:text-[#c8ddff] border-[#d6e5f7] bg-[#eff6ff] text-[#315b91]",
    dot: "dark:bg-[#52709b] bg-[#6385b6]",
  },
  onboarding: {
    label: "Onboarding",
    badge:
      "border-[#c9e0fa] bg-[#eaf4ff] text-[#1d62a5] dark:border-[#526880] dark:bg-[#1c4261] dark:text-[#add8ff]",
    dot: "bg-[#3182ce] dark:bg-[#65a9e1]",
  },
  probation: {
    label: "Probation",
    badge:
      "dark:border-[#526880] dark:bg-[#493a24] dark:text-[#f3d08a] border-[#f4dfb0] bg-[#fff8e9] text-[#95651a]",
    dot: "dark:bg-[#dfad52] bg-[#d99b32]",
  },
  active: {
    label: "Active",
    badge:
      "dark:border-[#526880] dark:bg-[#1a4539] dark:text-[#9ce9be] border-[#bee8d5] bg-[#e9f8ef] text-[#167451]",
    dot: "dark:bg-[#54c492] bg-[#29a574]",
  },
  notice: {
    label: "Notice period",
    badge:
      "dark:border-[#526880] dark:bg-[#493823] dark:text-[#f3d08a] border-[#f2dfb8] bg-[#fff7e7] text-[#996219]",
    dot: "dark:bg-[#dfad52] bg-[#d79530]",
  },
  exit: {
    label: "Exited",
    badge:
      "dark:border-[#526880] dark:bg-[#4a2e39] dark:text-[#ffc0c0] border-[#f3d0d0] bg-[#fff0f0] text-[#aa4444]",
    dot: "dark:bg-[#df8282] bg-[#d06565]",
  },
  alumni: {
    label: "Alumni",
    badge:
      "dark:border-[#526880] dark:bg-[#2b3d51] dark:text-[#ced9e6] border-[#dbe4ef] bg-[#f2f6fb] text-[#55677e]",
    dot: "dark:bg-[#9aadc3] bg-[#8796aa]",
  },
};

const formatDate = (value?: string | null) => {
  if (!value || value === "N/A") return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-foreground">
          {value || "Not assigned"}
        </p>
      </div>
    </div>
  );
}

const cardClass =
  "rounded-2xl border border-border bg-card shadow-sm";

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-[15px] font-bold tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function MyLifecyclePage() {
  const { employee, isLoading: isResolvingEmployee } = useEmployee("me");
  const [details, setDetails] = useState<EmployeeLifecycleDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resignationOpen, setResignationOpen] = useState(false);
  const [resignationDate, setResignationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [resignationSubject, setResignationSubject] = useState("");
  const [resignationReason, setResignationReason] = useState("");
  const [resignationDescription, setResignationDescription] = useState("");
  const [isSubmittingResignation, setIsSubmittingResignation] = useState(false);
  const fetchLifecycle = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      // Server resolves the linked employee from the authenticated account. This works for all self-service roles.
      const response = await apiClient.get("/hr/lifecycle/employees/me");
      setDetails(response.data?.data ?? null);
    } catch (err: any) {
      setDetails(null);
      setError(
        err?.response?.data?.message ||
          "Your lifecycle information could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isResolvingEmployee) fetchLifecycle();
  }, [fetchLifecycle, isResolvingEmployee, employee?.id]);
  if (isResolvingEmployee || isLoading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-background p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-5 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-muted-foreground shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />{" "}
          Loading your lifecycle…
        </div>
      </div>
    );
  if (error || !details)
    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-background p-5">
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center font-['Plus_Jakarta_Sans'] shadow-sm">
          <span className="rounded-xl bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-bold text-foreground">
            Lifecycle unavailable
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {error ||
              "No lifecycle record is available for your employee profile."}
          </p>
          <Button
            variant="outline"
            onClick={fetchLifecycle}
            className="mt-2 gap-2 rounded-lg border-border text-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );

  const {
    profile,
    onboarding,
    offboarding,
    transfers = [],
    lifecycleEvents = [],
    chronologicalMilestones = [],
  } = details;
  const stage = STAGES[profile.lifecycleStatus] || STAGES.active;
  const actualOnboarding = onboarding?.id ? onboarding : null;
  const canResign =
    !offboarding?.resignationDate &&
    !["notice", "exit", "alumni"].includes(profile.lifecycleStatus || "");
  const submitResignation = async () => {
    if (
      !resignationSubject.trim() ||
      !lastWorkingDay ||
      !resignationReason.trim() ||
      !resignationDescription.trim()
    ) {
      showToast.error(
        "Missing details",
        "Please provide a subject, last working day, reason, and description.",
      );
      return;
    }
    try {
      setIsSubmittingResignation(true);
      await apiClient.post("/hr/lifecycle/employees/me/resignation", {
        subject: resignationSubject,
        resignationDate,
        lastWorkingDay,
        reason: resignationReason,
        description: resignationDescription,
      });
      showToast.success(
        "Resignation submitted",
        "Your resignation is pending HR or Admin approval.",
      );
      setResignationOpen(false);
      await fetchLifecycle();
    } catch (err: any) {
      showToast.error(
        "Could not submit resignation",
        err?.response?.data?.message || "Please try again.",
      );
    } finally {
      setIsSubmittingResignation(false);
    }
  };
  return (
    <main className="my-lifecycle min-h-screen bg-background px-4 py-5 font-['Plus_Jakarta_Sans'] text-foreground sm:px-6 sm:py-7 lg:px-9">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); .my-lifecycle, .my-lifecycle * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }`}</style>
      <div className="mx-auto max-w-[1200px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              Employee self service / Employment
            </p>
            <h1 className="text-[26px] font-bold tracking-[-0.04em] text-foreground sm:text-[30px]">
              My Lifecycle
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              A clear view of your role, milestones, and employment history.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchLifecycle}
            className="h-9 w-fit gap-2 rounded-lg border-border bg-card text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh records
          </Button>
        </header>

        <section
          className={`${cardClass} overflow-hidden`}
          aria-label="Current employment status"
        >
          <div className="h-1 bg-[#347fc3]" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Your employment overview
                </p>
                <h2 className="mt-1 break-words text-xl font-bold tracking-[-0.03em] text-foreground sm:text-[23px]">
                  {profile.name ||
                    `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                    "Employee"}
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {profile.designationName || "Employee"}
                  {profile.departmentName ? ` · ${profile.departmentName}` : ""}
                </p>
                {profile.employeeCode && (
                  <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                    Employee ID: {profile.employeeCode}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <span className="text-[11px] font-medium text-muted-foreground">
                Current status
              </span>
              <Badge
                variant="outline"
                className={`gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-none ${stage.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                {stage.label}
              </Badge>
            </div>
          </div>
        </section>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Employment at a glance"
        >
          <Card className={cardClass}>
            <CardContent className="p-4">
              <Detail
                icon={CalendarDays}
                label="Date joined"
                value={formatDate(profile.joiningDate)}
              />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4">
              <Detail
                icon={Briefcase}
                label="Current role"
                value={profile.designationName || "Employee"}
              />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4">
              <Detail
                icon={Building2}
                label="Department"
                value={profile.departmentName}
              />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4">
              <Detail
                icon={ArrowLeftRight}
                label="Transfers recorded"
                value={String(profile.transfersCount ?? transfers.length)}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <Card className={cardClass}>
            <CardContent className="p-5 sm:p-6">
              <SectionHeading
                icon={Building2}
                title="Current assignment"
                description="The latest details on your employee record."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail
                  icon={Building2}
                  label="Company"
                  value={profile.companyName}
                />
                <Detail
                  icon={MapPin}
                  label="Work location"
                  value={profile.locationName}
                />
                <Detail
                  icon={UserRound}
                  label="Reporting manager"
                  value={
                    profile.reportingManager || profile.reportingManagerName
                  }
                />
                <Detail
                  icon={ShieldCheck}
                  label="Lifecycle status"
                  value={stage.label}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-5 sm:p-6">
              <SectionHeading
                icon={CheckCircle2}
                title="Onboarding progress"
                description="Items confirmed on your HR record."
              />
              {actualOnboarding ? (
                <div className="space-y-0 divide-y divide-border">
                  <div className="flex items-center justify-between gap-3 py-3 text-[13px]">
                    <span className="text-muted-foreground">
                      Orientation
                    </span>
                    <span
                      className={`font-semibold ${actualOnboarding.orientationCompleted ? "text-[#16835e] dark:text-[#77dcb0]" : "text-[#996b23] dark:text-[#f0c274]"}`}
                    >
                      {actualOnboarding.orientationCompleted
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 text-[13px]">
                    <span className="text-muted-foreground">
                      Documents
                    </span>
                    <span
                      className={`font-semibold ${actualOnboarding.documentsVerified ? "text-[#16835e] dark:text-[#77dcb0]" : "text-[#996b23] dark:text-[#f0c274]"}`}
                    >
                      {actualOnboarding.documentsVerified
                        ? "Verified"
                        : "Pending verification"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 text-[13px]">
                    <span className="text-muted-foreground">
                      Probation end
                    </span>
                    <span className="text-right font-semibold text-foreground">
                      {formatDate(actualOnboarding.probationEndDate)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
                  No onboarding record has been added yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {chronologicalMilestones.length > 0 && (
          <section
            aria-label="Employment milestones"
            className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          >
            <ChronologicalLifecycleFlow
              milestones={chronologicalMilestones}
              employeeName={
                profile.name || `${profile.firstName} ${profile.lastName}`
              }
              employeeCode={profile.employeeCode}
            />
          </section>
        )}

        {(transfers.length > 0 ||
          lifecycleEvents.length > 0 ||
          offboarding) && (
          <section
            className="grid items-start gap-5 lg:grid-cols-2"
            aria-label="Employment history"
          >
            {transfers.length > 0 && (
              <Card className={cardClass}>
                <CardContent className="p-5 sm:p-6">
                  <SectionHeading
                    icon={ArrowLeftRight}
                    title="Transfer history"
                    description="Changes to your assignment over time."
                  />
                  <div className="space-y-3">
                    {transfers.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-border bg-muted/30 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold capitalize text-foreground">
                            {t.transferType.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(t.effectiveDate)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {t.fromDepartmentName} → {t.toDepartmentName}
                        </p>
                        {t.transferReason && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t.transferReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {lifecycleEvents.length > 0 && (
              <Card className={cardClass}>
                <CardContent className="p-5 sm:p-6">
                  <SectionHeading
                    icon={Clock3}
                    title="Status history"
                    description="Changes recorded during your employment."
                  />
                  <div className="space-y-0">
                    {lifecycleEvents.map((event, index) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex w-5 shrink-0 flex-col items-center">
                          <span className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#142439] bg-[#3985c5] ring-1 ring-[#bad8f2] dark:ring-[#678cae]" />
                          {index < lifecycleEvents.length - 1 && (
                            <span className="my-1 min-h-10 w-px flex-1 bg-[#dbe7f3] dark:bg-[#30455e]" />
                          )}
                        </div>
                        <div className="min-w-0 pb-5">
                          <p className="text-[13px] font-semibold capitalize text-[#193651] dark:text-[#e7f0fb]">
                            {event.fromStatus || "Started"} → {event.toStatus}
                          </p>
                          <p className="mt-1 break-words text-xs leading-relaxed text-[#70849b] dark:text-[#a7bbcf]">
                            {formatDate(event.transitionDate)}
                            {event.notes ? ` · ${event.notes}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <Card className={cardClass}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f2f6fa] dark:bg-[#223249] text-[#5d748d] dark:text-[#acc0d5]">
                <FileText className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-[#193651] dark:text-[#e7f0fb]">
                  Resignation request
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#70849b] dark:text-[#a7bbcf]">
                  {canResign
                    ? "Send a request to HR for review."
                    : offboarding?.resignationDate
                      ? `Submitted on ${formatDate(offboarding.resignationDate)}.`
                      : "Your exit process is already in progress."}
                </p>
              </div>
            </div>
            {canResign && (
              <Button
                variant="outline"
                onClick={() => setResignationOpen(true)}
                className="w-full shrink-0 gap-2 rounded-lg border-[#e9c9c9] dark:border-[#805260] text-[#a34b4b] dark:text-[#ffb2b2] hover:bg-[#fff5f5] dark:hover:bg-[#472d38] hover:text-[#923b3b] dark:hover:text-[#ffd0d0] sm:w-auto"
              >
                <UserMinus className="h-4 w-4" /> Submit resignation
              </Button>
            )}
          </CardContent>
        </Card>

        <Dialog open={resignationOpen} onOpenChange={setResignationOpen}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-[530px] overflow-y-auto rounded-2xl border-border bg-card p-5 font-['Plus_Jakarta_Sans'] sm:p-7">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Submit resignation
              </DialogTitle>
              <DialogDescription className="pt-1 text-[13px] leading-relaxed text-muted-foreground">
                Your request stays pending until HR or an Administrator approves
                it. Notice and offboarding start after approval.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <label className="block text-[13px] font-semibold text-foreground">
                Subject
                <Input
                  value={resignationSubject}
                  onChange={(e) => setResignationSubject(e.target.value)}
                  className="mt-1.5 h-10 rounded-lg border-border bg-background font-normal focus-visible:ring-primary"
                  maxLength={255}
                  placeholder="e.g. Resignation from my position"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-foreground">
                  Resignation date
                  <Input
                    type="date"
                    value={resignationDate}
                    onChange={(e) => setResignationDate(e.target.value)}
                    className="mt-1.5 h-10 rounded-lg border-border bg-background font-normal focus-visible:ring-primary"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-foreground">
                  Last working day
                  <Input
                    type="date"
                    min={resignationDate}
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    className="mt-1.5 h-10 rounded-lg border-border bg-background font-normal focus-visible:ring-primary"
                  />
                </label>
              </div>
              <label className="block text-[13px] font-semibold text-foreground">
                Reason for resignation
                <Input
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  className="mt-1.5 h-10 rounded-lg border-border bg-background font-normal focus-visible:ring-primary"
                  maxLength={500}
                  placeholder="e.g. Career opportunity"
                />
              </label>
              <label className="block text-[13px] font-semibold text-foreground">
                Description
                <Textarea
                  value={resignationDescription}
                  onChange={(e) => setResignationDescription(e.target.value)}
                  className="mt-1.5 min-h-[110px] resize-y rounded-lg border-border bg-background font-normal focus-visible:ring-primary"
                  maxLength={2000}
                  placeholder="Provide the details for HR review"
                />
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setResignationOpen(false)}
                className="rounded-lg border-border bg-card text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmittingResignation}
                onClick={submitResignation}
                className="rounded-lg"
              >
                {isSubmittingResignation ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
