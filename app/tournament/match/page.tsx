'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

type MatchData = {
  id: string
  tournament_id: string
  white_player_id: string
  black_player_id: string
  status: string
  winner_id: string | null
  current_fen: string
  white_time_remaining: number
  black_time_remaining: number
  time_control: number
  increment: number
  move_count: number
}

type PlayerInfo = {
  id: string
  username: string
  rating: number
}

const isBot = (id: string) => /^(\d)\1{7}-/.test(id)

function MatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams.get('match_id')
  const supabase = createClientComponentClient()

  const [game, setGame] = useState(new Chess())
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null)
  const [myInfo, setMyInfo] = useState<PlayerInfo | null>(null)
  const [whiteTime, setWhiteTime] = useState(300)
  const [blackTime, setBlackTime] = useState(300)
  const [status, setStatus] = useState<'active' | 'completed' | 'loading'>('loading')
  const [gameResult, setGameResult] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [opponentIsBot, setOpponentIsBot] = useState(false)
const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const makeBotMoveRef = useRef<((g: Chess) => void) | null>(null)

  const completeMatch = useCallback(async (winnerId: string | null, result: string) => {
    if (!matchData) return
    timerRef.current && clearInterval(timerRef.current)
    botTimeoutRef.current && clearTimeout(botTimeoutRef.current)

    setStatus('completed')
    setGameResult(result)

    const res = await fetch('/api/match/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchData.id,
        winner_id: winnerId,
        result,
        tournament_id: matchData.tournament_id
      })
    })

    const json = await res.json()
    if (!res.ok) {
      setGameResult(`ERROR: ${json.error ?? 'API failed'}`)
    }
  }, [matchData])

  const makeBotMove = useCallback((currentGame: Chess) => {
    const moves = currentGame.moves({ verbose: true })
    if (moves.length === 0) return
    const move = moves[Math.floor(Math.random() * moves.length)]
    const newGame = new Chess(currentGame.fen())
    newGame.move(move)

    const updateMove = async () => {
      await supabase.from('moves').insert({
        match_id: matchData?.id,
        player_id: matchData?.white_player_id === userId
          ? matchData?.black_player_id
          : matchData?.white_player_id,
        move_san: move.san,
        move_uci: move.from + move.to,
        fen_after: newGame.fen(),
        move_number: newGame.moveNumber(),
        color: currentGame.turn(),
        white_time_after: whiteTime,
        black_time_after: blackTime
      })

      await supabase.from('matches').update({
        current_fen: newGame.fen(),
        move_count: newGame.moveNumber()
      }).eq('id', matchData?.id)
    }

    updateMove()
    setGame(newGame)
    setLastMove({ from: move.from, to: move.to })
    setMoveHistory(prev => [...prev, move.san])

    if (newGame.isGameOver()) {
      const result = newGame.isCheckmate() 
  ? (newGame.turn() === 'w' ? 'black' : 'white') 
  : 'draw'
      const winnerId = newGame.isCheckmate()
        ? (newGame.turn() === 'w' ? matchData!.black_player_id : matchData!.white_player_id)
        : null
      completeMatch(winnerId, result)
    }
  }, [matchData, userId, whiteTime, blackTime, completeMatch, supabase])

  // Keep ref in sync so init can call it
  useEffect(() => {
    makeBotMoveRef.current = makeBotMove
  }, [makeBotMove])
