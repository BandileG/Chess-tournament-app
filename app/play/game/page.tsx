'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { BotProfile } from '@/lib/bots'

const THINKING_MESSAGES = [
  'is thinking...',
  'is calculating...',
  'is planning...',
  'is analyzing...',
  'is studying the board...',
  'is considering options...',
  'is finding the best move...',
  'is taking their time...',
]

function GameContent() {
  const [game, setGame] = useState(new Chess())
  const [gameId, setGameId] = useState<string | null>(null)
  const [isVsBot, setIsVsBot] = useState(false)
  const [botLevel, setBotLevel] = useState(5)
  const [botProfile, setBotProfile] = useState<BotProfile | null>(null)
  const [gameOpeningIndex, setGameOpeningIndex] = useState(0)
  const [thinkingMsg, setThinkingMsg] = useState('is thinking...')
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [userId, setUserId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState('Opponent')
  const [opponentFlag, setOpponentFlag] = useState('🌍')
  const [opponentCountry, setOpponentCountry] = useState('')
  const [myName, setMyName] = useState('You')
  const [whiteTime, setWhiteTime] = useState(300)
  const [blackTime, setBlackTime] = useState(300)
  const [totalTime, setTotalTime] = useState(300)
  const [status, setStatus] = useState<'playing' | 'finished'>('playing')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [botThinking, setBotThinking] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [moveNumber, setMoveNumber] = useState(1)
  const [lastBotMove, setLastBotMove] = useState<{ from: string; to: string } | null>(null)
  const [lastPlayerMove, setLastPlayerMove] = useState<{ from: string; to: string } | null>(null)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [fenHistory, setFenHistory] = useState<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'])
  const [viewingIndex, setViewingIndex] = useState<number>(0)
  const isViewingHistory = viewingIndex < fenHistory.length - 1

  const router = useRouter()
  const searchParams = useSearchParams()
  const moveStartRef = useRef<number>(Date.now())
  const gameOverCalledRef = useRef(false)

  // ── Rotate thinking messages ──
  useEffect(() => {
    if (!botThinking) return
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % THINKING_MESSAGES.length
      setThinkingMsg(THINKING_MESSAGES[i])
    }, 3000)
    return () => clearInterval(interval)
  }, [botThinking])

  // ── Get params + user ──
  useEffect(() => {
    const id = searchParams.get('id')
    const bot = searchParams.get('bot') === 'true'
    if (id) setGameId(id)
    setIsVsBot(bot)

    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('users').select('username').eq('id', user.id).single()
        .then(({ data }) => { if (data?.username) setMyName(data.username) })
    })
  }, [searchParams])

  // ── Load game data ──
  useEffect(() => {
    if (!gameId || !userId) return
    const supabase = createClientComponentClient()

    supabase.from('casual_games').select('*').eq('id', gameId).single()
      .then(({ data }) => {
        if (!data) return

        const isWhite = data.white_player_id === userId
        setPlayerColor(isWhite ? 'white' : 'black')
        setIsVsBot(data.is_vs_bot)
        if (data.bot_level) setBotLevel(data.bot_level)
        if (data.game_opening_index != null) setGameOpeningIndex(data.game_opening_index)

        if (data.is_vs_bot && data.bot_name) {
          setBotProfile({
            id: data.bot_id || 'bot',
            name: data.bot_name,
            flag: data.bot_flag || '🌍',
            country: data.bot_country || '',
            elo: data.bot_elo || 800,
            avatar: data.bot_avatar || '♟',
            bio: data.bot_bio || '',
            delay: [1500, 8000],
            stockfishLevel: data.bot_level || 5,
            tier: 'Amateur',
          })
          setOpponentName(data.bot_name)
          setOpponentFlag(data.bot_flag || '🌍')
          setOpponentCountry(data.bot_country || '')
        }

        if (data.current_fen) {
          const g = new Chess()
          g.load(data.current_fen)
          setGame(g)
          const history = g.history()
          setMoveHistory(history)
          setMoveNumber(Math.ceil(history.length / 2) + 1)

          const fens: string[] = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
          const tempGame = new Chess()
          for (const move of history) {
            tempGame.move(move)
            fens.push(tempGame.fen())
          }
          setFenHistory(fens)
          setViewingIndex(fens.length - 1)
        }

        const wTime = Math.floor(data.white_time_remaining / 1000)
        const bTime = Math.floor(data.black_time_remaining / 1000)
        setWhiteTime(wTime)
        setBlackTime(bTime)
        setTotalTime(Math.floor(data.time_control))

        if (data.status === 'completed') {
          setStatus('finished')
          setResult(data.result)
        }

        if (!data.is_vs_bot) {
          const oppId = isWhite ? data.black_player_id : data.white_player_id
          if (oppId) {
            supabase.from('users').select('username').eq('id', oppId).single()
              .then(({ data: opp }) => { if (opp?.username) setOpponentName(opp.username) })
          }
        }

        setLoading(false)
        moveStartRef.current = Date.now()
      })

    const channel = supabase.channel('casual-' + gameId)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'casual_games', filter: `id=eq.${gameId}`,
      }, (payload) => {
        const updated = payload.new as {
          current_fen: string
          white_time_remaining: number
          black_time_remaining: number
          status: string
          result: string
        }
        if (updated.current_fen) {
          const g = new Chess()
          g.load(updated.current_fen)
          setGame(g)
          const history = g.history()
          setMoveHistory(history)
          setMoveNumber(Math.ceil(history.length / 2) + 1)
          const fens: string[] = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
          const tempGame = new Chess()
          for (const move of history) {
            tempGame.move(move)
            fens.push(tempGame.fen())
          }
          setFenHistory(fens)
          setViewingIndex(fens.length - 1)
        }
        setWhiteTime(Math.floor(updated.white_time_remaining / 1000))
        setBlackTime(Math.floor(updated.black_time_remaining / 1000))
        if (updated.status === 'completed') {
          setStatus('finished')
          setResult(updated.result)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, userId])

  // ── Timer ──
  useEffect(() => {
    if (status === 'finished' || isViewingHistory) return
    const interval = setInterval(() => {
      const isWhiteTurn = game.turn() === 'w'
      if (isWhiteTurn) {
        setWhiteTime(prev => {
          if (prev <= 1) {
            if (playerColor === 'white') handleGameOver(null, 'timeout', 'you_lose')
            else handleGameOver(userId, 'timeout', 'you_win')
            return 0
          }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            if (playerColor === 'black') handleGameOver(null, 'timeout', 'you_lose')
            else handleGameOver(userId, 'timeout', 'you_win')
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [game, status, playerColor, userId, isViewingHistory])

  // ── Bot move ──
  const makeBotMove = useCallback(async (currentGame: Chess) => {
    if (status === 'finished' || gameOverCalledRef.current) return
    setBotThinking(true)

    try {
      const botIsBlack = playerColor === 'white'
      const botTimeMs = botIsBlack ? blackTime * 1000 : whiteTime * 1000
      const userTimeMs = botIsBlack ? whiteTime * 1000 : blackTime * 1000

      const res = await fetch('/api/play/bot-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          fen: currentGame.fen(),
          bot_level: botLevel,
          bot_id: botProfile?.id,
          move_number: moveNumber,
          bot_time_ms: botTimeMs,
          user_time_ms: userTimeMs,
          total_time_ms: totalTime * 1000,
          game_opening_index: gameOpeningIndex,
        }),
      })
      const data = await res.json()
      setBotThinking(false)

      if (!data.success) return

      if (data.resign) {
        handleGameOver(userId, 'resign', 'you_win')
        return
      }

      const uci = data.move
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length === 5 ? uci[4] : 'q'

      const gameCopy = new Chess(currentGame.fen())
      const move = gameCopy.move({ from, to, promotion })
      if (!move) return

      setLastBotMove({ from, to })
      setTimeout(() => setLastBotMove(null), 1500)

      setGame(gameCopy)
      setMoveNumber(prev => prev + 1)
      setMoveHistory(prev => [...prev, move.san])
      setFenHistory(prev => {
        const updated = [...prev, gameCopy.fen()]
        setViewingIndex(updated.length - 1)
        return updated
      })

      saveMove(gameCopy, move.san, uci, 'black', 0)

      if (gameCopy.isGameOver()) {
        if (gameCopy.isCheckmate()) handleGameOver(null, 'checkmate', 'you_lose')
        else handleGameOver(null, 'draw', 'draw')
      }
    } catch {
      setBotThinking(false)
    }
  }, [botLevel, status, userId, gameId, botProfile, moveNumber, whiteTime, blackTime, totalTime, gameOpeningIndex, playerColor])

  // ── Trigger bot move ──
  useEffect(() => {
    if (!isVsBot || status === 'finished' || botThinking || isViewingHistory) return
    const isBotTurn = (playerColor === 'white' && game.turn() === 'b') ||
                      (playerColor === 'black' && game.turn() === 'w')
    if (isBotTurn) makeBotMove(game)
  }, [game, isVsBot, playerColor, status, isViewingHistory])

  // ── Save move ──
  const saveMove = async (
    currentGame: Chess,
    san: string,
    uci: string,
    color: string,
    timeSpent: number
  ) => {
    if (!gameId) return
    await fetch('/api/play/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        move_uci: uci,
        move_san: san,
        fen_after: currentGame.fen(),
        time_spent_ms: timeSpent,
        color,
      }),
    })
  }

  // ── Game over ──
  const handleGameOver = async (
    winnerId: string | null,
    reason: string,
    resultLabel: string
  ) => {
    if (gameOverCalledRef.current) return
    gameOverCalledRef.current = true
    setStatus('finished')
    setResult(resultLabel)
    setShowResignConfirm(false)
    if (gameId) {
      const supabase = createClientComponentClient()
      await supabase.from('casual_games').update({
        status: 'completed',
        winner_id: winnerId,
        result: reason,
        ended_at: new Date().toISOString(),
      }).eq('id', gameId)
    }
  }

  // ── Player resign ──
  const handlePlayerResign = () => {
    handleGameOver(null, 'resign', 'you_lose')
  }

  // ── Move navigation ──
  const goToPrevMove = () => setViewingIndex(prev => Math.max(0, prev - 1))
  const goToNextMove = () => setViewingIndex(prev => Math.min(fenHistory.length - 1, prev + 1))
  const goToCurrentMove = () => setViewingIndex(fenHistory.length - 1)

  // ── Square click ──
  const handleSquareClick = useCallback((square: string) => {
    if (status === 'finished' || botThinking || isViewingHistory) return
    const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                     (playerColor === 'black' && game.turn() === 'b')
    if (!isMyTurn) return

    if (selectedSquare) {
      const gameCopy = new Chess(game.fen())
      try {
        const move = gameCopy.move({ from: selectedSquare, to: square, promotion: 'q' })
        if (move) {
          const timeSpent = Date.now() - moveStartRef.current
          moveStartRef.current = Date.now()
          setGame(gameCopy)
          setLastPlayerMove({ from: selectedSquare, to: square })setTimeout(() => setLastPlayerMove(null), 1500)
          setMoveNumber(prev => prev + 1)
          setSelectedSquare(null)
          setMoveHistory(prev => [...prev, move.san])
          setFenHistory(prev => {
            const updated = [...prev, gameCopy.fen()]
            setViewingIndex(updated.length - 1)
            return updated
          })
          saveMove(gameCopy, move.san, selectedSquare + square, playerColor, timeSpent)
          if (gameCopy.isGameOver()) {
            if (gameCopy.isCheckmate()) handleGameOver(userId, 'checkmate', 'you_win')
            else handleGameOver(null, 'draw', 'draw')
          }
          return
        }
      } catch {}
      setSelectedSquare(null)
    } else {
      const piece = game.get(square as any)
      if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        setSelectedSquare(square)
      }
    }
  }, [game, selectedSquare, playerColor, status, botThinking, userId, gameId, isViewingHistory])

  // ── Piece drop ──
  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (status === 'finished' || !gameId || !userId || botThinking || isViewingHistory) return false
    const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                     (playerColor === 'black' && game.turn() === 'b')
    if (!isMyTurn) return false

    const gameCopy = new Chess(game.fen())
    let move = null
    try {
      move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch { return false }
    if (!move) return false

    const timeSpent = Date.now() - moveStartRef.current
    moveStartRef.current = Date.now()
    setGame(gameCopy)
    setLastPlayerMove({ from: sourceSquare, to: targetSquare })setTimeout(() => setLastPlayerMove(null), 1500)
    setMoveNumber(prev => prev + 1)
    setMoveHistory(prev => [...prev, move!.san])
    setFenHistory(prev => {
      const updated = [...prev, gameCopy.fen()]
      setViewingIndex(updated.length - 1)
      return updated
    })
    saveMove(gameCopy, move.san, sourceSquare + targetSquare, playerColor, timeSpent)

    if (gameCopy.isGameOver()) {
      if (gameCopy.isCheckmate()) handleGameOver(userId, 'checkmate', 'you_win')
      else handleGameOver(null, 'draw', 'draw')
    }

    return true
  }, [game, gameId, userId, playerColor, status, botThinking, isViewingHistory])

  const formatTime = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-[#00d4ff] border-[#1e2d3d] animate-spin" />
      </main>
    )
  }

  const isMyTurn = (playerColor === 'white' && game.turn() === 'w') ||
                   (playerColor === 'black' && game.turn() === 'b')
  const myTime = playerColor === 'white' ? whiteTime : blackTime
  const oppTime = playerColor === 'white' ? blackTime : whiteTime

  const botMoveHighlight = lastBotMove ? {
    [lastBotMove.from]: { backgroundColor: 'rgba(255, 210, 0, 0.35)' },
    [lastBotMove.to]: { backgroundColor: 'rgba(255, 210, 0, 0.55)' },
  } : {}

  const playerMoveHighlight = lastPlayerMove ? {
    [lastPlayerMove.from]: { backgroundColor: 'rgba(0, 212, 255, 0.35)' },
    [lastPlayerMove.to]: { backgroundColor: 'rgba(0, 212, 255, 0.55)' },
  } : {}

  const selectedHighlight = selectedSquare ? {
    [selectedSquare]: { backgroundColor: 'rgba(0, 212, 255, 0.4)' }
  } : {}

  const boardFen = fenHistory[viewingIndex] || game.fen()

  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            status === 'finished' ? 'bg-gray-500/20 text-gray-400'
            : isViewingHistory ? 'bg-purple-500/20 text-purple-400'
            : isMyTurn ? 'bg-green-500/20 text-green-400'
            : botThinking ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {status === 'finished' ? 'Game Over'
              : isViewingHistory ? 'Reviewing...'
              : botThinking ? `${opponentName} ${thinkingMsg}`
              : isMyTurn ? 'Your Turn ♟'
              : "Opponent's Turn"}
          </div>
          {status === 'playing' && !isViewingHistory && (
            <button
              onClick={() => setShowResignConfirm(true)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Resign
            </button>
          )}
          {isViewingHistory && (
            <button
              onClick={goToCurrentMove}
              className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              Back to game
            </button>
          )}
        </div>
      </div>

      {/* Opponent bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mb-3 border border-[#1e2d3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg border border-[#1e2d3d] bg-[#161b22]">
            {opponentFlag}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{opponentName}</p>
            <p className="text-gray-500 text-xs">
              {opponentCountry || (playerColor === 'white' ? 'Black' : 'White')}
              {botThinking && (
                <span className="text-yellow-500 animate-pulse"> · {thinkingMsg}</span>
              )}
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg font-mono ${
          oppTime < 30 ? 'bg-red-500/20 text-red-400' : 'bg-[#1e2d3d] text-white'
        }`}>
          {formatTime(oppTime)}
        </div>
      </div>

      {/* Board */}
      <div className="px-4 flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <Chessboard
            position={boardFen}
            onPieceDrop={onDrop}
            boardOrientation={playerColor}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#1e2d3d' }}
            customLightSquareStyle={{ backgroundColor: '#2d4060' }}
            arePiecesDraggable={status !== 'finished' && !botThinking && !isViewingHistory}
            onSquareClick={handleSquareClick}
            animationDuration={200}
            customSquareStyles={{
              ...botMoveHighlight,
              ...playerMoveHighlight,
              ...selectedHighlight,
            }}
          />
        </div>
      </div>

      {/* Move navigation */}
      <div className="px-4 mt-3">
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewingIndex(0)}
              disabled={viewingIndex === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#161b22] text-white disabled:opacity-30 hover:bg-[#1e2d3d] transition-colors text-xs"
            >⏮</button>
            <button
              onClick={goToPrevMove}
              disabled={viewingIndex === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#161b22] text-white disabled:opacity-30 hover:bg-[#1e2d3d] transition-colors"
            >←</button>
            <button
              onClick={goToNextMove}
              disabled={viewingIndex === fenHistory.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#161b22] text-white disabled:opacity-30 hover:bg-[#1e2d3d] transition-colors"
            >→</button>
            <button
              onClick={goToCurrentMove}
              disabled={viewingIndex === fenHistory.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#161b22] text-white disabled:opacity-30 hover:bg-[#1e2d3d] transition-colors text-xs"
            >⏭</button>
            <div className="flex-1 overflow-x-auto flex gap-1 ml-1">
              {moveHistory.map((move, i) => (
                <button
                  key={i}
                  onClick={() => setViewingIndex(i + 1)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                    viewingIndex === i + 1
                      ? 'bg-[#00d4ff] text-black font-bold'
                      : 'bg-[#161b22] text-gray-400 hover:bg-[#1e2d3d] hover:text-white'
                  }`}
                >
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{move}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* My bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mt-3 mb-4 border border-[#1e2d3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-lg">
            ♙
          </div>
          <div>
            <p className="text-white font-bold text-sm">{myName}</p>
            <p className="text-gray-500 text-xs capitalize">{playerColor}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg font-mono ${
          myTime < 30 ? 'bg-red-500/20 text-red-400' : 'bg-[#00d4ff]/10 text-[#00d4ff]'
        }`}>
          {formatTime(myTime)}
        </div>
      </div>

      {/* Resign confirm modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="text-4xl mb-4">🏳️</p>
            <h2 className="text-xl font-bold text-white mb-2">Resign?</h2>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to give up?</p>
            <button
              onClick={handlePlayerResign}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm mb-3"
            >Yes, Resign</button>
            <button
              onClick={() => setShowResignConfirm(false)}
              className="w-full text-gray-600 text-xs hover:text-gray-400 py-2"
            >Keep Playing</button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="text-5xl mb-4">
              {result === 'draw' ? '🤝' : result === 'you_win' ? '🏆' : '💀'}
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">
              {result === 'draw' ? 'Draw!' : result === 'you_win' ? 'You Win!' : 'You Lose'}
            </h2>
            <p className="text-gray-500 text-sm mb-2">vs {opponentName}</p>
            {botProfile && (
              <p className="text-gray-600 text-xs mb-6">{opponentFlag} {opponentCountry}</p>
            )}
            <button
              onClick={() => router.push(`/play/analysis?id=${gameId}`)}
              className="w-full bg-[#1e2d3d] hover:bg-[#2a3d50] text-white font-bold py-3 rounded-xl text-sm mb-3"
            >View Analysis 📊</button>
            <button
              onClick={() => router.push('/play')}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-black font-bold py-3 rounded-xl text-sm mb-3"
            >Play Again ♟</button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full text-gray-600 text-xs hover:text-gray-400 py-2"
            >Back to Dashboard</button>
          </div>
        </div>
      )}

    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-white text-sm">Loading...</div>
      </main>
    }>
      <GameContent />
    </Suspense>
  )
}
