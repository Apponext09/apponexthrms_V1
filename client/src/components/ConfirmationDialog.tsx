import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ConfirmationRequest = {
  message: string;
  kind: 'confirm' | 'notice' | 'prompt';
  defaultValue?: string;
  resolve: (value: boolean | string | null) => void;
};

let listener: ((request: ConfirmationRequest | null) => void) | undefined;
let pendingRequest: ConfirmationRequest | null = null;

/** Opens the application's shared, asynchronous confirmation dialog. */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request: ConfirmationRequest = { message, kind: 'confirm', resolve: (value) => resolve(value === true) };
    pendingRequest = request;
    listener?.(request);
  });
}

/** Shows a non-blocking application notice in the same custom dialog system. */
export function showNotice(message: string): void {
  pendingRequest = { message, kind: 'notice', resolve: () => undefined };
  listener?.(pendingRequest);
}

export function promptForValue(message: string, defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const request: ConfirmationRequest = { message, kind: 'prompt', defaultValue, resolve: (value) => resolve(typeof value === 'string' ? value : null) };
    pendingRequest = request;
    listener?.(request);
  });
}

declare global {
  interface Window {
    appConfirm: (message: string) => Promise<boolean>;
    appAlert: (message: string) => void;
    appPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
  }
}

if (typeof window !== 'undefined') {
  window.appConfirm = confirmAction;
  window.appAlert = showNotice;
  window.appPrompt = promptForValue;
}

export function ConfirmationDialog() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(pendingRequest);
  const [value, setValue] = useState('');

  useEffect(() => {
    listener = (next) => { setValue(next?.defaultValue ?? ''); setRequest(next); };
    return () => { listener = undefined; };
  }, []);

  const close = (confirmed: boolean) => {
    const current = request;
    pendingRequest = null;
    setRequest(null);
    current?.resolve(confirmed);
  };

  const submitPrompt = () => {
    const current = request;
    pendingRequest = null;
    setRequest(null);
    current?.resolve(value);
  };

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="max-w-md" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>{request?.kind === 'notice' ? 'Notice' : 'Confirm action'}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{request?.message}</DialogDescription>
          {request?.kind === 'prompt' && (
            <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submitPrompt()} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          )}
        </DialogHeader>
        <DialogFooter>
          {request?.kind !== 'notice' && <Button variant="outline" onClick={() => close(false)}>Cancel</Button>}
          <Button variant={request?.kind === 'confirm' ? 'destructive' : 'default'} onClick={request?.kind === 'prompt' ? submitPrompt : () => close(request?.kind === 'confirm')}>{request?.kind === 'confirm' ? 'Confirm' : 'OK'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
