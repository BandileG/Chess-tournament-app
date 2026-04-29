'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-bold text-[#00d4ff] tracking-tight mb-4">
            BLITZ<span className="text-white">STAKE</span>
          </h1>
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm">
              We sent a confirmation link to <span className="text-white">{email}</span>. 
              Click it to activate your account.
            </p>
            <Link href="/login" className="block mt-6 text-[#00d4ff] hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#00d4ff] tracking-tight">
            BLITZ<span className="text-white">STAKE</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Real-time chess tournaments</p>
        </div>
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create account</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="chessmasterX"
              className="w-full bg-[#161b22] border border-[#1e2d3d] text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#161b22] border border-[#1e2d3d] text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <div className="mb-6">
            <label className="text-gray-400 text-sm mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-[#161b22] border border-[#1e2d3d] text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00d4ff] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
