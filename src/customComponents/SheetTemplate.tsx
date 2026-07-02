import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface SheetTemplateProps {
  /** Controls open state */
  open: boolean
  /** Called when the sheet requests to close */
  onClose: () => void
  /** Sheet heading */
  title: string
  /** Optional subtitle rendered below the title in brand-green */
  subtitle?: string
  /** Width preset — defaults to 'lg' (640px) */
  size?: 'md' | 'lg' | 'xl'
  /** Content rendered inside the scrollable body */
  children?: React.ReactNode
  /** Optional footer content — rendered in a sticky bar at the bottom */
  footer?: React.ReactNode
  /** Additional className on the body wrapper */
  bodyClassName?: string
}

const SIZE_MAP: Record<NonNullable<SheetTemplateProps['size']>, string> = {
  md: 'w-120 sm:max-w-120',
  lg: 'w-160 sm:max-w-160',
  xl: 'w-200 sm:max-w-200',
}

export function SheetTemplate({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
  bodyClassName,
}: SheetTemplateProps) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          SIZE_MAP[size],
          'overflow-y-auto flex flex-col gap-0 p-0',
        )}
      >
        <SheetHeader className="px-6 pt-5 pb-3.5 border-b border-gray-100 shrink-0">
          <SheetTitle className="text-sm font-semibold tracking-tight text-gray-900 leading-tight">
            {title}
          </SheetTitle>
          {subtitle && (
            <p className="text-xs font-medium tracking-tight" style={{ color: 'var(--brand-green)' }}>
              {subtitle}
            </p>
          )}
        </SheetHeader>

        <div className={cn('flex-1 overflow-y-auto', bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-2">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/*
import { SheetTemplate } from '@/customComponents/SheetTemplate'

// View sheet
<SheetTemplate open={!!selected} onClose={() => setSelected(null)} title="Ama Mensah" subtitle="Ashanti · Kumasi Metro">
  <div className="px-6 py-5">...</div>
</SheetTemplate>

// Edit sheet with footer actions
<SheetTemplate
  open={editOpen}
  onClose={() => setEditOpen(false)}
  title="Edit Farmer"
  size="lg"
  footer={
    <div className="flex justify-end gap-2">
      <ButtonTemplate variant="outline" label="Cancel" onClick={() => setEditOpen(false)} />
      <ButtonTemplate variant="primary" label="Save" onClick={handleSave} />
    </div>
  }
>
  <div className="px-6 py-5 space-y-4">...</div>
</SheetTemplate>
*/
