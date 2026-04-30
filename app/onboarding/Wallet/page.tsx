'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const HOW_IT_WORKS = [
  {
    icon: '💰',
    title: 'Deposits',
    color: 'text-green-400',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    description: 'Add real money to your Blitzstake wallet. Minimum deposit is $5. Your balance is stored securely and only used when you join a tournament.',
  },
  {
    icon: '🏆',
    title: 'Entry Fees',
    color: 'text-[#00d4ff]',
    border: 'border-[#00d4ff]/20',
    bg: 'bg-[#00d4ff]/5',
    description: 'Each tournament has an entry fee. When you join, the fee is deducted from your wallet instantly. Fees go into the prize pool shared by winners.',
  },
  {
    icon: '💸',
    title: 'Payouts',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
    description: 'Win matches and tournaments to earn payouts. Winnings are added to your wallet automatically. You can withdraw anytime to your linked payment method.',
  },
]

export default function WalletIntroPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleContinue = async () => {
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
      .update({ wallet_intro_seen: true })
      .eq('id', user.id)

    if (dbError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/onboarding/fairplay')
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
          <h1 className="text-2xl font-bold text-white">How your wallet works</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Blitzstake uses real money — understand this before you play
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-yellow-400 text-lg mt-0.5">⚠️</span>
          <p className="text-yellow-400/80 text-xs">
            Entry fees are real money and non-refundable once a tournament starts. 
            Only deposit what you can afford to lose.
          </p>
        </div>

        {/* How it works cards */}
        <div className="flex flex-col gap-4 mb-8">
          {HOW_IT_WORKS.map(item => (
            <div
              key={item.title}
              className={`rounded-2xl border ${item.border} ${item.bg} px-5 py-4 flex items-start gap-4`}
            >
              <span className="text-2xl mt-0.5">{item.icon}</span>
              <div>
                <p className={`font-bold text-sm mb-1 ${item.color}`}>{item.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Minimum deposit notice */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-5 py-4 mb-8 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-1">Minimum deposit</p>
            <p className="text-white font-bold text-lg">$5.00</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Minimum entry fee</p>
            <p className="text-white font-bold text-lg">$1.00</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Withdrawal</p>
            <p className="text-white font-bold text-lg">Anytime</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'I Understand — Continue →'}
        </button>

      </div>
    </main>
  )
}
