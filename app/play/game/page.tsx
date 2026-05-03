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
  'is finding the best move...',
]

function GameContent() {
  const [game, setGame] = useState(new Chess())
  const [gameId, setGameId] = useState<string | null>(null)
  const [isVsBot, setIsVsBot] = useState(false)
  const [botLevel, setBotLevel] = useState(5)
  const [botProfile, setBotProfile] = useState<BotProfile | null>(null)
  const [thinkingMsg, setThinkingMsg] = useState('is thinking...')
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [userId, setUserId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState('Opponent')
  const [myName, setMyName] = useState('You')
  const [whiteTime, setWhiteTime] = useState(300)
  const [blackTime, setBlackTime] = useState(300)
  const [status, setStatus] = useState<'playing' | 'finished'>('playing')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [botThinking, setBotThinking] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [moveNumber, setMoveNumber] = useState(1)
  const router = useRouter()
  const searchParams = useSearchParams()
  const moveStartRef = useRef<number>(Date.now())

  // Rotate thinking messages
  useEffect(() => {
    if (!botThinking) return
    const msgs = THINKING_MESSAGES
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length
      setThinkingMsg(msgs[i])
    }, 3000)
    return () => clearInterval(interval)
  }, [botThinking])

  // Get params + user
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

  // Load game data
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

        // Load bot profile from game data
        if (data.is_vs_bot && data.bot_name) {
          setBotProfile({
            id: data.bot_id || 'bot',
            name: data.bot_name,
            flag: data.bot_flag || '🌍',
            country: '',
            elo: data.bot_elo || 800,
            avatar: data.bot_avatar || '♟',
            bio: data.bot_bio || '',
            delay: [3000, 8000],
            stockfishLevel: data.bot_level || 5,
          })
          setOpponentName(data.bot_name)
        }

        if (data.current_fen) {
          const g = new Chess()
          g.load(data.current_fen)
          setGame(g)
          setMoveNumber(Math.ceil(g.history().length / 2) + 1)
        }

        setWhiteTime(Math.floor(data.white_time_remaining / 1000))
        setBlackTime(Math.floor(data.black_time_remaining / 1000))

        if (data.status === 'completed') {
          setStatus('finished')
          setResult(data.result)
        }

        // Get opponent name for human games
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

    // Realtime for vs human
    const channel = supabase.channel('casual-' + gameId)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'casual_games', filter: `id=eq.${gameId}`,
      }, (payload) => {
        const updated = payload.new as any
        if (updated.current_fen) {
          const g = new Chess()
          g.load(updated.current_fen)
          setGame(g)
          setMoveNumber(Math.ceil(g.history().length / 2) + 1)
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

  // Timer
  useEffect(() => {
    if (status === 'finished') return
    const interval = setInterval(() => {
      const isWhiteTurn = game.turn() === 'w'
      if (isWhiteTurn) {
        setWhiteTime(prev => {
          if (prev <= 1) { handleGameOver(null, 'timeout'); return 0 }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 1) { handleGameOver(null, 'timeout'); return 0 }
          return prev - 1
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [game, status])

  // Bot move
  const makeBotMove = useCallback(async (currentGame: Chess) => {
    if (status === 'finished') return
    setBotThinking(true)

    try {
      const res = await fetch('/api/play/bot-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          fen: currentGame.fen(),
          bot_level: botLevel,
          bot_id: botProfile?.id,
          move_number: moveNumber,
        }),
      })
      const data = await res.json()
      if (!data.success) { setBotThinking(false); return }

      const uci = data.move
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length === 5 ? uci[4] : 'q'

      const gameCopy = new Chess(currentGame.fen())
      const move = gameCopy.move({ from, to, promotion })
      if (!move) { setBotThinking(false); return }

      setBotThinking(false)
      setGame(gameCopy)
      setMoveNumber(prev => prev + 1)
      saveMove(gameCopy, move.san, uci, 'black', 0)

      if (gameCopy.isGameOver()) {
        handleGameOver(gameCopy.isCheckmate() ? userId : null, 'checkmate')
      }
    } catch {
      setBotThinking(false)
    }
  }, [botLevel, status, userId, gameId, botProfile, moveNumber])

  // Trigger bot move
  useEffect(() => {
    if (!isVsBot || status === 'finished' || botThinking) return
    const isBotTurn = (playerColor === 'white' && game.turn() === 'b') ||
                      (playerColor === 'black' && game.turn() === 'w')
    if (isBotTurn) makeBotMove(game)
  }, [game, isVsBot, playerColor, status])

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

  const handleGameOver = async (winnerId: string | null, reason: string) => {
    if (status === 'finished') return
    setStatus('finished')
    const isWinner = winnerId === userId
    setResult(isWinner ? 'you_win' : winnerId === null ? 'draw' : 'you_lose')
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

  const handleSquareClick = useCallback((square: string) => {
    if (status === 'finished' || botThinking) return
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
          setMoveNumber(prev => prev + 1)
          setSelectedSquare(null)
          saveMove(gameCopy, move.san, selectedSquare + square, playerColor, timeSpent)
          if (gameCopy.isGameOver()) {
            if (gameCopy.isCheckmate()) handleGameOver(userId, 'checkmate')
            else handleGameOver(null, 'draw')
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
  }, [game, selectedSquare, playerColor, status, botThinking, userId, gameId])

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (status === 'finished') return false
    if (!gameId || !userId) return false
    if (botThinking) return false

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
    setMoveNumber(prev => prev + 1)
    saveMove(gameCopy, move.san, sourceSquare + targetSquare, playerColor, timeSpent)

    if (gameCopy.isGameOver()) {
      if (gameCopy.isCheckmate()) handleGameOver(userId, 'checkmate')
      else handleGameOver(null, 'draw')
    }

    return true
  }, [game, gameId, userId, playerColor, status, botThinking])

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
          : botThinking ? 'bg-purple-500/20 text-purple-400'
          : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {status === 'finished' ? 'Game Over'
            : botThinking ? '⏳ Opponent thinking'
            : isMyTurn ? 'Your Turn ♟'
            : "Opponent's Turn"}
        </div>
      </div>

      {/* Opponent bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#0d1117] mx-4 rounded-2xl mb-3 border border-[#1e2d3d]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${
            botThinking
              ? 'border-purple-500/40 bg-purple-500/10'
              : 'border-[#1e2d3d] bg-[#161b22]'
          }`}>
            {isVsBot ? botProfile?.avatar || '♟' : '♟️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm">
                {isVsBot ? botProfile?.name || opponentName : opponentName}
              </p>
              {isVsBot && botProfile && (
                <span className="text-xs">{botProfile.flag}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isVsBot && botProfile ? (
                <>
                  <p className="text-gray-500 text-xs">{botProfile.elo} ELO</p>
                  {botThinking && (
                    <p className="text-purple-400 text-xs animate-pulse">
                      {thinkingMsg}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-xs capitalize">
                  {playerColor === 'white' ? 'Black' : 'White'}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg font-mono ${
          oppTime < 30 ? 'bg-red-500/20 text-red-400' : 'bg-[#1e2d3d] text-white'
        }`}>
          {formatTime(oppTime)}
        </div>
      </div>

      {/* Bot bio tooltip */}
      {isVsBot && botProfile?.bio && !botThinking && status === 'playing' && moveNumber <= 3 && (
        <div className="mx-4 mb-3 px-4 py-2 bg-[#0d1117] border border-[#1e2d3d] rounded-xl">
          <p className="text-gray-500 text-xs italic">"{botProfile.bio}"</p>
        </div>
      )}

      {/* Board */}
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
            arePiecesDraggable={status !== 'finished' && !botThinking}
            onSquareClick={handleSquareClick}
            customSquareStyles={{
              ...(selectedSquare
                ? { [selectedSquare]: { backgroundColor: 'rgba(0, 212, 255, 0.4)' } }
                : {}),
            }}
          />
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
            {isVsBot && botProfile && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span>{botProfile.flag}</span>
                <p className="text-gray-400 text-sm">vs {botProfile.name}</p>
                <span className="text-gray-600 text-xs">({botProfile.elo} ELO)</span>
              </div>
            )}
            {result === 'you_lose' && isVsBot && botProfile && (
              <p className="text-gray-600 text-xs italic mb-4">
                "{botProfile.bio}"
              </p>
            )}
            <button
              onClick={() => router.push('/play')}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] text-black font-bold py-3 rounded-xl text-sm mb-3"
            >
              Play Again ♟
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