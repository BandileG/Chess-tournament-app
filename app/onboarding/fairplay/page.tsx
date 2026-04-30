'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const PLEDGES = [
  {
    id: 'no_engine',
    text: 'I will not use chess engines or any outside assistance during live matches',
    icon: '🤖',
  },
  {
    id: 'one_account',
    text: 'I confirm this is my only Blitzstake account and I will not create others',
    icon: '👤',
  },
  {
    id: 'real_money',
    text: 'I understand entry fees are real money and non-refundable once a tournament starts',
    icon: '💸',
  },
  {
    id: 'no_sharing',
    text: 'I will not share my screen or board position to anyone during live matches',
    icon: '🚫',
  },
  {
    id: 'monitoring',
    text: 'I understand my move patterns and timing are monitored automatically and unusual activity may result in an instant account freeze',
    icon: '🔍',
  },
  {
    id: 'age',
    text: 'I am 18 years or older and legally allowed to participate in skill-based competitions in my region',
    icon: '⚖️',
  },
]

export default function FairPlayPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const allChecked = PLEDGES.every(p => checked[p.id])

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleContinue = async () => {
    if (!allChecked) return
    setLoading(true)
    setError(null)

    const supabase = createClientComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expired. Please log in again.')
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase
      .from('users')
      .update({
        fair_play_agreed: true,
        fair_play_timestamp: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (dbError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/onboarding/experience')
  }

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex gap-2 mb-10 justify-center">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 w-12 rounded-full ${
              i <= 3 ? 'bg-[#00d4ff]' : 'bg-[#1e2d3d]'
            }`} />
          ))}
        </div>

        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold text-white">Fair Play Pledge</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Read and accept each commitment to continue
          </p>
        </div>

        {/* Warning banner */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⚠️</span>
          <p className="text-red-400/80 text-xs">
            Violations of any of these commitments will result in permanent account suspension 
            and forfeiture of wallet balance with no appeal.
          </p>
        </div>

        {/* Pledges */}
        <div className="flex flex-col gap-3 mb-8">
          {PLEDGES.map(pledge => (
            <button
              key={pledge.id}
              onClick={() => toggle(pledge.id)}
              className={`py-4 px-5 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                checked[pledge.id]
                  ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.06)]'
                  : 'border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060]'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked[pledge.id]
                  ? 'border-[#00d4ff] bg-[#00d4ff]'
                  : 'border-[#2d4060]'
              }`}>
                {checked[pledge.id] && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">{pledge.icon}</span>
                <p className="text-gray-300 text-sm leading-relaxed">{pledge.text}</p>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!allChecked || loading}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Saving...' : allChecked ? 'I Pledge — Continue →' : `${PLEDGES.filter(p => checked[p.id]).length} of ${PLEDGES.length} accepted`}
        </button>

      </div>
    </main>
  )
}
