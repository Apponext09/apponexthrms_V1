import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface InvalidDropModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function InvalidDropModal({
  open,
  onClose,
  title = 'Invalid Reporting Structure',
  message = 'This position move violates the configured organization reporting hierarchy.',
}: InvalidDropModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md border border-destructive/30 bg-card rounded-xl shadow-2xl animate-in fade-in-50 zoom-in-95">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Organization Hierarchy Restriction
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 px-3.5 bg-muted/40 border border-border/80 rounded-lg text-xs font-medium text-foreground space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border/60">
          <Button
            size="sm"
            variant="default"
            onClick={onClose}
            className="h-8 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
