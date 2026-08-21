'use client'

import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'

export interface PermissionGuardProps {
  children: React.ReactNode
}

/**
 * Blocks rendering of a route the signed-in role has no `view` grant on, so
 * typing the URL directly cannot bypass the filtered sidebar. Renders nothing
 * until the session has resolved, which avoids flashing an Access Denied panel
 * at users who are in fact allowed in.
 */
export function PermissionGuard({ children }: PermissionGuardProps) {
  const { ready, current, currentPageKey } = usePermissions()
  const router = useRouter()

  if (!ready) return null
  // Routes with no page key are ungated (e.g. portal landing shells).
  if (!currentPageKey || current.view) return <>{children}</>

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm max-w-md w-full p-8 flex flex-col items-center text-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--brand-mint)' }}
        >
          <ShieldAlert className="w-7 h-7" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--brand-forest)' }}>Access denied</h1>
        <p className="text-sm text-gray-500">
          Your role does not have permission to view <span className="font-semibold text-gray-700">{currentPageKey}</span>.
          Contact an administrator if you believe this is a mistake.
        </p>
        <ButtonTemplate variant="outline" size="sm" label="Go back" className="mt-1" onClick={() => router.back()} />
      </div>
    </div>
  )
}
