'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function QueueContent() {
  const [position, setPosition] = useState<number | null>(null)
  const [playersNeeded, setPlayersNeeded] = useState<number | null>(null)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [status, setStatus] = useState<'waiting' | 'active'>('waiting')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const pos = searchParams.get('position')
    const needed = searchParams.get('needed')
    const tid = searchParams.get('tournament_id')

    if (pos) setPosition(parseInt(pos))
    if (needed) setPlayersNeeded(parseInt(needed))
    if (tid) setTournamentId(tid)
  }, [searchParams])

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
        (payload) => {
          const updated = payload.new as { status: string; current_players: number }
          if (updated.status === 'active') {
            setStatus('active')
            router.push(`/tournament/match?tournament_id=${tournamentId}`)
          } else {
            setPlayersNeeded(10 - updated.current_players)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, router])

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">

        <h1 className="text-xl font-bold mb-10">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>

        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-[#1e2d3d] mx-auto flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-t-[#00d4ff] absolute animate-spin" />
            <span className="text-3xl">♟️</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {status === 'active' ? 'Starting...' : 'Finding opponents'}
        </h2>

        <p className="text-gray-500 text-sm mb-8">
          {status === 'active'
            ? 'Tournament is starting now!'
            : `Waiting for ${playersNeeded} more player${playersNeeded === 1 ? '' : 's'} to join`
          }
        </p>

        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-xs mb-1">Your position</p>
          <p className="text-4xl font-bold text-white">
            #{position} <span className="text-gray-600 text-2xl">of 10</span>
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < (10 - (playersNeeded || 10))
                  ? 'bg-[#00d4ff]'
                  : 'bg-[#1e2d3d]'
              }`}
            />
          ))}
        </div>

        <p className="text-gray-600 text-xs">
          {10 - (playersNeeded || 10)} of 10 players joined
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 text-gray-600 text-xs hover:text-gray-400 transition-colors"
        >
          Cancel and return to dashboard
        </button>

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
