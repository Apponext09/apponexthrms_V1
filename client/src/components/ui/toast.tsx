import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export interface ToasterProps extends React.ComponentProps<typeof SonnerToaster> {}

/**
 * Toast Notifications Container
 * - Position: top-right
 * - Background: white only (no type-based colors)
 * - Duration: 2000ms, pauses on hover
 */
export function Toaster({ position = 'top-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      visibleToasts={3}
      richColors={false}
      closeButton
      expand={false}
      duration={2000}
      pauseWhenPageIsHidden
      pauseOnHover
      theme="light"
      className="toaster group"
      style={
        {
          '--normal-bg': '#ffffff',
          '--normal-text': '#111827',
          '--normal-border': '#e5e7eb',
          '--success-bg': '#ffffff',
          '--success-text': '#111827',
          '--success-border': '#e5e7eb',
          '--error-bg': '#ffffff',
          '--error-text': '#111827',
          '--error-border': '#e5e7eb',
          '--warning-bg': '#ffffff',
          '--warning-text': '#111827',
          '--warning-border': '#e5e7eb',
          '--info-bg': '#ffffff',
          '--info-text': '#111827',
          '--info-border': '#e5e7eb',
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#111827',
          border: '1.5px solid #e5e7eb',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)',
        },
        classNames: {
          toast:
            '!bg-white !text-gray-900 !border-gray-200 !rounded-xl',
          title: '!text-[13px] !font-bold !text-gray-900',
          description: '!text-[12px] !text-gray-500',
          icon: '!text-gray-400',
          closeButton:
            '!bg-white !border-gray-200 !text-gray-400 hover:!text-gray-700 hover:!bg-gray-50 rounded-full',
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
