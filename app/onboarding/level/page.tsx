'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LevelPage() {
  const [platform, setPlatform] = useState<string | null>(null)
  const router = useRouter()

  const handleNext = () => {
    if (!platform) return
    localStorage.setItem('onboarding_platform', platform)
    router.push('/onboarding/elo')
  }

  return (
    <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex gap-2 mb-10 justify-center">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1 w-12 rounded-full ${i === 1 ? 'bg-[#00d4ff]' : 'bg-[#1e2d3d]'}`} />
          ))}
        </div>

        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold text-white">Do you play on any platform?</h1>
        </div>

        {/* Recommended banner */}
        <div className="bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.2)] rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-[#00d4ff] text-lg mt-0.5">⚡</span>
          <div>
            <p className="text-[#00d4ff] text-sm font-semibold">Verification recommended</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Linking your Chess.com or Lichess account verifies your ELO, 
              earns you a verified badge, and gives you higher trust on the platform. 
              Unverified players are monitored more closely.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8">

          {/* Chess.com */}
          <button
            onClick={() => setPlatform('chess.com')}
            className={`py-4 px-5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              platform === 'chess.com'
                ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.08)]'
                : 'border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060]'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">♟️</span>
              <div>
                <p className="text-white font-semibold text-sm">Chess.com</p>
                <p className="text-gray-500 text-xs">Verify your Chess.com rating</p>
              </div>
            </div>
            <span className="text-[#00d4ff] text-xs font-bold bg-[rgba(0,212,255,0.1)] px-2 py-1 rounded-full">
              Recommended
            </span>
          </button>

          {/* Lichess */}
          <button
            onClick={() => setPlatform('lichess')}
            className={`py-4 px-5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              platform === 'lichess'
                ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.08)]'
                : 'border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060]'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">🏁</span>
              <div>
                <p className="text-white font-semibold text-sm">Lichess.org</p>
                <p className="text-gray-500 text-xs">Verify your Lichess rating</p>
              </div>
            </div>
            <span className="text-[#00d4ff] text-xs font-bold bg-[rgba(0,212,255,0.1)] px-2 py-1 rounded-full">
              Recommended
            </span>
          </button>

          {/* Both */}
          <button
            onClick={() => setPlatform('both')}
            className={`py-4 px-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${
              platform === 'both'
                ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.08)]'
                : 'border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060]'
            }`}
          >
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-white font-semibold text-sm">I play on both</p>
              <p className="text-gray-500 text-xs">We'll use your highest verified rating</p>
            </div>
          </button>

          {/* None — skip verification */}
          <button
            onClick={() => setPlatform('none')}
            className={`py-4 px-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${
              platform === 'none'
                ? 'border-gray-600 bg-[rgba(255,255,255,0.03)]'
                : 'border-[#1e2d3d] bg-[#0d1117] hover:border-[#2d4060]'
            }`}
          >
            <span className="text-2xl">🆕</span>
            <div>
              <p className="text-gray-400 font-semibold text-sm">I don't play on any platform</p>
              <p className="text-gray-600 text-xs">You'll self-select your level — unverified</p>
            </div>
          </button>

        </div>

        <button
          onClick={handleNext}
          disabled={!platform}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm"
        >
          Continue →
        </button>

      </div>
    </main>
  )
}
