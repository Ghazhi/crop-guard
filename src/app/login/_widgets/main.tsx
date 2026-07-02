'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { login } from '../_logics/functions'

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
    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#e8f5ee' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">

        {/* Logo */}
        <div className="pt-8 pb-4 flex flex-col items-center gap-1">
          {/* Pin icon */}
          <div className="relative mb-1">
            <svg width="52" height="62" viewBox="0 0 52 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Pin body */}
              <path
                d="M26 0C11.64 0 0 11.64 0 26C0 44.2 26 62 26 62C26 62 52 44.2 52 26C52 11.64 40.36 0 26 0Z"
                fill="#F5A623"
              />
              {/* Inner circle */}
              <circle cx="26" cy="24" r="14" fill="white" />
              {/* Seedling */}
              <g transform="translate(19, 15)">
                {/* stem */}
                <line x1="7" y1="18" x2="7" y2="8" stroke="#2C5F3F" strokeWidth="1.5" strokeLinecap="round"/>
                {/* left leaf */}
                <path d="M7 13 C7 13 2 11 2 6 C2 6 7 7 7 13Z" fill="#3D7A56"/>
                {/* right leaf */}
                <path d="M7 11 C7 11 12 9 12 4 C12 4 7 5 7 11Z" fill="#3D7A56"/>
              </g>
            </svg>
          </div>

          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold tracking-tight" style={{ color: '#1A3D2B' }}>CropGuard</span>
            <span className="text-xl font-bold" style={{ color: '#F5A623' }}>+</span>
          </div>
          <p className="text-xs text-gray-400 tracking-wide">Data-smart. Farmer-first.</p>
        </div>

        {/* Subtitle */}
        <p className="text-center text-sm text-gray-500 mb-6">Sign in to access your account</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#3D7A56] focus:ring-2 focus:ring-[#3D7A56]/20 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#3D7A56] focus:ring-2 focus:ring-[#3D7A56]/20 transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <ButtonTemplate
            type="submit"
            label={loading ? 'Signing in…' : 'Sign In'}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading}
            isDisabled={loading}
          />
        </form>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed">
            By signing in, you agree to our{' '}
            <span className="cursor-pointer" style={{ color: '#3D7A56' }}>Terms of Service</span>
            {' '}and{' '}
            <span className="cursor-pointer" style={{ color: '#3D7A56' }}>Privacy Policy</span>.
          </p>
          <p className="text-xs cursor-pointer" style={{ color: '#3D7A56' }}>
            Need help? Contact our support team
          </p>
          <p className="text-xs text-gray-400 pt-1">
            Powered by <span className="font-bold" style={{ color: '#3D7A56' }}>asinyo</span>
          </p>
        </div>

      </div>
    </div>
  )
}
