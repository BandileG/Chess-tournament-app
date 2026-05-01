'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

function MatchContent() {
  const [game, setGame] = useState(new Chess())
  const [matchId, setMatchId] = useState<string | null>(null)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [userId, setUserId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState('Opponent')
  const [myName, setMyName] = useState('You')
  const [whiteTime, setWhiteTime] = useState(300)
  const [blackTime, setBlackTime] = useState(300)
  const [status, setStatus] = useState<'playing' | 'finished'>('playing')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tid = searchParams.get('tournament_id')
    const mid = searchParams.get('match_id')
    if (tid) setTournamentId(tid)
    if (mid) setMatchId(mid)
  }, [searchParams])

  useEffect(() => {
    const supabase = createClientComponentClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) setMyName(data.username)
        })
    })
  }, [router])

  useEffect(() => {
    if (!matchId || !userId) return
    const supabase = createClientComponentClient()

    supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        if (!data) return

        const isWhite = data.white_player_id === userId
        setPlayerColor(isWhite ? 'white' : 'black')

        if (data.current_fen) {
          const newGame = new Chess()
          newGame.load(data.current_fen)
          setGame(newGame)
        }

        if (data.white_time_remaining) setWhiteTime(data.white_time_remaining)
        if (data.black_time_remaining) setBlackTime(data.black_time_remaining)
        if (data.status === 'completed') {
          setStatus('finished')
          setResult(data.result)
        }

        const opponentId = isWhite ? data.black_player_id : data.white_player_id
        supabase
          .from('users')
          .select('username')
          .eq('id', opponentId)
          .single()
          .then(({ data: opp }) => {
            if (opp?.username) setOpponentName(opp.username)
            setLoading(false)
          })
      })

    const channel = supabase
      .channel('match-' + matchId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          const updated = payload.new as {
            current_fen: string
            white_time_remaining: number
            black_time_remaining: number
            status: string
            result: string
          }

          if (updated.current_fen) {
            const newGame = new Chess()
            newGame.load(updated.current_fen)
            setGame(newGame)
          }

          if (updated.white_time_remaining) setWhiteTime(updated.white_time_remaining)
          if (updated.black_time_remaining) setBlackTime(updated.black_time_remaining)

          if (updated.status === 'completed') {
            setStatus('finished')
            setResult(updated.result)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, userId])

  useEffect(() => {
    if (status === 'finished') return
    const interval = setInterval(() => {
      const isWhiteTurn = game.turn() === 'w'
      if (isWhiteTurn) {
        setWhiteTime(prev => Math.max(0, prev - 1))
      } else {
        setBlackTime(prev => Math.max(0, prev - 1))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [game, status])

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (status === 'finished') return false
    if (!matchId || !userId) return false

    const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                     (playerColor === 'black' && game.turn() === 'b')
    if (!isMyTurn) return false

    const gameCopy = new Chess(game.fen())
    let move = null

    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })
    } catch {
      return false
    }

    if (!move) return false

    setGame(gameCopy)

    const supabase = createClientComponentClient()

    supabase.from('moves').insert({
      match_id: matchId,
      player_id: userId,
      move_san: move.san,
      move_uci: sourceSquare + targetSquare,
      fen_after: gameCopy.fen(),
      move_number: Math.ceil(gameCopy.moveNumber()),
      color: playerColor === 'white' ? 'w' : 'b',
      time_spent_ms: 0,
      white_time_after: whiteTime,
      black_time_after: blackTime,
    })

    const isGameOver = gameCopy.isGameOver()
    let newStatus = 'active'
    let winner = null
    let resultStr = null

    if (isGameOver) {
      newStatus = 'completed'
      if (gameCopy.isCheckmate()) {
        winner = userId
        resultStr = playerColor === 'white' ? '1-0' : '0-1'
      } else {
        resultStr = '1/2-1/2'
      }
    }

    supabase.from('matches').update({
      current_fen: gameCopy.fen(),
      white_time_remaining: whiteTime,
      black_time_remaining: blackTime,
      status: newStatus,
      winner_id: winner,
      result: resultStr,
      move_count: gameCopy.moveNumber(),
      last_move_at: new Date().toISOString(),
    }).eq('id', matchId)

    return true
  }, [game, matchId, userId, playerColor, status, whiteTime, blackTime])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-t-[#00d4ff] border-[#1e2d3d] animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading match...</p>
        </div>
      </main>
    )
  }

  const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                   (playerColor === 'black' && game.turn() === 'b')

  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          status === 'finished'
            ? 'bg-gray-500/20 text-gray-400'
            : isMyTurn
            ? 'bg-green-500/20 text-green-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {status === 'finished' ? 'Game Over' : isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </div>
      </div>

      {/* Opponent info + timer */}
      <div className="px-5 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center">
            <span className="text-sm">♟️</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{opponentName}</p>
            <p className="text-gray-500 text-xs">{playerColor === 'white' ? 'Black' : 'White'}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
          (playerColor === 'white' ? blackTime : whiteTime) < 30
            ? 'bg-red-500/20 text-red-400'
            : 'bg-[#1e2d3d] text-white'
        }`}>
          {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
        </div>
      </div>

      {/* Chess board */}
      <div className="px-4 flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={playerColor}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#1e2d3d' }}
            customLightSquareStyle={{ backgroundColor: '#2d4060' }}
            arePiecesDraggable={isMyTurn && status === 'playing'}
          />
        </div>
      </div>

      {/* My info + timer */}
      <div className="px-5 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mt-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
            <span className="text-sm">♙</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{myName}</p>
            <p className="text-gray-500 text-xs capitalize">{playerColor}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
          (playerColor === 'white' ? whiteTime : blackTime) < 30
            ? 'bg-red-500/20 text-red-400'
            : 'bg-[#00d4ff]/10 text-[#00d4ff]'
        }`}>
          {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
        </div>
      </div>

      {/* Game over overlay */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="text-5xl mb-4">
              {result === '1/2-1/2' ? '🤝' : result === '1-0'
                ? playerColor === 'white' ? '🏆' : '💀'
                : playerColor === 'black' ? '🏆' : '💀'}
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">
              {result === '1/2-1/2'
                ? 'Draw!'
                : (result === '1-0' && playerColor === 'white') ||
                  (result === '0-1' && playerColor === 'black')
                ? 'You Win!'
                : 'You Lose'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">{result}</p>
            <button
              onClick={() => router.push(`/tournament/queue?tournament_id=${tournamentId}`)}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-black font-bold py-3 rounded-xl text-sm mb-3"
            >
              Next Round →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full text-gray-600 text-xs hover:text-gray-400 py-2"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-white text-sm">Loading...</div>
      </main>
    }>
      <MatchContent />
    </Suspense>
  )
}
