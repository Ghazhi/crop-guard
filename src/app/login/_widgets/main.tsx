'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'
import { login } from '../_logics/functions'

const BRAND = '#2C5F3F'

export function Main() {
  const router = useRouter()
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login({ username, password })
    setLoading(false)
    if (!result.ok) { setError(result.error ?? 'Login failed.'); return }
    if (result.role === 'partner') router.push('/dashboard/PartnerPortal')
    else if (result.role === 'finance') router.push('/dashboard/FinancePortal')
    else router.push('/dashboard/Dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#e8f5ee' }}>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Logo */}
        <div className="pt-8 pb-5 flex flex-col items-center gap-1">
          <div className="mb-1">
            <svg width="52" height="62" viewBox="0 0 52 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 0C11.64 0 0 11.64 0 26C0 44.2 26 62 26 62C26 62 52 44.2 52 26C52 11.64 40.36 0 26 0Z" fill="#F5A623"/>
              <circle cx="26" cy="24" r="14" fill="white"/>
              <g transform="translate(19, 15)">
                <line x1="7" y1="18" x2="7" y2="8" stroke="#2C5F3F" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13 C7 13 2 11 2 6 C2 6 7 7 7 13Z" fill="#3D7A56"/>
                <path d="M7 11 C7 11 12 9 12 4 C12 4 7 5 7 11Z" fill="#3D7A56"/>
              </g>
            </svg>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold tracking-tight" style={{ color: '#1A3D2B' }}>CropGuard</span>
            <span className="text-xl font-bold" style={{ color: '#F5A623' }}>+</span>
          </div>
          <p className="text-xs tracking-wide" style={{ color: '#5A9E74' }}>Data-smart. Farmer-first.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-4 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-12 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: BRAND }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60 mt-1"
            style={{ backgroundColor: BRAND }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Test credentials */}
        <div className="mx-6 mb-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Test Logins</p>
          {[
            { role: 'Staff',   user: 'staff',   pass: 'staff123'   },
            { role: 'Partner', user: 'partner', pass: 'partner123' },
            { role: 'Finance', user: 'finance', pass: 'finance123' },
          ].map(({ role, user, pass }) => (
            <button key={role} type="button"
              onClick={() => { setUsername(user); setPassword(pass) }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-amber-100 hover:border-amber-300 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-gray-700">{role}</span>
              <span className="text-xs text-gray-400 font-mono">{user} / {pass}</span>
            </button>
          ))}
        </div>

        {/* Terms */}
        <div className="px-6 py-3 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            By signing in, you agree to our{' '}
            <span className="cursor-pointer" style={{ color: '#3D7A56' }}>Terms of Service</span>
            {' '}and{' '}
            <span className="cursor-pointer" style={{ color: '#3D7A56' }}>Privacy Policy</span>.
          </p>
        </div>

        {/* Powered by */}
        <div className="border-t border-gray-100 px-6 py-3 text-center bg-gray-50">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-bold" style={{ color: '#2C5F3F' }}>asinyo</span>
          </p>
        </div>

      </div>
    </div>
  )
}
