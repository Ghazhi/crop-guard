'use client'

import { useState, useEffect } from 'react'

export function usePartnerId(defaultId = 'p-001') {
  const [partnerId, setPartnerId] = useState(defaultId)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s?.user?.partnerId) setPartnerId(s.user.partnerId) })
      .catch(() => {})
  }, [])

  return partnerId
}
