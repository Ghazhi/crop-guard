'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { type LandingContent, DEFAULT_LANDING_CONTENT } from '@/app/(admin)/dashboard/Configuration/_logics/branding'

function Navbar({ content }: { content: LandingContent }) {
  const router = useRouter()
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 shrink-0">
          {content.navLogo && (
            <Image src={content.navLogo} alt={content.brandName} width={120} height={80} className="h-8 w-auto object-contain" priority />
          )}
        </button>
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2.5 sm:px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            {content.signInLabel}
          </button>
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-semibold text-white px-2.5 sm:px-4 py-2 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: 'var(--brand-forest)' }}
          >
            {content.ctaLabel}
          </button>
        </nav>
      </div>
    </header>
  )
}

function Hero({ content }: { content: LandingContent }) {
  const router = useRouter()
  const slides = content.heroSlides
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setActive(i => (i + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setActive(i => (i - 1 + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [paused, next, slides.length])

  if (slides.length === 0) return null
  const activeIndex = active % slides.length
  const current = slides[activeIndex]

  return (
    <section
      className="relative h-svh min-h-150 w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: i === activeIndex ? 1 : 0, zIndex: i === activeIndex ? 10 : 0 }}
        >
          {s.image && (
            <Image
              src={s.image}
              alt={s.title}
              fill
              priority={i === 0}
              className="object-cover"
              style={{ transform: i === activeIndex ? 'scale(1.05)' : 'scale(1)', transition: 'transform 6s ease-out' }}
            />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(8,28,8,0.82) 0%, rgba(8,28,8,0.55) 45%, rgba(8,28,8,0.25) 100%)' }} />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center">
        <div className="max-w-2xl">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--brand-pale)' }}>
            {current.eyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-5 drop-shadow-lg">
            {current.title}
          </h1>
          <p className="text-base sm:text-lg text-white/85 leading-relaxed mb-8 max-w-xl">
            {current.body}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-opacity hover:opacity-90 shadow-lg"
              style={{ backgroundColor: 'var(--brand-forest)' }}
            >
              {content.heroPrimaryCta}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors hover:bg-white/10"
            >
              {content.heroSecondaryCta}
            </button>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          {/* Arrow controls */}
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Slide indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Scroll hint */}
      <div className="absolute bottom-8 right-8 z-30 hidden sm:flex items-center gap-2 text-white/70 text-xs">
        <span className="tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-white animate-[scrollHint_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  )
}

function Footer({ content }: { content: LandingContent }) {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-4">
            {content.footerLogo && (
              <Image src={content.footerLogo} alt={content.brandName} width={140} height={80} className="h-10 w-auto object-contain" />
            )}
            <div className="hidden sm:block w-px h-10 bg-gray-300" />
            <p className="text-xs text-gray-500 leading-snug max-w-50">
              {content.footerTagline}
            </p>
          </div>

          <div className="block sm:hidden w-full h-px bg-gray-200" />

          {/* Values */}
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="7" r="3.5" />
                <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" />
              </svg>
              <span className="text-xs font-medium text-gray-600">People First</span>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-300" />

            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="13" width="4" height="7" rx="1" />
                <rect x="9" y="8" width="4" height="12" rx="1" />
                <rect x="16" y="3" width="4" height="17" rx="1" />
                <polyline points="3,13 9,7 14,10 19,4" strokeWidth="1.5" />
              </svg>
              <span className="text-xs font-medium text-gray-600">Data for Good</span>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-300" />

            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="2" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="11" cy="19" r="1.5" />
                <circle cx="3" cy="11" r="1.5" />
                <circle cx="19" cy="11" r="1.5" />
                <circle cx="5.5" cy="5.5" r="1.5" />
                <circle cx="16.5" cy="16.5" r="1.5" />
                <circle cx="5.5" cy="16.5" r="1.5" />
                <circle cx="16.5" cy="5.5" r="1.5" />
                <line x1="11" y1="9" x2="11" y2="3" />
                <line x1="11" y1="13" x2="11" y2="19" />
                <line x1="9" y1="11" x2="3" y2="11" />
                <line x1="13" y1="11" x2="19" y2="11" />
                <line x1="9.6" y1="9.6" x2="6.6" y2="6.6" />
                <line x1="12.4" y1="12.4" x2="15.4" y2="15.4" />
                <line x1="9.6" y1="12.4" x2="6.6" y2="15.4" />
                <line x1="12.4" y1="9.6" x2="15.4" y2="6.6" />
              </svg>
              <span className="text-xs font-medium text-gray-600">Opportunity for All</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">&copy; {year} {content.footerCopyright}</p>
          <div className="flex items-center gap-2">
            {content.navLogo && (
              <Image src={content.navLogo} alt={content.brandName} width={100} height={60} className="h-6 w-auto object-contain" />
            )}
            <span className="text-[11px] text-gray-400">{content.poweredByLabel}</span>
            {content.poweredByLogo && (
              <Image src={content.poweredByLogo} alt="" width={64} height={32} className="h-4 w-auto object-contain opacity-70" />
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const [content] = usePersistedState<LandingContent>('branding.landingContent', DEFAULT_LANDING_CONTENT)

  // dashboard routes own their internal scroll containers, so html/body default
  // to overflow:hidden globally — this is the one route that needs the page itself to scroll
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'auto'
    body.style.overflow = 'auto'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  return (
    <div className="font-sans">
      <Navbar content={content} />
      <Hero content={content} />
      <Footer content={content} />
    </div>
  )
}
