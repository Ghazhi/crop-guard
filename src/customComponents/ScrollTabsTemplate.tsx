'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const FADE_CLASSES = {
  white:    { left: 'from-white',    right: 'from-white' },
  'gray-50':  { left: 'from-gray-50',  right: 'from-gray-50' },
  'gray-100': { left: 'from-gray-100', right: 'from-gray-100' },
} as const

export interface ScrollTabsTemplateProps {
  children: React.ReactNode
  className?: string
  /** Color stop for the edge fade — must match the strip's own background */
  fadeColor?: keyof typeof FADE_CLASSES
}

/**
 * Horizontal tab-strip wrapper: scrolls when tabs overflow the viewport and shows
 * left/right edge fades so users know there's more to scroll to.
 */
export function ScrollTabsTemplate({ children, className, fadeColor = 'white' }: ScrollTabsTemplateProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  function updateFades() {
    const el = ref.current
    if (!el) return
    setShowLeft(el.scrollLeft > 2)
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(updateFades)
    observer.observe(el)
    // also watch content width — children can overflow without the container's own box changing
    Array.from(el.children).forEach(child => observer.observe(child))
    const raf = requestAnimationFrame(updateFades)
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [children])

  return (
    <div className="relative min-w-0">
      {showLeft && (
        <div className={cn('pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-linear-to-r to-transparent z-10', FADE_CLASSES[fadeColor].left)} />
      )}
      <div
        ref={ref}
        onScroll={updateFades}
        className={cn('flex overflow-x-auto scrollbar-hide', className)}
      >
        {children}
      </div>
      {showRight && (
        <div className={cn('pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-linear-to-l to-transparent z-10', FADE_CLASSES[fadeColor].right)} />
      )}
    </div>
  )
}
