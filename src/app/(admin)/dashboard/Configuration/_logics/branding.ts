// ─── Tenant landing-page config ───────────────────────────────────────────────
// Hero carousel content + theme colors are editable by a tenant admin from
// Configuration > Landing Page Config, and read live by the public LandingPage.
// Persisted via usePersistedState (sessionStorage) — the mock-data equivalent
// of a per-tenant settings record. Navbar/footer branding (logo, sign-in label,
// footer text) are fixed and NOT admin-configurable.

export interface ThemeColors {
  forest: string
  dark:   string
  green:  string
  mid:    string
  pale:   string
  mint:   string
  amber:  string
  red:    string
  slate:  string
}

export const DEFAULT_THEME: ThemeColors = {
  forest: '#1A3D2B',
  dark:   '#2C5F3F',
  green:  '#3D7A56',
  mid:    '#5A9E74',
  pale:   '#B3DCBF',
  mint:   '#E6F4EC',
  amber:  '#E8963A',
  red:    '#D94F3D',
  slate:  '#4A5568',
}

export const THEME_COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'forest', label: 'Primary (Forest)',  hint: 'Buttons, headings, active nav' },
  { key: 'dark',   label: 'Primary Dark',      hint: 'Hover states, secondary emphasis' },
  { key: 'green',  label: 'Accent Green',      hint: 'Links, highlights' },
  { key: 'mid',    label: 'Accent Mid',        hint: 'Secondary chart series, badges' },
  { key: 'pale',   label: 'Pale',              hint: 'Subtle borders, hero eyebrow text' },
  { key: 'mint',   label: 'Mint (Surface)',    hint: 'Icon badges, soft backgrounds' },
  { key: 'amber',  label: 'Warning',           hint: 'Warnings, medium-risk states' },
  { key: 'red',    label: 'Danger',            hint: 'Errors, high-risk states' },
  { key: 'slate',  label: 'Muted Text',        hint: 'Secondary/help text' },
]

export interface HeroSlide {
  id:      string
  image:   string | null // data URL or /public path
  eyebrow: string
  title:   string
  body:    string
}

export interface LandingContent {
  navLogo:      string | null // data URL or /public path
  brandName:    string
  signInLabel:  string
  ctaLabel:     string
  heroSlides:   HeroSlide[]
  heroPrimaryCta:   string
  heroSecondaryCta: string
  footerLogo:      string | null
  footerTagline:   string
  footerCopyright: string
  poweredByLabel:  string
  poweredByLogo:   string | null
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  navLogo:     '/cropguard_png_2.png',
  brandName:   'CropGuard+',
  signInLabel: 'Sign In',
  ctaLabel:    'Request a Demo',
  heroSlides: [
    {
      id: 'slide-1',
      image: '/assets/images/hero-resilient-farms.jpeg',
      eyebrow: 'Resilient Farms. Dignified Lives.',
      title: 'The Digital Infrastructure for Resilient Agriculture.',
      body: 'Digitize farmer engagement, verify field activities, generate trusted resilience intelligence, and get actionable insights to reduce risk and create sustainable opportunities for farmers.',
    },
    {
      id: 'slide-2',
      image: '/assets/images/hero-data-insights.jpeg',
      eyebrow: 'Data-Driven Insights',
      title: 'Turn Field Data Into Trusted Resilience Intelligence.',
      body: 'Transform verified farmer behaviour and field data into resilience intelligence for risk assessment, impact measurement, and smarter decisions.',
    },
    {
      id: 'slide-3',
      image: '/assets/images/hero-climate-smart.jpeg',
      eyebrow: 'Climate-Smart Farming',
      title: 'Building Climate Resilience From the Ground Up.',
      body: 'Localized weather forecasts, early warning systems, and climate data that help anticipate risks and make proactive decisions for every farmer.',
    },
  ],
  heroPrimaryCta:   'Get Started',
  heroSecondaryCta: 'Request a Demo',
  footerLogo:      '/assets/images/asinyo-wordmark.png',
  footerTagline:   'Building technology and systems for a resilient and prosperous Africa.',
  footerCopyright: 'CropGuard+. All rights reserved.',
  poweredByLabel:  'Powered by',
  poweredByLogo:   '/assets/images/asinyo-wordmark.png',
}

export function newHeroSlide(): HeroSlide {
  return {
    id: `slide-${Date.now()}`,
    image: null,
    eyebrow: 'New Slide',
    title: 'Your headline here',
    body: 'A short supporting sentence for this slide.',
  }
}

/** Reads a picked File as a data URL, so images can persist without a backend/file storage. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
