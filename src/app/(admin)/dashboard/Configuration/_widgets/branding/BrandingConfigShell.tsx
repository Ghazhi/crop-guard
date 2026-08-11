'use client'

import { Palette as PageIcon, Palette, LayoutTemplate, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'
import { ThemeColorsSection } from './ThemeColorsSection'
import { LandingContentSection } from './LandingContentSection'

type SectionKey = 'theme' | 'content'

const SECTIONS: { key: SectionKey; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'theme',   icon: Palette,        label: 'Theme Colors',        desc: 'Brand color palette used across the platform' },
  { key: 'content', icon: LayoutTemplate, label: 'Landing Page Content', desc: 'Hero carousel and call-to-action text'        },
]

export function BrandingConfigShell() {
  const [section, setSection] = usePersistedState<SectionKey>('brandingConfig.section', 'theme')
  const [collapsed, setCollapsed] = usePersistedState('brandingConfig.navCollapsed', false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <PageIcon className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Branding</h2>
            <button
              onClick={() => setCollapsed(v => !v)}
              title={collapsed ? 'Expand' : 'Collapse'}
              aria-label={collapsed ? 'Expand section navigation' : 'Collapse section navigation'}
              className="flex w-7 h-7 rounded-lg items-center justify-center border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors shrink-0"
            >
              {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500">Customize the platform&apos;s theme colors and public landing page content</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        <div className={collapsed ? 'w-full md:w-auto md:shrink-0 min-w-0' : 'w-full md:w-56 md:shrink-0 min-w-0'}>
          <div className="hidden md:flex md:flex-col gap-1">
            {SECTIONS.map(({ key, icon: Icon, label, desc }) => {
              const active = section === key
              if (collapsed) {
                return (
                  <button
                    key={key}
                    onClick={() => setSection(key)}
                    title={label}
                    aria-label={label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'text-white' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                    style={active ? { background: 'var(--brand-forest)' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                )
              }
              return (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <ScrollTabsTemplate className="md:hidden gap-1 pb-1" fadeColor="gray-50">
            {SECTIONS.map(({ key, icon: Icon, label, desc }) => {
              const active = section === key
              return (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors shrink-0 whitespace-nowrap ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{desc}</p>
                  </div>
                </button>
              )
            })}
          </ScrollTabsTemplate>
        </div>

        <div className="w-full flex-1 min-w-0">
          {section === 'theme' && <ThemeColorsSection />}
          {section === 'content' && <LandingContentSection />}
        </div>
      </div>
    </div>
  )
}
