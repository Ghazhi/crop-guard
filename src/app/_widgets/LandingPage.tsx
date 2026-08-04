'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Leaf, CloudRain, BarChart3, Zap, ArrowRight, BookOpen, Activity, ShieldCheck, Star, User, Sprout } from 'lucide-react'

function Navbar() {
  const router = useRouter()
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="flex items-center shrink-0">
          <Image src="/cropguard_logo_4.png" alt="CropGuard" width={120} height={32} className="h-8 w-auto object-contain" priority />
        </button>
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2.5 sm:px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-semibold text-white px-2.5 sm:px-4 py-2 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: 'var(--brand-forest)' }}
          >
            Request a Demo
          </button>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const router = useRouter()
  return (
    <section className="pt-14" style={{ backgroundColor: 'var(--brand-gray)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-10 min-h-95">
          <div className="lg:w-[45%] shrink-0 rounded-2xl overflow-hidden shadow-md aspect-798/745">
            <Image
              src="/assets/images/farmer.jpeg"
              alt="CropGuard field agent working with farmers"
              width={798}
              height={745}
              className="w-full h-full object-cover object-top"
              priority
            />
          </div>

          <div className="flex-1 flex flex-col justify-center py-4">
            <span className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--brand-green)' }}>
              Resilient Farms. Dignified Lives.
            </span>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-3">
              The Digital Infrastructure for{' '}
              <span style={{ color: 'var(--brand-forest)' }}>Resilient Agriculture.</span>
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-md">
              Digitize farmer engagement, verify field activities, generate trusted resilience intelligence, and get actionable insights to reduce risk and create sustainable opportunities for farmers.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand-forest)' }}
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors hover:bg-gray-50"
              >
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: Leaf,       title: 'Digital Extension',           body: 'Mobilize and onboard farmers, manage cooperatives, and deliver personalized advisory through digital and field-based channels.' },
  { icon: CloudRain,  title: 'Climate Intelligence',         body: 'Localized weather forecasts, early warning systems, and climate data that help anticipate risks and make proactive decisions.' },
  { icon: BarChart3,  title: 'Risk & Resilience Analytics',  body: 'Transform verified farmer behaviour and field data into resilience intelligence for risk assessment and impact measurement.' },
  { icon: Zap,        title: 'Opportunity Enablement',       body: 'Connect resilience intelligence to finance, insurance, markets, and sustainability programmes that improve farmer livelihoods.' },
]

function EverythingYouNeed() {
  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What we do</h2>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Tools, intelligence, and insights designed to help you build resilient agricultural systems.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="border border-gray-100 rounded-xl p-5 bg-white transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--brand-mint)' }}>
                <Icon className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { icon: BookOpen,   number: '1', title: 'Awareness',    body: 'Equip farmers with knowledge, tools, and support to understand resilient practices and available opportunities.' },
  { icon: Activity,   number: '2', title: 'Action',       body: 'Support adoption of climate-smart practices and improve productivity through advisory and extension services.' },
  { icon: ShieldCheck,number: '3', title: 'Verification', body: 'Digitally verify identities, field activities, and practices through mobile data collection and satellite validation.' },
  { icon: BarChart3,  number: '4', title: 'Resilience',   body: 'Generate the Farm Resilience Index (FRI) combining verified behaviour, climate exposure, and field performance.' },
  { icon: Star,       number: '5', title: 'Opportunity',  body: 'Translate resilience intelligence into access to finance, insurance, markets, and sustainability programmes.' },
]

function HowItWorks() {
  return (
    <section className="py-16 border-t border-gray-100" style={{ backgroundColor: 'var(--brand-gray)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How it works</h2>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            A proven, structured approach to measuring agricultural resilience from the ground up.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STEPS.map(({ icon: Icon, number, title, body }) => (
            <div key={title} className="text-center transition-transform hover:-translate-y-1">
              <div className="relative inline-flex mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--brand-forest)' }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--brand-amber)' }}>
                  {number}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StartJourney() {
  const router = useRouter()
  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl overflow-hidden flex flex-col lg:flex-row min-h-75">
          <div className="lg:w-[55%] shrink-0 flex flex-col justify-center px-6 sm:px-10 py-12 sm:py-20" style={{ backgroundColor: 'var(--brand-forest)' }}>
            <h2 className="text-2xl font-bold text-white leading-snug mb-3">
              Ready to start your journey?
            </h2>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              Connect with us to transform farmer engagement, cooperative support and field verification to demonstrate measurable impact.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand-amber)' }}
              >
                Request a Demo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-lg border border-white/30 transition-colors"
              >
                Speak to an Expert
              </button>
            </div>
          </div>
          <div className="flex-1 relative" style={{ minHeight: 280 }}>
            <Image
              src="/assets/images/asinyopay.JPG"
              alt="Farmers collaborating in the field with CropGuard"
              fill
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const FOOTER_BADGES = [
  { icon: User,      label: 'People First' },
  { icon: BarChart3, label: 'Data for Good' },
  { icon: Sprout,    label: 'Opportunity for All' },
]

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 px-3 rounded-lg bg-white border border-gray-100 flex items-center shrink-0">
              <span className="text-lg font-bold" style={{ color: 'var(--brand-green)' }}>asinyo</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Building technology and systems for a more resilient and prosperous Africa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {FOOTER_BADGES.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-green)' }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">&copy; {year} CropGuard+. All rights reserved.</p>
          <p className="text-xs text-gray-400">
            Powered by <span className="font-semibold text-gray-500">asinyo</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
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
      <Navbar />
      <Hero />
      <HowItWorks />
      <EverythingYouNeed />
      <StartJourney />
      <Footer />
    </div>
  )
}
