'use client'

import { AlertTriangle } from 'lucide-react'

export type ConfirmModalVariant = 'danger' | 'warning' | 'success'

export interface ConfirmModalProps {
  open:           boolean
  title:          string
  message:        string
  confirmLabel?:  string
  variant?:       ConfirmModalVariant
  onConfirm:      () => void
  onCancel:       () => void
}

const VARIANTS: Record<ConfirmModalVariant, { bg: string; iconBg: string; icon: string }> = {
  danger:  { bg: '#ef4444', iconBg: 'bg-red-50',    icon: 'text-red-500'    },
  warning: { bg: '#eab308', iconBg: 'bg-yellow-50', icon: 'text-yellow-500' },
  success: { bg: '#1A3D2B', iconBg: 'bg-green-50',  icon: 'text-green-600'  },
}

export function ConfirmModal({
  open, title, message, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  const v = VARIANTS[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${v.iconBg}`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${v.icon}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full h-9 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: v.bg }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full h-9 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
