'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const TIME_CONTROLS = [
  { label: 'Bullet', options: [
    { time: 60,  inc: 0, display: '1+0' },
    { time: 60,  inc: 1, display: '1+1' },
    { time: 120, inc: 1, display: '2+1' },
  ]},
  { label: 'Blitz', options: [
    { time: 180, inc: 0, display: '3+0' },
    { time: 180, inc: 2, display: '3+2' },
    { time: 300, inc: 0, display: '5+0' },
    { time: 300, inc: 3, display: '5+3' },
  ]},
  { label: 'Rapid', options: [
    { time: 600,  inc: 0,  display: '10+0' },
    { time: 600,  inc: 5,  display: '10+5' },
    { time: 900,  inc: 10, display: '15+10' },
    { time: 1800, inc: 0,  display: '30+0' },
  ]},
]

const SEARCH_TIMES = [4, 5, 7, 8, 10, 11]
let lastSearchTime: number | null = null
let consecutiveCount = 0

function getRandomSearchTime(): number {
  let candidates = SEARCH_TIMES
  // Remove last value if used 3 times in a row
  if (lastSearchTime !== null && consecutiveCount >= 3) {
    candidates = SEARCH_TIMES.filter(t => t !== lastSearchTime)
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  if (picked === lastSearchTime) {
    consecutiveCount++
  } else {
    consecutiveCount = 1
    lastSearchTime = picked
  }
  return picked
}

export default function PlayPage() {
  const [selected, setSelected] = useState<{ time: number; inc: number; display: string } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [gameId, setGameId] = useState<string | null>(null)
  const router = useRouter()

  const handlePlay = async () => {
    if (!selected) return
    setSearching(true)

    // Call find-match API
    const res = await fetch('/api/play/find-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_control: selected.time, increment: selected.inc }),
    })
    const json = await res.json()
    if (!res.ok) { setSearching(false); return }

    const game = json.data.game
    const found = json.data.found

    if (found) {
      // Joined existing game — go straight to game
      router.push(`/play/game?id=${game.id}`)
      return
    }

    // Created new game — wait for opponent
    setGameId(game.id)
    const waitSeconds = getRandomSearchTime()
    setSearchTime(waitSeconds)
    setCountdown(waitSeconds)
  }

  // Countdown timer
  useEffect(() => {
    if (!searching || countdown <= 0 || !gameId) return

    if (countdown === 0) {
      // Time up — start bot game
      startBotGame()
      return
    }

    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [searching, countdown, gameId])

  // When countdown hits 0 start bot
  useEffect(() => {
    if (searching && countdown === 0 && gameId && searchTime > 0) {
      startBotGame()
    }
  }, [countdown])

  // Listen for opponent joining
  useEffect(() => {
    if (!gameId || !searching) return
    const supabase = createClientComponentClient()

    const channel = supabase
      .channel('casual-game-' + gameId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'casual_games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        const updated = payload.new as { status: string; black_player_id: string }
        if (updated.status === 'active' && updated.black_player_id) {
          // Real opponent joined!
          router.push(`/play/game?id=${gameId}`)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, searching])

  const startBotGame = async () => {
    if (!gameId) return
    const res = await fetch('/api/play/start-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId }),
    })
    if (res.ok) {
      router.push(`/play/game?id=${gameId}&bot=true`)
    }
  }

  const cancelSearch = async () => {
    if (gameId) {
      const supabase = createClientComponentClient()
      await supabase.from('casual_games').delete().eq('id', gameId)
    }
    setSearching(false)
    setGameId(null)
    setCountdown(0)
  }

  return (
    <main className="min-h-screen bg-[#080c10] pb-24">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-white transition-colors">
          ← Back
        </button>
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className="w-10" />
      </div>

      {!searching ? (
        <>
          <div className="px-5 mb-6">
            <h2 className="text-white font-bold text-2xl">Quick Play</h2>
            <p className="text-gray-500 text-sm mt-1">Free practice — no entry fee</p>
          </div>

          {/* Time control picker */}
          {TIME_CONTROLS.map(group => (
            <div key={group.label} className="px-5 mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">{group.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {group.options.map(opt => (
                  <button
                    key={opt.display}
                    onClick={() => setSelected(opt)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      selected?.display === opt.display
                        ? 'bg-[#00d4ff] text-black'
                        : 'bg-[#0d1117] border border-[#1e2d3d] text-white hover:border-[#00d4ff]'
                    }`}
                  >
                    {opt.display}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="px-5">
            <button
              onClick={handlePlay}
              disabled={!selected}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                selected
                  ? 'bg-[#00d4ff] hover:bg-[#00b8e0] text-black'
                  : 'bg-[#1e2d3d] text-gray-600 cursor-not-allowed'
              }`}
            >
              {selected ? `Play ${selected.display} ♟` : 'Select a time control'}
            </button>
          </div>
        </>
      ) : (
        // Searching screen
        <div className="flex flex-col items-center justify-center px-5 pt-20">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full border-4 border-[#1e2d3d] flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-4 border-t-[#00d4ff] absolute animate-spin" />
              <span className="text-4xl">♟</span>
            </div>
          </div>

          <h2 className="text-white font-bold text-xl mb-2">Finding opponent...</h2>
          <p className="text-gray-500 text-sm mb-2">{selected?.display} · Free game</p>

          {/* Countdown */}
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl px-8 py-4 mb-8 text-center">
            <p className="text-gray-500 text-xs mb-1">Searching</p>
            <p className="text-[#00d4ff] font-bold text-4xl font-mono">{countdown}s</p>
          </div>

          <p className="text-gray-600 text-xs mb-6">
            No opponent found? Stockfish steps in instantly
          </p>

          <button
            onClick={cancelSearch}
            className="text-gray-500 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#1e2d3d] px-6 py-3 flex items-center justify-around">
        <NavItem icon="🏠" label="Dashboard" onClick={() => router.push('/dashboard')} />
        <NavItem icon="⚡" label="Play" active onClick={() => router.push('/play')} />
        <NavItem icon="💰" label="Wallet" onClick={() => router.push('/wallet')} />
        <NavItem icon="👤" label="Profile" onClick={() => router.push('/profile')} />
      </div>

    </main>
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
