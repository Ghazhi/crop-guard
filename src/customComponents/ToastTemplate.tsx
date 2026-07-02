import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import React from 'react'

export interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Single hook-style API — call these anywhere in client components
export const useToast = () => ({
  success: (label: string, opts?: ToastOptions) =>
    toast.success(label, {
      description: opts?.description,
      duration: opts?.duration ?? 4000,
      icon: <CheckCircle className="w-4 h-4 text-[#3D7A56]" />,
      action: opts?.action
        ? { label: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    }),

  error: (label: string, opts?: ToastOptions) =>
    toast.error(label, {
      description: opts?.description,
      duration: opts?.duration ?? 5000,
      icon: <XCircle className="w-4 h-4 text-[#D94F3D]" />,
      action: opts?.action
        ? { label: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    }),

  warning: (label: string, opts?: ToastOptions) =>
    toast.warning(label, {
      description: opts?.description,
      duration: opts?.duration ?? 4500,
      icon: <AlertTriangle className="w-4 h-4 text-[#E8963A]" />,
      action: opts?.action
        ? { label: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    }),

  info: (label: string, opts?: ToastOptions) =>
    toast.info(label, {
      description: opts?.description,
      duration: opts?.duration ?? 4000,
      icon: <Info className="w-4 h-4 text-[#2B7BB9]" />,
      action: opts?.action
        ? { label: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    }),

  loading: (label: string, opts?: Omit<ToastOptions, 'action'>) =>
    toast.loading(label, {
      description: opts?.description,
      duration: opts?.duration,
    }),

  dismiss: (id?: string | number) => toast.dismiss(id),

  promise: toast.promise,
})

/*
// Usage in a 'use client' component:
import { useToast } from '@/customComponents/ToastTemplate'

const { success, error, warning, info, loading, dismiss, promise } = useToast()

// Basic
<ButtonTemplate label="Save" onClick={() => success('Farmer saved')} />

// With description
success('Record updated', { description: 'Changes have been persisted.' })

// With action
error('Upload failed', {
  description: 'File could not be processed.',
  action: { label: 'Retry', onClick: handleRetry },
})

// Promise toast (auto success/error)
promise(saveFarmer(data), {
  loading: 'Saving farmer...',
  success: 'Farmer saved successfully',
  error: 'Failed to save farmer',
})

// Loading → dismiss manually
const id = loading('Exporting CSV...')
await doExport()
dismiss(id)
success('Export complete')
*/
