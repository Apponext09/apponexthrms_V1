import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export interface ToasterProps extends React.ComponentProps<typeof SonnerToaster> {}

/**
 * Light-themed Toast Notifications Container
 * Positioned in the top-right corner with white backgrounds.
 * - Success: Green  | Error: Red  | Warning: Amber  | Info: Blue
 * Duration: 1500ms
 */
export function Toaster({ position = 'top-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      visibleToasts={3}
      richColors={false}
      closeButton
      expand={false}
      duration={1500}
      className="toaster group"
      toastOptions={{
        style: {
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: '600',
          background: '#ffffff',
          color: '#111827',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.10), 0 1px 6px rgba(0, 0, 0, 0.06)',
          border: '1.5px solid #e5e7eb',
          opacity: 1,
        },
        classNames: {
          toast:
            'group toast !bg-white !rounded-xl !p-4 !gap-3 !opacity-100 font-sans animate-in fade-in-0 slide-in-from-top-4 slide-in-from-right-4 duration-300 ease-out',
          title: '!text-[13px] !font-bold tracking-tight',
          description: '!text-[12px] mt-0.5 leading-snug font-medium opacity-80',
          success:
            '!text-[#15803d] !border-[#86efac]',
          error:
            '!text-[#be123c] !border-[#fda4af]',
          warning:
            '!text-[#b45309] !border-[#fcd34d]',
          info:
            '!text-[#1d4ed8] !border-[#93c5fd]',
          actionButton:
            '!bg-current !text-white font-bold text-xs rounded-lg px-3 py-1.5',
          cancelButton:
            '!bg-white !text-gray-500 font-bold text-xs rounded-lg px-3 py-1.5 border border-gray-200',
          closeButton:
            '!bg-white !border-gray-200 !text-gray-400 hover:!text-gray-700 hover:!bg-gray-50 transition-colors rounded-full',
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
