import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export interface ToasterProps extends React.ComponentProps<typeof SonnerToaster> {}

/**
 * Solid WhatsApp Web style Toast Notifications Container
 * Positioned in the bottom-right corner with 100% solid, opaque backgrounds.
 */
export function Toaster({ position = 'bottom-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors={false}
      closeButton
      expand={true}
      duration={4000}
      className="toaster group"
      toastOptions={{
        style: {
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: '1px solid #334155',
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          opacity: 1,
        },
        classNames: {
          toast:
            'group toast !bg-[#0f172a] !text-white !border-slate-700 !shadow-2xl !rounded-2xl !p-4 !gap-3 !opacity-100 font-sans animate-in fade-in-0 slide-in-from-bottom-5 slide-in-from-right-5 duration-300 ease-out',
          title: '!text-xs !font-extrabold !text-white tracking-tight',
          description: '!text-[11px] !text-slate-300 mt-0.5 leading-snug font-medium',
          actionButton:
            '!bg-emerald-500 !text-white font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs',
          cancelButton:
            '!bg-slate-800 !text-slate-300 font-bold text-xs rounded-xl px-3 py-1.5',
          closeButton:
            '!bg-slate-800 !border-slate-700 !text-slate-400 hover:!text-white hover:!bg-slate-700 transition-colors rounded-full p-1',
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
