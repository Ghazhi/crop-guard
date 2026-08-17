'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const BRAND = '#2C5F3F'
const DEMO_OTP = '123456'

type Step = 'identify' | 'otp' | 'reset' | 'done'

export function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('identify')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function sendCode() {
    if (!identifier.trim()) return
    toast.info(`Demo mode: use code ${DEMO_OTP}`)
    setStep('otp')
  }

  function verifyOtp() {
    if (otp !== DEMO_OTP) {
      setOtpError('Incorrect code. Try again.')
      return
    }
    setOtpError('')
    setStep('reset')
  }

  const pwValid = newPassword.length >= 6 && newPassword === confirmPassword

  function resetPassword() {
    if (!pwValid) return
    setStep('done')
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 pt-1">
        {(['identify', 'otp', 'reset'] as Step[]).map((s, i) => {
          const order = ['identify', 'otp', 'reset', 'done']
          const currentIdx = order.indexOf(step)
          const stepIdx = order.indexOf(s)
          const reached = currentIdx >= stepIdx
          return (
            <div key={s} className="flex items-center flex-1 gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ backgroundColor: reached ? BRAND : '#e5e7eb', color: reached ? 'white' : '#9ca3af' }}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="flex-1 h-0.5" style={{ backgroundColor: reached && currentIdx > stepIdx ? BRAND : '#e5e7eb' }} />}
            </div>
          )
        })}
      </div>

      {step === 'identify' && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Forgot your password?</p>
            <p className="text-xs text-gray-500 mt-1">Enter your username or email and we&apos;ll send you a verification code.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Username or Email</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-4 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!identifier.trim()}
            onClick={sendCode}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            Send code
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Enter verification code</p>
            <p className="text-xs text-gray-500 mt-1">We sent a 6-digit code to <span className="font-medium">{identifier}</span>. (Demo: use {DEMO_OTP})</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Verification Code</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <ShieldCheck className="w-4 h-4" />
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-4 rounded-xl border text-sm text-gray-700 tracking-widest focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
            </div>
            {otpError && <p className="text-xs text-red-600">{otpError}</p>}
          </div>
          <button
            type="button"
            disabled={otp.length !== 6}
            onClick={verifyOtp}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            Verify
          </button>
          <button type="button" onClick={sendCode} className="text-xs font-medium text-center" style={{ color: BRAND }}>
            Resend code
          </button>
        </div>
      )}

      {step === 'reset' && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Set a new password</p>
            <p className="text-xs text-gray-500 mt-1">Choose a new password for your account.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>New Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-12 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ backgroundColor: '#fefce8', borderColor: '#e9e9c8' }}
                className="w-full h-12 pl-10 pr-12 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: BRAND }}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>
          <button
            type="button"
            disabled={!pwValid}
            onClick={resetPassword}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            Reset Password
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="w-12 h-12" style={{ color: BRAND }} />
          <p className="text-sm font-semibold" style={{ color: '#1A3D2B' }}>Password reset successful</p>
          <p className="text-xs text-gray-500">You can now sign in with your new password.</p>
          <button
            type="button"
            onClick={onBack}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold transition-opacity mt-2"
            style={{ backgroundColor: BRAND }}
          >
            Back to Sign in
          </button>
        </div>
      )}

      {step !== 'done' && (
        <button type="button" onClick={onBack} className="text-xs font-medium text-center w-full" style={{ color: '#6b7280' }}>
          Back to Sign in
        </button>
      )}
    </div>
  )
}
