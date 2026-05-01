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
  const [completing, setCompleting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get match_id from URL
  useEffect(() => {
    const mid = searchParams.get('match_id')
    if (mid) setMatchId(mid)
  }, [searchParams])

  // Get current user
  useEffect(() => {
    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('users').select('username').eq('id', user.id).single()
        .then(({ data }) => { if (data?.username) setMyName(data.username) })
    })
  }, [router])

  // Load match data
  useEffect(() => {
    if (!matchId || !userId) return
    const supabase = createClientComponentClient()

    supabase.from('matches').select('*').eq('id', matchId).single()
      .then(({ data }) => {
        if (!data) return

        const isWhite = data.white_player_id === userId
        setPlayerColor(isWhite ? 'white' : 'black')
        setTournamentId(data.tournament_id)

        if (data.current_fen) {
          const newGame = new Chess()
          newGame.load(data.current_fen)
          setGame(newGame)
        }

        setWhiteTime(Math.floor((data.white_time_remaining ?? 300000) / 1000))
        setBlackTime(Math.floor((data.black_time_remaining ?? 300000) / 1000))

        if (data.status === 'completed') {
          setStatus('finished')
          setResult(data.result)
        }

        const opponentId = isWhite ? data.black_player_id : data.white_player_id
        supabase.from('users').select('username').eq('id', opponentId).single()
          .then(({ data: opp }) => {
            if (opp?.username) setOpponentName(opp.username)
            setLoading(false)
          })
      })

    // Realtime listener
    const channel = supabase
      .channel('match-' + matchId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, (payload) => {
        const updated = payload.new as {
          current_fen: string
          white_time_remaining: number
          black_time_remaining: number
          status: string
          result: string
          tournament_id: string
        }

        if (updated.current_fen) {
          const newGame = new Chess()
          newGame.load(updated.current_fen)
          setGame(newGame)
        }

        setWhiteTime(Math.floor((updated.white_time_remaining ?? 300000) / 1000))
        setBlackTime(Math.floor((updated.black_time_remaining ?? 300000) / 1000))

        if (updated.status === 'completed') {
          setStatus('finished')
          setResult(updated.result)
        }

        if (updated.tournament_id) setTournamentId(updated.tournament_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, userId])

  // Client-side timer
  useEffect(() => {
    if (status === 'finished') return
    const interval = setInterval(() => {
      const isWhiteTurn = game.turn() === 'w'
      if (isWhiteTurn) {
        setWhiteTime(prev => {
          if (prev <= 1) { handleTimeout('black'); return 0 }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 1) { handleTimeout('white'); return 0 }
          return prev - 1
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [game, status])

  // Handle timeout
  const handleTimeout = async (winnerColor: 'white' | 'black') => {
    if (!matchId || completing) return
    setCompleting(true)
    setStatus('finished')

    const supabase = createClientComponentClient()
    const { data: match } = await supabase
      .from('matches').select('*').eq('id', matchId).single()
    if (!match) return

    const winnerId = winnerColor === 'white'
      ? match.white_player_id
      : match.black_player_id

    await fetch('/api/match/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        winner_id: winnerId,
        result: 'timeout',
      }),
    })

    setResult(winnerColor === playerColor ? 'you_win' : 'you_lose')
  }

  // Handle piece drop
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (status === 'finished') return false
    if (!matchId || !userId) return false

    const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                     (playerColor === 'black' && game.turn() === 'b')
    if (!isMyTurn) return false

    const gameCopy = new Chess(game.fen())
    let move = null

    try {
      move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch { return false }

    if (!move) return false
    setGame(gameCopy)

    const supabase = createClientComponentClient()

    // Save move to DB
    supabase.from('moves').insert({
      match_id: matchId,
      player_id: userId,
      move_san: move.san,
      move_uci: sourceSquare + targetSquare,
      fen_after: gameCopy.fen(),
      move_number: gameCopy.moveNumber(),
      color: playerColor,        // ← fixed: 'white' or 'black'
      time_spent_ms: 0,
      white_time_after: whiteTime * 1000,
      black_time_after: blackTime * 1000,
    })

    // Update match FEN and times
    supabase.from('matches').update({
      current_fen: gameCopy.fen(),
      white_time_remaining: whiteTime * 1000,
      black_time_remaining: blackTime * 1000,
      move_count: gameCopy.moveNumber(),
      last_move_at: new Date().toISOString(),
    }).eq('id', matchId)

    // Check game over
    if (gameCopy.isGameOver()) {
      setStatus('finished')
      setCompleting(true)

      let winnerId = null
      let resultStr = 'draw'

      if (gameCopy.isCheckmate()) {
        winnerId = userId
        resultStr = playerColor === 'white' ? '1-0' : '0-1'
        setResult('you_win')
      } else {
        setResult('draw')
      }

      // Call complete API → triggers payout + round advancement
      fetch('/api/match/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          winner_id: winnerId,
          result: resultStr,
        }),
      })
    }

    return true
  }, [game, matchId, userId, playerColor, status, whiteTime, blackTime])

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

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

  const myTime = playerColor === 'white' ? whiteTime : blackTime
  const oppTime = playerColor === 'white' ? blackTime : whiteTime

  const resultEmoji = result === 'draw' ? '🤝' : result === 'you_win' ? '🏆' : '💀'
  const resultTitle = result === 'draw' ? 'Draw!' : result === 'you_win' ? 'You Win!' : 'You Lose'

  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          status === 'finished' ? 'bg-gray-500/20 text-gray-400'
          : isMyTurn ? 'bg-green-500/20 text-green-400'
          : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {status === 'finished' ? 'Game Over' : isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </div>
      </div>

      {/* Opponent bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center">
            <span className="text-sm">♟️</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{opponentName}</p>
            <p className="text-gray-500 text-xs capitalize">
              {playerColor === 'white' ? 'Black' : 'White'}
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
          oppTime < 30 ? 'bg-red-500/20 text-red-400' : 'bg-[#1e2d3d] text-white'
        }`}>
          {formatTime(oppTime)}
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

      {/* My bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mt-3 mb-4">
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
          myTime < 30 ? 'bg-red-500/20 text-red-400' : 'bg-[#00d4ff]/10 text-[#00d4ff]'
        }`}>
          {formatTime(myTime)}
        </div>
      </div>

      {/* Game over overlay */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="text-5xl mb-4">{resultEmoji}</p>
            <h2 className="text-2xl font-bold text-white mb-2">{resultTitle}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {result === 'you_win' ? 'You advance to the next round!' : 
               result === 'draw' ? 'The game ended in a draw' :
               'Better luck next time'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-black font-bold py-3 rounded-xl text-sm mb-3"
            >
              {result === 'you_win' ? 'Next Round →' : 'Back to Dashboard'}
            </button>
            {result === 'you_win' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-gray-600 text-xs hover:text-gray-400 py-2"
              >
                Back to Dashboard
              </button>
            )}
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
