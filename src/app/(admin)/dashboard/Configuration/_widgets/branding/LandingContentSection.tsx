'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LayoutTemplate, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'
import {
  type LandingContent, type HeroSlide,
  DEFAULT_LANDING_CONTENT, newHeroSlide, fileToDataUrl,
} from '../../_logics/branding'

// Navbar and footer branding (logo, sign-in/CTA labels, footer text) are fixed
// and intentionally not editable here — only hero carousel content and CTAs are.

export function LandingContentSection() {
  const [content, setContent] = usePersistedState<LandingContent>('branding.landingContent', DEFAULT_LANDING_CONTENT)
  const [busySlideId, setBusySlideId] = useState<string | null>(null)

  function patch(fields: Partial<LandingContent>) {
    setContent(prev => ({ ...prev, ...fields }))
  }

  function patchSlide(id: string, fields: Partial<HeroSlide>) {
    setContent(prev => ({ ...prev, heroSlides: prev.heroSlides.map(s => s.id === id ? { ...s, ...fields } : s) }))
  }

  function addSlide() {
    setContent(prev => ({ ...prev, heroSlides: [...prev.heroSlides, newHeroSlide()] }))
  }

  function removeSlide(id: string) {
    setContent(prev => ({ ...prev, heroSlides: prev.heroSlides.filter(s => s.id !== id) }))
  }

  async function handleSlideImage(id: string, file: File | null) {
    if (!file) { patchSlide(id, { image: null }); return }
    setBusySlideId(id)
    try {
      const dataUrl = await fileToDataUrl(file)
      patchSlide(id, { image: dataUrl })
    } finally {
      setBusySlideId(null)
    }
  }

  function handleReset() {
    setContent(DEFAULT_LANDING_CONTENT)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Landing Page Content</h2>
        </div>
        <ButtonTemplate variant="outline" size="sm" label="Reset to Default" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset} />
      </div>

      {/* Hero carousel */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Hero Carousel</p>
          <ButtonTemplate variant="primary" size="sm" label="Add Slide" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addSlide} />
        </div>

        {content.heroSlides.map((slide, i) => (
          <div key={slide.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                Slide {i + 1}
              </div>
              <ButtonTemplate
                variant="danger" size="sm" isIcon tooltip="Remove Slide"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => removeSlide(slide.id)}
                isDisabled={content.heroSlides.length <= 1}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
              <FileUploadTemplate
                accept="image/*"
                initialPreviewUrl={slide.image}
                onChange={file => handleSlideImage(slide.id, file)}
                placeholder={busySlideId === slide.id ? 'Uploading…' : 'Upload slide image'}
              />
              <div className="flex flex-col gap-3">
                <InputTemplate label="Eyebrow" labelVariant="compact" value={slide.eyebrow} onChange={e => patchSlide(slide.id, { eyebrow: e.target.value })} />
                <InputTemplate label="Title" labelVariant="compact" value={slide.title} onChange={e => patchSlide(slide.id, { title: e.target.value })} />
                <TextareaTemplate label="Body" labelVariant="compact" rows={2} value={slide.body} onChange={e => patchSlide(slide.id, { body: e.target.value })} />
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputTemplate label="Primary CTA (Hero)" labelVariant="compact" value={content.heroPrimaryCta} onChange={e => patch({ heroPrimaryCta: e.target.value })} />
          <InputTemplate label="Secondary CTA (Hero)" labelVariant="compact" value={content.heroSecondaryCta} onChange={e => patch({ heroSecondaryCta: e.target.value })} />
        </div>
      </div>

      {/* Live text preview */}
      <div className="rounded-xl border border-gray-200 p-4" style={{ backgroundColor: 'var(--brand-mint)' }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--brand-slate)' }}>Preview</p>
        {content.heroSlides[0] && (
          <div className="flex items-center gap-3">
            {content.heroSlides[0].image && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white">
                <Image src={content.heroSlides[0].image} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>{content.heroSlides[0].eyebrow}</p>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--brand-forest)' }}>{content.heroSlides[0].title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
