'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function QueueContent() {
  const [position, setPosition] = useState<number | null>(null)
  const [playersNeeded, setPlayersNeeded] = useState<number | null>(null)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'waiting' | 'starting' | 'redirecting'>('waiting')
  const [filledSpots, setFilledSpots] = useState(1)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── Find match and redirect ─────────────────────────────────────────────
  const findMatchAndRedirect = useCallback(async (tid: string, uid: string) => {
    setStatus('starting')

    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch(
          `/api/tournament/match-id?tournament_id=${tid}&user_id=${uid}`
        )
        const json = await res.json()

        if (res.ok && json.data?.id) {
          setStatus('redirecting')
          router.push(`/tournament/match?match_id=${json.data.id}`)
          return
        }
      } catch (err) {
        console.error('Match fetch error:', err)
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    // Fallback — could not find match
    router.push('/dashboard')
  }, [router])

  // ─── Init: get params + user ─────────────────────────────────────────────
  useEffect(() => {
    const pos = searchParams.get('position')
    const needed = searchParams.get('needed')
    const tid = searchParams.get('tournament_id')

    if (pos) setPosition(parseInt(pos))
    if (needed) {
      const n = parseInt(needed)
      setPlayersNeeded(n)
      setFilledSpots(10 - n)
    }
    if (tid) setTournamentId(tid)

    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [searchParams])

  // ─── Check immediately + realtime listener ───────────────────────────────
  useEffect(() => {
    if (!tournamentId || !userId) return

    const supabase = createClientComponentClient()

    // 1. Check if match already exists (e.g. bracket already generated)
    const checkExisting = async () => {
      try {
        const res = await fetch(
          `/api/tournament/match-id?tournament_id=${tournamentId}&user_id=${userId}`
        )
        const json = await res.json()
        if (res.ok && json.data?.id) {
          setStatus('redirecting')
          router.push(`/tournament/match?match_id=${json.data.id}`)
          return true
        }
      } catch {}
      return false
    }

    checkExisting()

    // 2. Also watch tournament for status change to in_progress
    const channel = supabase
      .channel('queue-tournament-' + tournamentId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      }, async (payload) => {
        const updated = payload.new as {
          status: string
          current_players: number
        }

        setFilledSpots(updated.current_players)
        setPlayersNeeded(10 - updated.current_players)

        if (updated.status === 'in_progress') {
          await findMatchAndRedirect(tournamentId, userId)
        }
      })
      .subscribe()

    // 3. Also poll every 3 seconds as a safety net
    const poll = setInterval(async () => {
      const found = await checkExisting()
      if (found) clearInterval(poll)
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [tournamentId, userId, findMatchAndRedirect, router])

  const getStatusText = () => {
    if (status === 'redirecting') return 'Starting your match...'
    if (status === 'starting') return 'Setting up your board...'
    return 'Finding opponents'
  }

  const getSubText = () => {
    if (status === 'redirecting' || status === 'starting') return 'Get ready to play!'
    const n = playersNeeded ?? 9
    return `Waiting for ${n} more player${n === 1 ? '' : 's'} to join`
  }

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">

        {/* Logo */}
        <h1 className="text-xl font-bold mb-10">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>

        {/* Spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-[#1e2d3d] flex items-center justify-center">
            <div className={`w-24 h-24 rounded-full border-4 absolute animate-spin ${
              status === 'starting' || status === 'redirecting'
                ? 'border-t-[#f5a623] border-r-transparent border-b-transparent border-l-transparent'
                : 'border-t-[#00d4ff] border-r-transparent border-b-transparent border-l-transparent'
            }`} />
            <span className="text-3xl z-10">
              {status === 'redirecting' ? '⚡' : status === 'starting' ? '⚡' : '♟️'}
            </span>
          </div>
        </div>

        {/* Status text */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {getStatusText()}
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          {getSubText()}
        </p>

        {/* Position card */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-xs mb-1">Your position</p>
          <p className="text-4xl font-bold text-white">
            #{position ?? 1} <span className="text-gray-600 text-2xl">of 10</span>
          </p>
        </div>

        {/* Player dots */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                i < filledSpots
                  ? 'bg-[#00d4ff] shadow-[0_0_6px_rgba(0,212,255,0.5)]'
                  : 'bg-[#1e2d3d]'
              }`}
            />
          ))}
        </div>

        <p className="text-gray-600 text-xs mb-8">
          {filledSpots} of 10 players joined
        </p>

        {/* Cancel button — only show while waiting */}
        {status === 'waiting' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Cancel and return to dashboard
          </button>
        )}

        {/* Loading indicator when finding match */}
        {(status === 'starting' || status === 'redirecting') && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

      </div>
    </main>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <QueueContent />
    </Suspense>
  )
}
