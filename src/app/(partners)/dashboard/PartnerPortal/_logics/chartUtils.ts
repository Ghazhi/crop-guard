export const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  fontSize: 11,
  boxShadow: '0 2px 8px rgba(0,0,0,.06)',
}

export function pct(value: number, max: number) {
  return max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
}
