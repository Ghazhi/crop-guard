import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar() {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <img
          src="/cropguard_png_2.png"
          alt="CropGuard+"
          onClick={() => navigate('/')}
          className="h-8 w-auto object-contain cursor-pointer"
        />
        <nav className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold bg-cropguard-forest hover:bg-cropguard-dark text-white px-4 py-2 rounded-lg transition-colors"
          >
            Request a Demo
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    image: 'https://images.pexels.com/photos/30541313/pexels-photo-30541313.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop',
    eyebrow: 'Resilient Farms. Dignified Lives.',
    title: 'The Digital Infrastructure for Resilient Agriculture.',
    body: 'Digitize farmer engagement, verify field activities, generate trusted resilience intelligence, and get actionable insights to reduce risk and create sustainable opportunities for farmers.',
  },
  {
    image: 'https://images.pexels.com/photos/12969403/pexels-photo-12969403.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop',
    eyebrow: 'Data-Driven Insights',
    title: 'Turn Field Data Into Trusted Resilience Intelligence.',
    body: 'Transform verified farmer behaviour and field data into resilience intelligence for risk assessment, impact measurement, and smarter decisions.',
  },
  {
    image: 'https://images.pexels.com/photos/15570544/pexels-photo-15570544.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop',
    eyebrow: 'Climate-Smart Farming',
    title: 'Building Climate Resilience From the Ground Up.',
    body: 'Localized weather forecasts, early warning systems, and climate data that help anticipate risks and make proactive decisions for every farmer.',
  },
];

function Hero() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((i) => (i + 1) % HERO_SLIDES.length), []);
  const prev = useCallback(() => setActive((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [paused, next]);

  return (
    <section
      className="relative h-[100svh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 10 : 0 }}
        >
          <img
            src={s.image}
            alt=""
            className="w-full h-full object-cover"
            style={{ transform: i === active ? 'scale(1.05)' : 'scale(1)', transition: 'transform 6s ease-out' }}
          />
          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(8,28,8,0.82) 0%, rgba(8,28,8,0.55) 45%, rgba(8,28,8,0.25) 100%)' }} />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 h-full max-w-6xl mx-auto px-6 flex flex-col justify-center">
        <div className="max-w-2xl">
          <span className="inline-block text-xs font-semibold text-cropguard-mint tracking-widest uppercase mb-5">
            {HERO_SLIDES[active].eyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-5 drop-shadow-lg">
            {HERO_SLIDES[active].title}
          </h1>
          <p className="text-base sm:text-lg text-white/85 leading-relaxed mb-8 max-w-xl">
            {HERO_SLIDES[active].body}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-cropguard-forest hover:bg-cropguard-dark text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors hover:bg-white/10"
            >
              Request a Demo
            </button>
          </div>
        </div>
      </div>

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
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 right-8 z-30 hidden sm:flex items-center gap-2 text-white/70 text-xs">
        <span className="tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-white animate-[scrollHint_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#f7f7f5] border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Logo + tagline */}
          <div className="flex items-center gap-4">
            <img
              src="/assets/images/ChatGPT_Image_Aug_3,_2026,_11_32_54_PM copy.png"
              alt="Asinyo"
              className="h-10 w-auto object-contain"
            />

            <div className="hidden sm:block w-px h-10 bg-gray-300" />

            <p className="text-xs text-gray-500 leading-snug max-w-[200px]">
              Building technology and systems for a resilient and prosperous Africa.
            </p>
          </div>

          {/* Divider — visible on small screens */}
          <div className="block sm:hidden w-full h-px bg-gray-200" />

          {/* Values */}
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {/* People First */}
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="7" r="3.5"/>
                <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7"/>
              </svg>
              <span className="text-xs font-medium text-gray-600">People First</span>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-300" />

            {/* Data for Good */}
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="13" width="4" height="7" rx="1"/>
                <rect x="9" y="8" width="4" height="12" rx="1"/>
                <rect x="16" y="3" width="4" height="17" rx="1"/>
                <polyline points="3,13 9,7 14,10 19,4" strokeWidth="1.5"/>
              </svg>
              <span className="text-xs font-medium text-gray-600">Data for Good</span>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-300" />

            {/* Opportunity for All */}
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="2"/>
                <circle cx="11" cy="3" r="1.5"/>
                <circle cx="11" cy="19" r="1.5"/>
                <circle cx="3" cy="11" r="1.5"/>
                <circle cx="19" cy="11" r="1.5"/>
                <circle cx="5.5" cy="5.5" r="1.5"/>
                <circle cx="16.5" cy="16.5" r="1.5"/>
                <circle cx="5.5" cy="16.5" r="1.5"/>
                <circle cx="16.5" cy="5.5" r="1.5"/>
                <line x1="11" y1="9" x2="11" y2="3"/>
                <line x1="11" y1="13" x2="11" y2="19"/>
                <line x1="9" y1="11" x2="3" y2="11"/>
                <line x1="13" y1="11" x2="19" y2="11"/>
                <line x1="9.6" y1="9.6" x2="6.6" y2="6.6"/>
                <line x1="12.4" y1="12.4" x2="15.4" y2="15.4"/>
                <line x1="9.6" y1="12.4" x2="6.6" y2="15.4"/>
                <line x1="12.4" y1="9.6" x2="15.4" y2="6.6"/>
              </svg>
              <span className="text-xs font-medium text-gray-600">Opportunity for All</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">&copy; 2026 CropGuard+. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <img
              src="/assets/images/ChatGPT_Image_Aug_4,_2026,_02_11_30_AM.png"
              alt="CropGuard+"
              className="h-6 w-auto object-contain"
            />
            <span className="text-[11px] text-gray-400">Powered by</span>
            <img
              src="/assets/images/ChatGPT_Image_Aug_3,_2026,_11_32_54_PM copy.png"
              alt="Asinyo"
              className="h-4 w-auto object-contain opacity-70"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="font-sans">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}