const handleSquareClick = useCallback((square: string) => {
    if (!playerColor || !matchData) return
    if (status === 'loading' || status === 'completed') return
    if (game.turn() !== playerColor) return

    if (selectedSquare) {
      const newGame = new Chess(game.fen())
      try {
        const move = newGame.move({ from: selectedSquare, to: square, promotion: 'q' })
        if (move) {
          const saveMove = async () => {
            await supabase.from('moves').insert({
              match_id: matchData.id,
              player_id: userId,
              move_san: move.san,
              move_uci: selectedSquare + square,
              fen_after: newGame.fen(),
              move_number: newGame.moveNumber(),
              color: playerColor,
              white_time_after: whiteTime,
              black_time_after: blackTime
            })
            await supabase.from('matches').update({
              current_fen: newGame.fen(),
              move_count: newGame.moveNumber()
            }).eq('id', matchData.id)
          }
          saveMove()
          setGame(newGame)
          setLastMove({ from: selectedSquare, to: square })
          setMoveHistory(prev => [...prev, move.san])
          setSelectedSquare(null)
          if (newGame.isGameOver()) {
            const result = newGame.isCheckmate()
              ? (newGame.turn() === 'w' ? 'black' : 'white')
              : 'draw'
            const winnerId = newGame.isCheckmate()
              ? (newGame.turn() === 'w' ? matchData.black_player_id : matchData.white_player_id)
              : null
            completeMatch(winnerId, result)
            return
          }
          if (opponentIsBot) {
            botTimeoutRef.current = setTimeout(() => makeBotMove(newGame), 1500)
          }
          return
        }
      } catch {}
      setSelectedSquare(null)
    } else {
      const piece = game.get(square as any)
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square)
      }
    }
  }, [game, selectedSquare, playerColor, matchData, status, userId, whiteTime, blackTime, opponentIsBot, makeBotMove, completeMatch, supabase])
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!playerColor || !matchData) return false
    if (status === 'loading' || status === 'completed') return false
    if (game.turn() !== playerColor) return false

    const newGame = new Chess(game.fen())
    let move = null

    try {
      move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })
    } catch {
      return false
    }

    if (!move) return false

    const saveMove = async () => {
      await supabase.from('moves').insert({
        match_id: matchData.id,
        player_id: userId,
        move_san: move!.san,
        move_uci: sourceSquare + targetSquare,
        fen_after: newGame.fen(),
        move_number: newGame.moveNumber(),
        color: playerColor,
        white_time_after: whiteTime,
        black_time_after: blackTime
      })

      await supabase.from('matches').update({
        current_fen: newGame.fen(),
        move_count: newGame.moveNumber()
      }).eq('id', matchData.id)
    }

    saveMove()
    setGame(newGame)
    setLastMove({ from: sourceSquare, to: targetSquare })
    setMoveHistory(prev => [...prev, move!.san])

    if (newGame.isGameOver()) {
  const result = newGame.isCheckmate() 
    ? (newGame.turn() === 'w' ? 'black' : 'white') 
    : 'draw'
  const winnerId = newGame.isCheckmate()
    ? (newGame.turn() === 'w' ? matchData.black_player_id : matchData.white_player_id)
    : null
  completeMatch(winnerId, result)
  return true
    }

    if (opponentIsBot) {
      botTimeoutRef.current = setTimeout(() => makeBotMove(newGame), 1500)
    }

    return true
  }, [game, playerColor, matchData, status, userId, whiteTime, blackTime, opponentIsBot, makeBotMove, completeMatch, supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return
      setMatchData(match)

      const color = match.white_player_id === user.id ? 'w' : 'b'
      setPlayerColor(color)

      const opponentId = match.white_player_id === user.id
        ? match.black_player_id
        : match.white_player_id

      const botOpponent = isBot(opponentId)
      setOpponentIsBot(botOpponent)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', [user.id, opponentId])

      const me = profiles?.find(p => p.id === user.id)
const opp = profiles?.find(p => p.id === opponentId)
if (me) setMyInfo({ ...me, rating: 1200 })
setOpponent({ id: opponentId, username: opp?.username ?? 'Opponent', rating: 1200 })

      const loadedGame = match.current_fen
        ? new Chess(match.current_fen)
        : new Chess()

      setGame(loadedGame)
      setWhiteTime(match.white_time_remaining)
      setBlackTime(match.black_time_remaining)
      setStatus(match.status === 'completed' ? 'completed' : 'active')

      // If player is black and opponent is bot, trigger bot's first move
      if (color === 'b' && botOpponent) {
        botTimeoutRef.current = setTimeout(() => {
          makeBotMoveRef.current?.(loadedGame)
        }, 1500)
      }
    }

    if (matchId) init()
  }, [matchId, supabase, router])

  useEffect(() => {
    if (status !== 'active') return

    timerRef.current = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime(prev => {
          if (prev <= 0) { completeMatch(matchData?.black_player_id ?? null, 'timeout'); return 0 }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 0) { completeMatch(matchData?.white_player_id ?? null, 'timeout'); return 0 }
          return prev - 1
        })
      }
    }, 1000)

    return () => { timerRef.current && clearInterval(timerRef.current) }
  }, [status, game, matchData, completeMatch])

  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, (payload) => {
        const updated = payload.new as MatchData
        if (updated.current_fen) {
          const syncedGame = new Chess(updated.current_fen)
          setGame(syncedGame)
        }
        if (updated.status === 'completed') {
          setStatus('completed')
          timerRef.current && clearInterval(timerRef.current)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, supabase])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <p className="text-white text-lg">Loading match...</p>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 text-center max-w-md w-full">
          <h2 className="text-3xl font-bold text-white mb-4">
  {gameResult === 'draw' ? '🤝 Draw!' : 
   (gameResult === 'white' && playerColor === 'w') || (gameResult === 'black' && playerColor === 'b') 
   ? '🏆 You Won!' : '😔 You Lost'}
</h2>
<p className="text-[#00d4ff] text-xl mb-6">
  {gameResult === 'draw' ? 'Game ended in a draw' : 
   gameResult === 'timeout' ? 'Time ran out' : 'Checkmate'}
</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#00d4ff] text-black font-bold py-3 rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#080c10] text-white px-4 py-6">
      <div className="max-w-2xl mx-auto">

        {/* Opponent info */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">Opponent</p>
            <p className="text-white font-semibold">{opponent?.username ?? 'Unknown'}</p>
          </div>
          <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl ${
            game.turn() !== playerColor ? 'bg-[#00d4ff] text-black' : 'bg-[#1e2d3d] text-white'
          }`}>
            {playerColor === 'w' ? formatTime(blackTime) : formatTime(whiteTime)}
          </div>
        </div>

        {/* Chess board */}
        <div className="rounded-xl overflow-hidden">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={playerColor === 'w' ? 'white' : 'black'}
            onSquareClick={handleSquareClick}
customSquareStyles={{
  ...(lastMove ? {
    [lastMove.from]: { backgroundColor: 'rgba(0, 212, 255, 0.3)' },
    [lastMove.to]: { backgroundColor: 'rgba(0, 212, 255, 0.3)' }
  } : {}),
  ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(0, 212, 255, 0.4)' } } : {})
}}
          />
        </div>

        {/* My info */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-gray-400 text-sm">You</p>
            <p className="text-white font-semibold">{myInfo?.username ?? 'You'}</p>
          </div>
          <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl ${
            game.turn() === playerColor ? 'bg-[#00d4ff] text-black' : 'bg-[#1e2d3d] text-white'
          }`}>
            {playerColor === 'w' ? formatTime(whiteTime) : formatTime(blackTime)}
          </div>
        </div>

        {/* Move history */}
        <div className="mt-6 bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-2">Moves</p>
          <div className="flex flex-wrap gap-2">
            {moveHistory.map((move, i) => (
              <span key={i} className="text-white text-sm bg-[#161b22] px-2 py-1 rounded">
                {move}
              </span>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    }>
      <MatchContent />
    </Suspense>
  )
}