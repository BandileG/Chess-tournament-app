'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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

export default function MatchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams.get('match_id')
  const supabase = createClientComponentClient() 

  const [game, setGame] = useState(new Chess())
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null)
  const [myInfo, setMyInfo] = useState<PlayerInfo | null>(null)
  const [whiteTime, setWhiteTime] = useState(300)
  const [blackTime, setBlackTime] = useState(300)
  const [status, setStatus] = useState<'active' | 'completed' | 'loading'>('loading')
  const [gameResult, setGameResult] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([]) 

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const matchDataRef = useRef<MatchData | null>(null)
  matchDataRef.current = matchData 

  // ─── Load match + auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) { router.push('/dashboard'); return } 

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id) 

      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single() 

      if (error || !match) { router.push('/dashboard'); return } 

      setMatchData(match)
      setStatus(match.status === 'active' ? 'active' : 'completed')
      setWhiteTime(match.white_time_remaining ?? match.time_control ?? 300)
      setBlackTime(match.black_time_remaining ?? match.time_control ?? 300) 

      // Determine player color
      const color = match.white_player_id === user.id ? 'white' : 'black'
      setPlayerColor(color) 

      // Load FEN
      if (match.current_fen) {
        const g = new Chess()
        try { g.load(match.current_fen) } catch {}
        setGame(g)
      } 

      // Load player info
      const opponentId = color === 'white' ? match.black_player_id : match.white_player_id
      const [{ data: me }, { data: opp }] = await Promise.all([
        supabase.from('users').select('id, username, rating').eq('id', user.id).single(),
        supabase.from('users').select('id, username, rating').eq('id', opponentId).single(),
      ])
      if (me) setMyInfo(me)
      if (opp) setOpponent(opp) 

      // Load move history
      const { data: moves } = await supabase
        .from('moves')
        .select('move_san')
        .eq('match_id', matchId)
        .order('move_number', { ascending: true })
      if (moves) setMoveHistory(moves.map(m => m.move_san))
    } 

    init()
  }, [matchId, router]) 

  // ─── Realtime move sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return 

    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        const updated = payload.new as MatchData
        setMatchData(updated)
        setWhiteTime(updated.white_time_remaining)
        setBlackTime(updated.black_time_remaining) 

        if (updated.current_fen) {
          const g = new Chess()
          try { g.load(updated.current_fen) } catch {}
          setGame(g)
        } 

        if (updated.status === 'completed') {
          setStatus('completed')
          handleGameOver(updated)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const move = payload.new as { move_san: string }
        setMoveHistory(prev => [...prev, move.move_san])
      })
      .subscribe() 

    return () => { supabase.removeChannel(channel) }
  }, [matchId]) 

  // ─── Client-side timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || !matchData) return 

    timerRef.current = setInterval(() => {
      const isWhiteTurn = game.turn() === 'w'
      if (isWhiteTurn) {
        setWhiteTime(prev => {
          if (prev <= 1) { handleTimeout('white'); return 0 }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 1) { handleTimeout('black'); return 0 }
          return prev - 1
        })
      }
    }, 1000) 

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status, game.turn()]) 

  // ─── Handle timeout ──────────────────────────────────────────────────────
  const handleTimeout = async (losingColor: 'white' | 'black') => {
    if (!matchId || !matchData) return
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('completed') 

    const winnerId = losingColor === 'white'
      ? matchData.black_player_id
      : matchData.white_player_id 

    const result = losingColor === 'white' ? '0-1' : '1-0'
    setGameResult(`${losingColor === playerColor ? 'You lost on time' : 'Opponent ran out of time — You win!'}`) 

    await fetch('/api/match/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        winner_id: winnerId,
        result,
        tournament_id: matchData.tournament_id,
      }),
    })
  } 

  // ─── Handle game over (checkmate/stalemate) ──────────────────────────────
  const handleGameOver = useCallback((updatedMatch?: MatchData) => {
    const m = updatedMatch || matchDataRef.current
    if (!m) return
    if (timerRef.current) clearInterval(timerRef.current) 

    if (m.winner_id === userId) {
      setGameResult('🏆 You win!')
    } else if (m.winner_id === null) {
      setGameResult('½ Draw')
    } else {
      setGameResult('You lost')
    }
  }, [userId]) 

  // ─── On drop (piece movement) ────────────────────────────────────────────
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (status !== 'active' || !playerColor || !matchData || !userId) return false 

    // KEY FIX: convert 'white'/'black' to 'w'/'b' for chess.js
    const myColorChar = playerColor === 'white' ? 'w' : 'b'
    const isMyTurn = game.turn() === myColorChar 

    if (!isMyTurn) return false 

    const gameCopy = new Chess(game.fen())
    let move = null 

    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
    } catch {
      return false
    } 

    if (!move) return false 

    // Update local state immediately
    setGame(gameCopy)
    setLastMove({ from: sourceSquare, to: targetSquare })
    setMoveHistory(prev => [...prev, move!.san]) 

    // Sync to Supabase
    syncMove(gameCopy, move) 

    return true
  }, [status, playerColor, matchData, userId, game]) 

  // ─── Sync move to backend ────────────────────────────────────────────────
  const syncMove = async (gameCopy: Chess, move: { san: string; from: string; to: string; color: string }) => {
    if (!matchId || !matchData || !userId) return 

    const isWhiteMove = move.color === 'w'
    const increment = matchData.increment ?? 0
    const newWhiteTime = isWhiteMove ? whiteTime + increment : whiteTime
    const newBlackTime = !isWhiteMove ? blackTime + increment : blackTime 

    // Update match FEN and timers
    await supabase.from('matches').update({
      current_fen: gameCopy.fen(),
      white_time_remaining: newWhiteTime,
      black_time_remaining: newBlackTime,
      move_count: (matchData.move_count ?? 0) + 1,
      last_move_at: new Date().toISOString(),
    }).eq('id', matchId) 

    // Insert move record
    await supabase.from('moves').insert({
      match_id: matchId,
      player_id: userId,
      move_san: move.san,
      move_uci: move.from + move.to,
      fen_after: gameCopy.fen(),
      move_number: Math.ceil(((matchData.move_count ?? 0) + 1) / 2),
      color: move.color === 'w' ? 'white' : 'black',
      white_time_after: newWhiteTime,
      black_time_after: newBlackTime,
    }) 

    // Check for game over
    if (gameCopy.isGameOver()) {
      let winnerId: string | null = null
      let result = '1/2-1/2' 

      if (gameCopy.isCheckmate()) {
        // The player who just moved wins
        winnerId = userId
        result = playerColor === 'white' ? '1-0' : '0-1'
        setGameResult('🏆 You win by checkmate!')
      } else {
        setGameResult('½ Draw')
      } 

      setStatus('completed') 

      await fetch('/api/match/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          winner_id: winnerId,
          result,
          tournament_id: matchData.tournament_id,
        }),
      })
    }
  } 

  // ─── Format time ─────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  } 

  const isMyTurn = playerColor && game.turn() === (playerColor === 'white' ? 'w' : 'b') 

  // ─── Highlight squares ───────────────────────────────────────────────────
  const customSquareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(0, 212, 255, 0.25)' }
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(0, 212, 255, 0.4)' }
  } 

  // ─── Loading state ────────────────────────────────────────────────────────
  if (status === 'loading' || !playerColor || !matchData) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading match...</p>
        </div>
      </main>
    )
  } 

  const myTime = playerColor === 'white' ? whiteTime : blackTime
  const oppTime = playerColor === 'white' ? blackTime : whiteTime 

  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col"> 

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 text-sm"
        >
          ← Exit
        </button>
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className={`text-xs px-3 py-1 rounded-full font-semibold ${
          isMyTurn ? 'bg-[#00d4ff] text-black' : 'bg-[#1e2d3d] text-gray-400'
        }`}>
          {status === 'completed' ? 'Done' : isMyTurn ? 'Your turn' : 'Waiting...'}
        </div>
      </div> 

      {/* Opponent info + timer */}
      <div className="px-5 mb-3">
        <div className={`flex items-center justify-between bg-[#0d1117] border rounded-xl px-4 py-3 transition-all ${
          !isMyTurn && status === 'active'
            ? 'border-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.2)]'
            : 'border-[#1e2d3d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1e2d3d] flex items-center justify-center text-sm">
              {opponent?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{opponent?.username ?? 'Opponent'}</p>
              <p className="text-gray-500 text-xs">Rating {opponent?.rating ?? '—'}</p>
            </div>
          </div>
          <div className={`text-xl font-bold font-mono ${
            oppTime < 30 ? 'text-red-400' : 'text-white'
          }`}>
            {formatTime(oppTime)}
          </div>
        </div>
      </div> 

      {/* Chess board */}
      <div className="px-3 flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={playerColor}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 40px rgba(0,0,0,0.6)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#1e3a5f' }}
            customLightSquareStyle={{ backgroundColor: '#0d1f2d' }}
            customSquareStyles={customSquareStyles}
            arePiecesDraggable={status === 'active' && !!isMyTurn}
          />
        </div>
      </div> 

      {/* My info + timer */}
      <div className="px-5 mt-3">
        <div className={`flex items-center justify-between bg-[#0d1117] border rounded-xl px-4 py-3 transition-all ${
          isMyTurn && status === 'active'
            ? 'border-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.2)]'
            : 'border-[#1e2d3d]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00d4ff] flex items-center justify-center text-sm font-bold text-black">
              {myInfo?.username?.[0]?.toUpperCase() ?? 'Y'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{myInfo?.username ?? 'You'}</p>
              <p className="text-gray-500 text-xs">Rating {myInfo?.rating ?? '—'}</p>
            </div>
          </div>
          <div className={`text-xl font-bold font-mono ${
            myTime < 30 ? 'text-red-400' : 'text-[#00d4ff]'
          }`}>
            {formatTime(myTime)}
          </div>
        </div>
      </div> 

      {/* Move history */}
      <div className="px-5 mt-3 mb-4">
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 max-h-24 overflow-y-auto">
          {moveHistory.length === 0 ? (
            <p className="text-gray-600 text-xs text-center">No moves yet</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {moveHistory.map((san, i) => (
                <span key={i} className="text-xs">
                  {i % 2 === 0 && (
                    <span className="text-gray-600 mr-1">{Math.floor(i / 2) + 1}.</span>
                  )}
                  <span className="text-white">{san} </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div> 

      {/* Game over overlay */}
      {status === 'completed' && gameResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-6">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 text-center w-full max-w-sm">
            <p className="text-4xl mb-3">
              {gameResult.includes('win') ? '🏆' : gameResult.includes('Draw') ? '🤝' : '💀'}
            </p>
            <p className="text-white text-xl font-bold mb-2">{gameResult}</p>
            <p className="text-gray-500 text-sm mb-6">
              {gameResult.includes('win') ? 'Prize credited to your wallet' : 'Better luck next time'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#00d4ff] text-black font-bold py-3 rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )} 

    </main>
  )
}
