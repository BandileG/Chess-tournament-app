'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const TOURNAMENTS = [
  {
    id: 1,
    name: 'Blitzstake Starter',
    entry: 2,
    prize: 16,
    players: 10,
    filled: 3,
    tier: 'Any',
    tierColor: 'text-gray-400',
    starts: 300,
  },
  {
    id: 2,
    name: 'Blitzstake Gambit',
    entry: 5,
    prize: 40,
    players: 10,
    filled: 6,
    tier: 'Beginner+',
    tierColor: 'text-green-400',
    starts: 600,
  },
  {
    id: 3,
    name: 'Blitzstake Premium',
    entry: 8,
    prize: 64,
    players: 10,
    filled: 4,
    tier: 'Intermediate+',
    tierColor: 'text-blue-400',
    starts: 900,
  },
  {
    id: 4,
    name: 'Blitzstake King',
    entry: 10,
    prize: 80,
    players: 10,
    filled: 7,
    tier: 'Pro+',
    tierColor: 'text-purple-400',
    starts: 1200,
  },
  {
    id: 5,
    name: 'Blitzstake Emperor',
    entry: 15,
    prize: 120,
    players: 10,
    filled: 2,
    tier: 'Legend+',
    tierColor: 'text-yellow-400',
    starts: 1500,
  },
  {
    id: 6,
    name: 'Blitzstake Grandmaster',
    entry: 35,
    prize: 280,
    players: 10,
    filled: 1,
    tier: 'Grandmonster',
    tierColor: 'text-red-400',
    starts: 1800,
  },
]

function useCountdown(seconds: number) {
  const [timeLeft, setTimeLeft] = useState(seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : seconds))
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds])
  const m = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const s = String(timeLeft % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function DashboardPage() {
  const [username, setUsername] = useState('Player')
  const [tier, setTier] = useState('Amateur')
  const [balance, setBalance] = useState(0.00)
  const [userId, setUserId] = useState('')
  const [activePlayers] = useState(142)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      if (user.id) setUserId(user.id)
      supabase
        .from('users')
        .select('username, display_name, wallet_balance')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) setUsername(data.username)
          if (data?.wallet_balance) setBalance(data.wallet_balance)
        })
    })
    const savedTier = localStorage.getItem('onboarding_tier')
    if (savedTier) setTier(savedTier)
  }, [router])

  const TIER_COLORS: Record<string, string> = {
    Amateur: 'text-gray-400',
    Beginner: 'text-green-400',
    Intermediate: 'text-blue-400',
    Pro: 'text-purple-400',
    Legend: 'text-yellow-400',
    Expert: 'text-orange-400',
    Grandmonster: 'text-red-400',
  }

  const tierColor = TIER_COLORS[tier] || 'text-gray-400'
  const getHour = () => new Date().getHours()
  const greeting = getHour() < 12 ? 'Good morning' : getHour() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="min-h-screen bg-[#080c10] pb-24">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-green-400 text-xs">💰</span>
          <span className="text-white font-bold text-sm">${balance.toFixed(2)}</span>
          <button
            onClick={() => router.push('/wallet')}
            className="text-[#00d4ff] text-xs ml-1 font-semibold"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Welcome */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">{greeting}</p>
            <p className="text-white font-bold text-lg">{username}</p>
          </div>
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-3 py-2">
            <p className={`font-bold text-sm ${tierColor}`}>{tier}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6 flex gap-3">
        <div className="flex-1 bg-[#0d1117] border border-[#1e2d3d] rounded-2xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">Players Online</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-white font-bold text-lg">{activePlayers}</p>
          </div>
        </div>
        <div className="flex-1 bg-[#0d1117] border border-[#1e2d3d] rounded-2xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">Next Tournament</p>
          <NextTournament />
        </div>
      </div>

      {/* Rules banner */}
      <div className="px-5 mb-6">
        <div className="bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.2)] rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-[#00d4ff] text-lg mt-0.5">⚡</span>
          <div>
            <p className="text-[#00d4ff] text-xs font-semibold mb-1">How tournaments work</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              10 players fill a queue → tournament starts automatically.
              First 10 lock in, remaining players wait for the next round.
              Winners paid out instantly to wallet.
            </p>
          </div>
        </div>
      </div>

      {/* Tournament list */}
      <div className="px-5">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Live Tournaments</p>
        <div className="flex flex-col gap-4">
          {TOURNAMENTS.map(t => (
            <TournamentCard key={t.id} tournament={t} balance={balance} userId={userId} />
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#1e2d3d] px-6 py-3 flex items-center justify-around">
        <NavItem icon="🏠" label="Dashboard" active onClick={() => router.push('/dashboard')} />
        <NavItem icon="💰" label="Wallet" onClick={() => router.push('/wallet')} />
        <NavItem icon="👤" label="Profile" onClick={() => router.push('/profile')} />
        <NavItem icon="📊" label="Leaderboard" onClick={() => router.push('/leaderboard')} />
      </div>

    </main>
  )
}

function NextTournament() {
  const countdown = useCountdown(300)
  return <p className="text-[#00d4ff] font-bold text-lg">{countdown}</p>
}

function TournamentCard({ tournament: t, balance, userId }: {
  tournament: typeof TOURNAMENTS[0]
  balance: number
  userId: string
}) {
  const countdown = useCountdown(t.starts)
  const spotsLeft = t.players - t.filled
  const fillPercent = Math.round((t.filled / t.players) * 100)
  const canAfford = balance >= t.entry
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoin = async () => {
    if (!canAfford || joining) return
    setJoining(true)
    setError(null)

    try {
      const res = await fetch('/api/tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: t.name, entry_fee: t.entry })
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setJoining(false)
        return
      }

      router.push(
        `/tournament/queue?tournament_id=${data.tournament_id}&position=${data.queue_position}&needed=${data.players_needed}`
      )

    } catch {
      setError('Network error. Try again.')
      setJoining(false)
    }
  }

  return (
    <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-bold text-sm">{t.name}</p>
          <p className={`text-xs mt-0.5 ${t.tierColor}`}>{t.tier}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">Prize Pool</p>
          <p className="text-green-400 font-bold text-sm">${t.prize}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <p className="text-gray-500 text-xs">{t.filled}/10 players</p>
          <p className="text-gray-500 text-xs">{spotsLeft} spots left</p>
        </div>
        <div className="w-full bg-[#1e2d3d] rounded-full h-1.5">
          <div
            className="bg-[#00d4ff] h-1.5 rounded-full transition-all"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs">Starts in</p>
          <p className="text-white text-xs font-bold">{countdown}</p>
        </div>
        <button
          onClick={handleJoin}
          disabled={!canAfford || joining}
          className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
            canAfford
              ? 'bg-[#00d4ff] hover:bg-[#00b8e0] text-black'
              : 'bg-[#1e2d3d] text-gray-600 cursor-not-allowed'
          }`}
        >
          {joining ? 'Joining...' : canAfford ? `Join — $${t.entry}` : 'Fund Wallet'}
        </button>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span className="text-xl">{icon}</span>
      <span className={`text-xs ${active ? 'text-[#00d4ff]' : 'text-gray-600'}`}>{label}</span>
    </button>
  )
}
