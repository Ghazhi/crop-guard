'use client'

import * as React from 'react'
import { Tooltip } from 'radix-ui'

export function TooltipTemplate({
  label,
  children,
  side = 'top',
  delayDuration = 400,
}: {
  label:          string
  children:       React.ReactNode
  side?:          'top' | 'bottom' | 'left' | 'right'
  delayDuration?: number
}) {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white shadow-md select-none animate-in fade-in-0 zoom-in-95"
          style={{ backgroundColor: '#1a2e1a' }}
        >
          {label}
          <Tooltip.Arrow style={{ fill: '#1a2e1a' }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
    </Tooltip.Provider>
  )
}
