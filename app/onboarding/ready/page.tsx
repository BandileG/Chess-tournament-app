'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const TIER_COLORS: Record<string, string> = {
  Amateur: 'text-gray-400',
  Beginner: 'text-green-400',
  Intermediate: 'text-blue-400',
  Pro: 'text-purple-400',
  Legend: 'text-yellow-400',
  Expert: 'text-orange-400',
  Grandmonster: 'text-red-400',
}

export default function ReadyPage() {
  const [loading, setLoading] = useState(false)
  const [tier, setTier] = useState('')
  const [elo, setElo] = useState('')
  const [verified, setVerified] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setTier(localStorage.getItem('onboarding_tier') || 'Amateur')
    setElo(localStorage.getItem('onboarding_elo') || '0')
    setVerified(localStorage.getItem('onboarding_verified') !== 'false')
  }, [])

  const handleEnterLobby = async () => {
    setLoading(true)
    const supabase = createClientComponentClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('users')
        .update({ onboarded: true })
        .eq('id', user.id)
    }

    router.push('/dashboard')
  }

  const tierColor = TIER_COLORS[tier] || 'text-gray-400'

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Progress — all complete */}
        <div className="flex gap-2 mb-10 justify-center">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-1 w-12 rounded-full bg-[#00d4ff]" />
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏁</div>
          <h1 className="text-3xl font-bold text-white">You're all set</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your account is ready. Welcome to Blitzstake.
          </p>
        </div>

        {/* Profile summary card */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-xs mb-4 uppercase tracking-widest">Your Profile</p>

          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Tier</span>
            <span className={`font-bold text-sm ${tierColor}`}>{tier}</span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">ELO Rating</span>
            <span className="text-white font-bold text-sm">{elo}</span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Verification</span>
            {verified ? (
              <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                <span>✓</span> Verified
              </span>
            ) : (
              <span className="text-yellow-400 text-sm font-bold flex items-center gap-1">
                <span>⚠️</span> Unverified
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Fair Play</span>
            <span className="text-green-400 text-sm font-bold flex items-center gap-1">
              <span>✓</span> Pledged
            </span>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.2)] rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-[#00d4ff] text-lg mt-0.5">⚡</span>
          <div>
            <p className="text-[#00d4ff] text-sm font-semibold">What's next</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Deposit into your wallet, pick a tournament that matches your tier, and start playing. Good luck.
            </p>
          </div>
        </div>

        <button
          onClick={handleEnterLobby}
          disabled={loading}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Loading...' : 'Enter Lobby →'}
        </button>

      </div>
    </main>
  )
}
