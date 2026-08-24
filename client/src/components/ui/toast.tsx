import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export interface ToasterProps extends React.ComponentProps<typeof SonnerToaster> {}

/**
 * WhatsApp Web style Toast Notifications Container
 * Positioned in the bottom-right corner with popup card styling.
 */
export function Toaster({ position = 'bottom-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      expand={true}
      duration={4000}
      className="toaster group"
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        },
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:font-sans animate-in fade-in-0 slide-in-from-bottom-5 slide-in-from-right-5 duration-300 ease-out',
          title: 'text-xs font-extrabold text-foreground tracking-tight',
          description: 'text-[11px] text-muted-foreground mt-0.5 leading-snug font-medium',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-bold text-xs rounded-xl px-3 py-1.5',
          closeButton:
            'group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground hover:group-[.toast]:bg-muted transition-colors rounded-full p-1',
        },
      }}
      {...props}
    />
  );
}

export const showToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),
  info: (message: string, description?: string) =>
    toast.info(message, { description }),
  message: (message: string) => toast(message),
};
