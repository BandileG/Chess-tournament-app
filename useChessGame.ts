import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Chess } from 'chess.js'

export type MatchData = {
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

export type PlayerInfo = {
  id: string
  username: string
  rating: number
}

export function useChessGame(matchId: string | null) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  // ─── State ───────────────────────────────────────────────────────────────
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
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  // ─── Refs (avoid stale closures) ─────────────────────────────────────────
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const matchDataRef = useRef<MatchData | null>(null)
  const whiteTimeRef = useRef(300)
  const blackTimeRef = useRef(300)
  const playerColorRef = useRef<'white' | 'black' | null>(null)
  const userIdRef = useRef<string | null>(null)
  const gameRef = useRef(new Chess())

  matchDataRef.current = matchData
  whiteTimeRef.current = whiteTime
  blackTimeRef.current = blackTime
  playerColorRef.current = playerColor
  userIdRef.current = userId
  gameRef.current = game

  // ─── Load match + auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) { router.push('/dashboard'); return }

    const init = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUserId(user.id)
      userIdRef.current = user.id

      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error || !match) {
        console.error('Match fetch error:', error)
        router.push('/dashboard')
        return
      }

      setMatchData(match)
      setStatus(match.status === 'active' ? 'active' : 'completed')

      const wTime = match.white_time_remaining ?? match.time_control ?? 300
      const bTime = match.black_time_remaining ?? match.time_control ?? 300
      setWhiteTime(wTime)
      setBlackTime(bTime)
      whiteTimeRef.current = wTime
      blackTimeRef.current = bTime

      const color = match.white_player_id === user.id ? 'white' : 'black'
      setPlayerColor(color)
      playerColorRef.current = color

      if (match.current_fen) {
        const g = new Chess()
        try { g.load(match.current_fen) } catch {}
        setGame(g)
        gameRef.current = g
      }

      const opponentId = color === 'white' ? match.black_player_id : match.white_player_id
      const [{ data: me }, { data: opp }] = await Promise.all([
        supabase.from('users').select('id, username, rating').eq('id', user.id).single(),
        supabase.from('users').select('id, username, rating').eq('id', opponentId).single(),
      ])
      if (me) setMyInfo(me)
      if (opp) setOpponent(opp)

      const { data: moves } = await supabase
        .from('moves')
        .select('move_san')
        .eq('match_id', matchId)
        .order('move_number', { ascending: true })
      if (moves) setMoveHistory(moves.map(m => m.move_san))
    }

    init()
  }, [matchId])

  // ─── Realtime sync ───────────────────────────────────────────────────────
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
          gameRef.current = g
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

  // ─── Timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || !matchData) return

    timerRef.current = setInterval(() => {
      const isWhiteTurn = gameRef.current.turn() === 'w'
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
  }, [status, matchData])

  // ─── Timeout handler ─────────────────────────────────────────────────────
  const handleTimeout = async (losingColor: 'white' | 'black') => {
    if (!matchId || !matchDataRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('completed')

    const winnerId = losingColor === 'white'
      ? matchDataRef.current.black_player_id
      : matchDataRef.current.white_player_id

    const result = losingColor === 'white' ? '0-1' : '1-0'
    setGameResult(losingColor === playerColorRef.current
      ? 'You lost on time'
      : 'Opponent ran out of time — You win! 🏆')

    await fetch('/api/match/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        winner_id: winnerId,
        result,
        tournament_id: matchDataRef.current.tournament_id,
      }),
    })
  }

  // ─── Game over handler ───────────────────────────────────────────────────
  const handleGameOver = useCallback((updatedMatch?: MatchData) => {
    const m = updatedMatch || matchDataRef.current
    if (!m) return
    if (timerRef.current) clearInterval(timerRef.current)

    if (m.winner_id === userIdRef.current) {
      setGameResult('🏆 You win!')
    } else if (m.winner_id === null) {
      setGameResult('½ Draw')
    } else {
      setGameResult('You lost')
    }
  }, [])

  // ─── Sync move to Supabase ───────────────────────────────────────────────
  const syncMove = useCallback(async (
    gameCopy: Chess,
    move: { san: string; from: string; to: string; color: string }
  ) => {
    if (!matchId || !matchDataRef.current || !userIdRef.current) return

    const isWhiteMove = move.color === 'w'
    const increment = matchDataRef.current.increment ?? 0
    const newWhiteTime = isWhiteMove ? whiteTimeRef.current + increment : whiteTimeRef.current
    const newBlackTime = !isWhiteMove ? blackTimeRef.current + increment : blackTimeRef.current

    await supabase.from('matches').update({
      current_fen: gameCopy.fen(),
      white_time_remaining: newWhiteTime,
      black_time_remaining: newBlackTime,
      move_count: (matchDataRef.current.move_count ?? 0) + 1,
      last_move_at: new Date().toISOString(),
    }).eq('id', matchId)

    await supabase.from('moves').insert({
      match_id: matchId,
      player_id: userIdRef.current,
      move_san: move.san,
      move_uci: move.from + move.to,
      fen_after: gameCopy.fen(),
      move_number: Math.ceil(((matchDataRef.current.move_count ?? 0) + 1) / 2),
      color: move.color === 'w' ? 'white' : 'black',
      white_time_after: newWhiteTime,
      black_time_after: newBlackTime,
    })

    if (gameCopy.isGameOver()) {
      let winnerId: string | null = null
      let result = '1/2-1/2'

      if (gameCopy.isCheckmate()) {
        winnerId = userIdRef.current
        result = playerColorRef.current === 'white' ? '1-0' : '0-1'
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
          tournament_id: matchDataRef.current.tournament_id,
        }),
      })
    }
  }, [matchId])

  // ─── Execute move (shared by drag and tap) ───────────────────────────────
  const executeMove = useCallback((from: string, to: string) => {
    if (status !== 'active' || !playerColorRef.current || !userIdRef.current) return false

    const myColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
    if (gameRef.current.turn() !== myColorChar) return false

    const gameCopy = new Chess(gameRef.current.fen())
    let move = null

    try {
      move = gameCopy.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }

    if (!move) return false

    setGame(gameCopy)
    gameRef.current = gameCopy
    setLastMove({ from, to })
    setMoveHistory(prev => [...prev, move!.san])
    setSelectedSquare(null)
    syncMove(gameCopy, move)

    return true
  }, [status, syncMove])

  // ─── Drag and drop ───────────────────────────────────────────────────────
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    return executeMove(sourceSquare, targetSquare)
  }, [executeMove])

  // ─── Tap to move ─────────────────────────────────────────────────────────
  const onSquareClick = useCallback((square: string) => {
    if (status !== 'active' || !playerColorRef.current || !userIdRef.current) return

    const myColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
    if (gameRef.current.turn() !== myColorChar) return

    if (!selectedSquare) {
      // Select piece if it belongs to current player
      const piece = gameRef.current.get(square as any)
      if (piece && piece.color === myColorChar) {
        setSelectedSquare(square)
      }
      return
    }

    // Try to move to clicked square
    const moved = executeMove(selectedSquare, square)

    if (!moved) {
      // Maybe clicking a different own piece — reselect
      const piece = gameRef.current.get(square as any)
      if (piece && piece.color === myColorChar) {
        setSelectedSquare(square)
      } else {
        setSelectedSquare(null)
      }
    }
  }, [status, selectedSquare, executeMove])

  // ─── Computed values ─────────────────────────────────────────────────────
  const isMyTurn = playerColor !== null &&
    gameRef.current.turn() === (playerColor === 'white' ? 'w' : 'b')

  const myTime = playerColor === 'white' ? whiteTime : blackTime
  const oppTime = playerColor === 'white' ? blackTime : whiteTime

  return {
    // State
    game,
    matchData,
    playerColor,
    userId,
    opponent,
    myInfo,
    whiteTime,
    blackTime,
    myTime,
    oppTime,
    status,
    gameResult,
    lastMove,
    moveHistory,
    selectedSquare,
    isMyTurn,
    // Handlers
    onDrop,
    onSquareClick,
  }
}