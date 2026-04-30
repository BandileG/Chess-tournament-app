'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIERS = [
  { range: '0 – 150', title: 'Amateur', color: 'text-gray-400', min: 0, max: 150 },
  { range: '150 – 300', title: 'Beginner', color: 'text-green-400', min: 150, max: 300 },
  { range: '300 – 500', title: 'Intermediate', color: 'text-blue-400', min: 300, max: 500 },
  { range: '500 – 800', title: 'Pro', color: 'text-purple-400', min: 500, max: 800 },
  { range: '800 – 1200', title: 'Legend', color: 'text-yellow-400', min: 800, max: 1200 },
  { range: '1200 – 1500', title: 'Expert', color: 'text-orange-400', min: 1200, max: 1500 },
  { range: '1500 – 2500', title: 'Grandmonster', color: 'text-red-400', min: 1500, max: 2500 },
]

function getTier(elo: number) {
  return TIERS.find(t => elo >= t.min && elo < t.max) || TIERS[0]
}

export default function EloPage() {
  const [platform] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('onboarding_platform') || '' : ''
  )
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [elo, setElo] = useState<number | null>(null)
  const [tier, setTier] = useState<typeof TIERS[0] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const verifyElo = async () => {
    if (!username.trim()) return
    setLoading(true)
    setError(null)
    try {
      let fetchedElo = 0

      if (platform === 'chess.com' || platform === 'both') {
        const res = await fetch(
          `https://api.chess.com/pub/player/${username.trim()}/stats`
        )
        if (res.ok) {
          const data = await res.json()
          const rapid = data?.chess_rapid?.last?.rating || 0
          const blitz = data?.chess_blitz?.last?.rating || 0
          const bullet = data?.chess_bullet?.last?.rating || 0
          fetchedElo = Math.max(rapid, blitz, bullet)
        } else {
          setError('Chess.com username not found. Please check and try again.')
          setLoading(false)
          return
        }
      }

      if (platform === 'lichess' || platform === 'both') {
        const res = await fetch(
          `https://lichess.org/api/user/${username.trim()}`
        )
        if (res.ok) {
          const data = await res.json()
          const rapid = data?.perfs?.rapid?.rating || 0
          const blitz = data?.perfs?.blitz?.rating || 0
          const bullet = data?.perfs?.bullet?.rating || 0
          const lichessElo = Math.max(rapid, blitz, bullet)
          fetchedElo = Math.max(fetchedElo, lichessElo)
        } else {
          setError('Lichess username not found. Please check and try again.')
          setLoading(false)
          return
        }
      }

      if (fetchedElo === 0) {
        setError('Could not fetch rating. Make sure you have played rated games.')
        setLoading(false)
        return
      }

      const assignedTier = getTier(fetchedElo)
      setElo(fetchedElo)
      setTier(assignedTier)
      setVerified(true)
      localStorage.setItem('onboarding_elo', String(fetchedElo))
      localStorage.setItem('onboarding_tier', assignedTier.title)
      localStorage.setItem('onboarding_username_platform', username.trim())

    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const handleNext = () => router.push('/onboarding/fairplay')

  if (platform === 'none' || !platform) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="flex gap-2 mb-10 justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`h-1 w-12 rounded-full ${
                i === 2 ? 'bg-[#00d4ff]' : i < 2 ? 'bg-[#00d4ff]/40' : 'bg-[#1e2d3d]'
              }`} />
            ))}
          </div>

          <div className="text-center mb-3">
            <h1 className="text-2xl font-bold text-white">What's your chess level?</h1>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
            <span className="text-yellow-400 text-lg mt-0.5">⚠️</span>
            <p className="text-yellow-400/80 text-xs">
              Since you're not verifying your ELO, your account will be marked as 
              unverified and monitored more closely for fair play.
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {TIERS.map(t => (
              <button
                key={t.title}
                onClick={() => {
                  const midElo = Math.floor((t.min + t.max) / 2)
                  localStorage.setItem('onboarding_elo', String(midElo))
                  localStorage.setItem('onboarding_tier', t.title)
                  localStorage.setItem('onboarding_verified', 'false')
                  router.push('/onboarding/fairplay')
                }}
                className="py-4 px-5 rounded-2xl border border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060] text-left transition-all flex items-center justify-between"
              >
                <span className={`font-bold text-sm ${t.color}`}>{t.title}</span>
                <span className="text-gray-500 text-xs">{t.range}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="flex gap-2 mb-10 justify-center">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 w-12 rounded-full ${
              i === 2 ? 'bg-[#00d4ff]' : i < 2 ? 'bg-[#00d4ff]/40' : 'bg-[#1e2d3d]'
            }`} />
          ))}
        </div>

        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold text-white">Verify your ELO</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your {platform === 'both' ? 'Chess.com or Lichess' : platform} username
          </p>
        </div>

        <div className="bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.2)] rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-[#00d4ff] text-lg mt-0.5">🔒</span>
          <p className="text-gray-400 text-xs">
            We only read your public rating. We never access your account, 
            password, or any private data.
          </p>
        </div>

        {!verified ? (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-2 block">
                {platform === 'lichess' ? 'Lichess' : 'Chess.com'} username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your username..."
                onKeyDown={e => e.key === 'Enter' && verifyElo()}
                className="w-full bg-[#161b22] border border-[#1e2d3d] text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
              />
            </div>

            <button
              onClick={verifyElo}
              disabled={loading || !username.trim()}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm mb-4"
            >
              {loading ? 'Verifying...' : 'Verify ELO →'}
            </button>

            <button
              onClick={() => {
                localStorage.setItem('onboarding_platform', 'none')
                router.push('/onboarding/elo')
              }}
              className="w-full text-gray-600 text-xs hover:text-gray-400 transition-colors py-2"
            >
              Skip verification (not recommended)
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 mb-6">
              <p className="text-gray-400 text-sm mb-2">Verified ELO</p>
              <p className="text-5xl font-bold text-white mb-3">{elo}</p>
              <p className={`text-xl font-bold ${tier?.color}`}>{tier?.title}</p>
              <p className="text-gray-500 text-xs mt-2">from @{username}</p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2 justify-center">
              <span>✓</span>
              <span>ELO verified successfully!</span>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-black font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
