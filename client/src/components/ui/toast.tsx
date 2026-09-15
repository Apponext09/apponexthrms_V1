import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export interface ToasterProps extends React.ComponentProps<typeof SonnerToaster> {}

/**
 * Light-themed Toast Notifications Container
 * Positioned in the bottom-right corner with vibrant, color-coded backgrounds.
 * - Success: Green  | Error: Red  | Warning: Amber  | Info: Blue
 * Duration: 2500ms
 */
export function Toaster({ position = 'bottom-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      visibleToasts={3}
      richColors={true}
      closeButton
      expand={false}
      duration={2500}
      className="toaster group"
      toastOptions={{
        style: {
          borderRadius: '12px',
          padding: '13px 16px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1.5px solid',
          opacity: 1,
        },
        classNames: {
          toast:
            'group toast !rounded-xl !p-4 !gap-3 !opacity-100 font-sans animate-in fade-in-0 slide-in-from-bottom-4 slide-in-from-right-4 duration-300 ease-out',
          title: '!text-[13px] !font-bold tracking-tight',
          description: '!text-[12px] mt-0.5 leading-snug font-medium opacity-80',
          success:
            '!bg-[#f0fdf4] !text-[#15803d] !border-[#86efac]',
          error:
            '!bg-[#fff1f2] !text-[#be123c] !border-[#fda4af]',
          warning:
            '!bg-[#fffbeb] !text-[#b45309] !border-[#fcd34d]',
          info:
            '!bg-[#eff6ff] !text-[#1d4ed8] !border-[#93c5fd]',
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
