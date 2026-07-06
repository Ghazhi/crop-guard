'use client'

const EMOJIS = [
  '👨🏿‍🌾','👩🏿‍🌾','👨🏾‍🌾','👩🏾‍🌾','👨🏽‍🌾','👩🏽‍🌾',
  '🧑🏿‍🌾','🧑🏾‍🌾','🧑🏽‍🌾',
  '👨🏿','👩🏿','👨🏾','👩🏾','👨🏽','👩🏽',
  '🧑🏿','🧑🏾','🧑🏽',
]

const BG_COLORS = [
  '#d1fae5','#dbeafe','#fef3c7','#ede9fe','#fce7f3',
  '#e0f2fe','#dcfce7','#fef9c3','#f3e8ff','#ffedd5',
]

function pickByName(arr: string[], name: string): string {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return arr[hash % arr.length]
}

interface PersonAvatarProps {
  name:     string
  size?:    number
  shape?:   'circle' | 'square'
  className?: string
}

export function PersonAvatar({ name, size = 32, shape = 'circle', className = '' }: PersonAvatarProps) {
  const radius  = shape === 'square' ? 'rounded-lg' : 'rounded-full'
  const emoji   = pickByName(EMOJIS, name)
  const bg      = pickByName(BG_COLORS, name + 'bg')

  return (
    <div
      className={`flex items-center justify-center shrink-0 select-none ${radius} ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.round(size * 0.55) }}
    >
      {emoji}
    </div>
  )
}
