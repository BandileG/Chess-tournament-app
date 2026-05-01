'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function QueueContent() {
  const [position, setPosition] = useState<number | null>(null)
  const [playersNeeded, setPlayersNeeded] = useState<number | null>(null)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'waiting' | 'starting' | 'active'>('waiting')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get params and current user
  useEffect(() => {
    const pos = searchParams.get('position')
    const needed = searchParams.get('needed')
    const tid = searchParams.get('tournament_id')
    if (pos) setPosition(parseInt(pos))
    if (needed) setPlayersNeeded(parseInt(needed))
    if (tid) setTournamentId(tid)

    // Get current user ID
    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [searchParams])

  // Fetch match ID for this player
  const fetchMatchAndRedirect = async (tid: string, uid: string) => {
    setStatus('starting')
    
    // Retry up to 10 times with 1 second delay
    // (matches are created async so might take a moment)
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(
          `/api/tournament/match-id?tournament_id=${tid}&user_id=${uid}`
        )
        const json = await res.json()

        if (res.ok && json.data?.id) {
          router.push(`/tournament/match?match_id=${json.data.id}`)
          return
        }
      } catch (err) {
        console.error('Fetch match error:', err)
      }

      // Wait 1 second before retrying
      await new Promise(r => setTimeout(r, 1000))
    }

    // If still no match after 10 tries, go to dashboard
    console.error('Could not find match after 10 retries')
    router.push('/dashboard')
  }

  // Listen for tournament status change
  useEffect(() => {
    if (!tournamentId) return

    const supabase = createClientComponentClient()

    const channel = supabase
      .channel('tournament-' + tournamentId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        async (payload) => {
          const updated = payload.new as { 
            status: string
            current_players: number 
          }

          if (updated.status === 'in_progress') {
            // Tournament started — find this player's match
            if (userId && tournamentId) {
              await fetchMatchAndRedirect(tournamentId, userId)
            }
          } else {
            setPlayersNeeded(10 - updated.current_players)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, userId])

  const filledSpots = 10 - (playersNeeded ?? 10)

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">

        <h1 className="text-xl font-bold mb-10">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>

        {/* Spinner */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-[#1e2d3d] mx-auto flex items-center justify-center">
            <div className={`w-24 h-24 rounded-full border-4 border-t-[#00d4ff] absolute ${
              status === 'starting' ? 'animate-spin border-t-[#f5a623]' : 'animate-spin'
            }`} />
            <span className="text-3xl">
              {status === 'starting' ? '⚡' : '♟️'}
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {status === 'starting' 
            ? 'Finding your match...' 
            : status === 'active'
              ? 'Starting...'
              : 'Finding opponents'
          }
        </h2>

        <p className="text-gray-500 text-sm mb-8">
          {status === 'starting'
            ? 'Setting up your board...'
            : status === 'active'
              ? 'Tournament is starting now!'
              : `Waiting for ${playersNeeded} more player${playersNeeded === 1 ? '' : 's'} to join`
          }
        </p>

        {/* Position card */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-xs mb-1">Your position</p>
          <p className="text-4xl font-bold text-white">
            #{position} <span className="text-gray-600 text-2xl">of 10</span>
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

        {status === 'waiting' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Cancel and return to dashboard
          </button>
        )}

      </div>
    </main>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-white text-sm">Loading...</div>
      </main>
    }>
      <QueueContent />
    </Suspense>
  )
}
