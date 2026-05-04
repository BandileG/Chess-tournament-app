'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Unpredictable delays — feels human, never too long
const MATCH_DELAYS = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 11000, 12000]

function getRandomDelay() {
  return MATCH_DELAYS[Math.floor(Math.random() * MATCH_DELAYS.length)]
}

// Messages that reinforce the "real players" illusion
const SEARCH_PHASES = [
  { message: 'Searching for an opponent...', sub: 'Matching you with a player nearby' },
  { message: 'Opponent found!', sub: 'Waiting for them to accept...' },
  { message: 'Setting up the board...', sub: 'Get ready to play' },
]

// Fake player names to flash during search
const FAKE_PLAYERS = [
  'KingSlayer_ZA', 'ChessWolf99', 'QueenGambit', 'BlitzMaster',
  'NightRider_SA', 'PawnStorm', 'CheckMateKing', 'RookRush',
  'SilentBishop', 'KnightFury', 'EndgameElite', 'TacticalGenius',
]

function getRandomPlayer() {
  return FAKE_PLAYERS[Math.floor(Math.random() * FAKE_PLAYERS.length)]
}

export default function PlayPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [phase, setPhase] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [dots, setDots] = useState('')
  const [flashPlayer, setFlashPlayer] = useState('')
  const [opponentFound, setOpponentFound] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const cancelledRef = useRef(false)

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Elapsed counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Flash fake player names during search to feel like real matchmaking
  useEffect(() => {
    if (opponentFound) return
    setFlashPlayer(getRandomPlayer())
    const interval = setInterval(() => {
      setFlashPlayer(getRandomPlayer())
    }, 800)
    return () => clearInterval(interval)
  }, [opponentFound])

  // Main matchmaking flow
  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Phase 1 — searching
      setPhase(0)
      const delay = getRandomDelay()
      await new Promise(resolve => setTimeout(resolve, delay))
      if (cancelledRef.current) return

      // Phase 2 — opponent "found"
      setPhase(1)
      setOpponentFound(true)
      await new Promise(resolve => setTimeout(resolve, 1500))
      if (cancelledRef.current) return

      // Phase 3 — setting up board
      setPhase(2)
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (cancelledRef.current) return

      // Create game in casual_games
      const { data: game, error } = await supabase
        .from('casual_games')
        .insert({
          white_player_id: user.id,
          black_player_id: null,
          status: 'active',
          time_control: 300,
          increment: 0,
          current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          white_time_remaining: 300000,
          black_time_remaining: 300000,
          is_vs_bot: true,
          move_count: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !game) {
        console.error('Failed to create game:', error)
        router.push('/dashboard')
        return
      }

      if (cancelledRef.current) return

      // Assign bot
      const res = await fetch('/api/play/start-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: game.id }),
      })

      if (!res.ok) {
        router.push('/dashboard')
        return
      }

      if (cancelledRef.current) return

      // Go to game
      router.push(`/play/game?id=${game.id}&bot=true`)
    }

    run()
  }, [])

  const handleCancel = () => {
    cancelledRef.current = true
    setCancelled(true)
    router.push('/dashboard')
  }

  const currentPhase = SEARCH_PHASES[phase]

  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center px-5">

      {/* Logo */}
      <h1 className="text-lg font-bold mb-12 absolute top-6 left-5">
        <span className="text-[#00d4ff]">BLITZ</span>
        <span className="text-white">STAKE</span>
      </h1>

      {/* Main card */}
      <div className="w-full max-w-sm">

        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24">
            <div className={`w-24 h-24 rounded-full border-4 absolute animate-spin ${
              opponentFound
                ? 'border-t-green-400 border-r-transparent border-b-transparent border-l-transparent'
                : 'border-t-[#00d4ff] border-r-transparent border-b-transparent border-l-transparent'
            }`} />
            <div className="w-24 h-24 rounded-full border-4 border-[#1e2d3d] absolute" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">
                {opponentFound ? '⚡' : '♟️'}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentPhase.message}{!opponentFound ? dots : ''}
          </h2>
          <p className="text-gray-500 text-sm">{currentPhase.sub}</p>
        </div>

        {/* Players card */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">

            {/* You */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-14 h-14 rounded-full bg-[#00d4ff]/10 border-2 border-[#00d4ff]/40 flex items-center justify-center text-2xl">
                ♙
              </div>
              <p className="text-white text-xs font-bold">You</p>
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center gap-1 px-4">
              <p className="text-gray-600 text-xs font-bold">VS</p>
              {/* Connecting dots */}
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e2d3d] animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e2d3d] animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e2d3d] animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl transition-all duration-300 ${
                opponentFound
                  ? 'bg-green-500/10 border-green-500/40'
                  : 'bg-[#1e2d3d] border-[#1e2d3d]'
              }`}>
                {opponentFound ? '♟' : '?'}
              </div>
              <p className={`text-xs font-bold transition-all duration-300 ${
                opponentFound ? 'text-green-400' : 'text-gray-600'
              }`}>
                {opponentFound ? 'Found!' : flashPlayer}
              </p>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                opponentFound ? 'bg-green-400 animate-pulse' : 'bg-gray-700 animate-pulse'
              }`} />
            </div>

          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <p className="text-gray-600 text-xs ml-2">{elapsed}s</p>
        </div>

        {/* Info banner */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 mb-6">
          <p className="text-gray-500 text-xs text-center leading-relaxed">
            🌍 Matching you with players from your region · 5 min blitz
          </p>
        </div>

        {/* Cancel */}
        {!opponentFound && (
          <button
            onClick={handleCancel}
            className="w-full text-gray-600 text-xs hover:text-gray-400 transition-colors py-2"
          >
            Cancel search
          </button>
        )}

      </div>
    </main>
  )
}