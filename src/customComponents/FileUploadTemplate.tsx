'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Image as ImageIcon, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileUploadTemplateProps {
  /** Visual layout — 'dropzone' is the large dashed box, 'compact' is a small inline row */
  variant?: 'dropzone' | 'compact'
  /** Label shown above the control (uses compact uppercase style) */
  label?: string
  /** Whether the field is required — appends a red asterisk to the label */
  isRequired?: boolean
  /** Accepted file types passed to the <input> accept attribute, e.g. "image/*" or ".csv" */
  accept?: string
  /** Currently selected file (controlled) */
  value?: File | null
  /** Called when the user picks or clears a file */
  onChange?: (file: File | null) => void
  /** Placeholder text shown inside the upload area when no file is selected */
  placeholder?: string
  /** Additional class names on the root wrapper */
  className?: string
  /** Disables the control */
  isDisabled?: boolean
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export function FileUploadTemplate({
  variant = 'dropzone',
  label,
  isRequired = false,
  accept,
  value,
  onChange,
  placeholder,
  className,
  isDisabled = false,
}: FileUploadTemplateProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File | null) {
    if (!file) {
      setPreview(null)
      onChange?.(null)
      return
    }
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
    onChange?.(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (isDisabled) return
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    handleFile(null)
  }

  const defaultPlaceholder =
    accept?.includes('image') ? 'Upload photo' :
    accept?.includes('csv')   ? 'Click to select a CSV file' :
    'Click to upload file'

  const placeholderText = placeholder ?? defaultPlaceholder

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-slate)' }}>
            {label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-gray-300 cursor-pointer transition-colors text-xs text-gray-500',
            isDisabled ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50',
            value && 'border-solid border-gray-200 bg-gray-50',
          )}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          {value ? (
            <span className="flex-1 truncate font-medium text-gray-700">{value.name}</span>
          ) : (
            <span className="flex-1 truncate">{placeholderText}</span>
          )}
          {value && !isDisabled && (
            <button type="button" onClick={clear} className="shrink-0 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onInputChange} />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--brand-slate)' }}>
          {label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </p>
      )}

      <div
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
          value ? 'border-gray-200 bg-gray-50' : 'border-gray-200',
          dragging && !isDisabled && 'border-(--brand-green) bg-(--brand-mint)',
          isDisabled ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50',
          preview ? 'p-0 overflow-hidden h-36' : 'py-8',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <>
            <Image src={preview} alt="preview" fill className="object-cover" />
            {!isDisabled && (
              <button type="button" onClick={clear}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : value ? (
          <>
            <FileText className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 text-center px-4 truncate max-w-full">{value.name}</p>
            {!isDisabled && (
              <button type="button" onClick={clear}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Remove
              </button>
            )}
          </>
        ) : (
          <>
            <ImageIcon className="w-7 h-7 text-gray-300" />
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500">{placeholderText}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">or drag and drop</p>
            </div>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onInputChange} />
    </div>
  )
}

/*
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'

// Photo dropzone (shows image preview after selection)
<FileUploadTemplate
  label="Community Photo"
  accept="image/*"
  value={photoFile}
  onChange={setPhotoFile}
/>

// CSV / document dropzone
<FileUploadTemplate
  label="Import CSV"
  accept=".csv"
  placeholder="Click to select a CSV file"
  value={csvFile}
  onChange={setCsvFile}
/>

// Compact inline row (amenity photo, small attachments)
<FileUploadTemplate
  variant="compact"
  label="Photo"
  accept="image/*"
  value={amenityPhoto}
  onChange={setAmenityPhoto}
/>
*/
