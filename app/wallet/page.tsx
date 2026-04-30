'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const AMOUNTS = [5, 10, 20, 50, 100]

export default function WalletPage() {
  const [balance, setBalance] = useState(0.00)
  const [username, setUsername] = useState('Player')
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClientComponentClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase
        .from('users')
        .select('username, wallet_balance')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) setUsername(data.username)
          if (data?.wallet_balance) setBalance(data.wallet_balance)
        })
    })
  }, [router])

  const depositAmount = selected || (custom ? parseFloat(custom) : 0)

  const handleDeposit = async () => {
    if (!depositAmount || depositAmount < 5) {
      setError('Minimum deposit is $5')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositAmount }),
      })
      const data = await res.json()
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl
      } else {
        setError('Failed to create PayPal order. Try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#080c10] pb-24">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <div className="w-16" />
      </div>

      <div className="px-5">

        {/* Balance card */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6 mb-6">
          <p className="text-gray-500 text-xs mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-white">${balance.toFixed(2)}</p>
          <p className="text-gray-600 text-xs mt-2">{username}'s wallet</p>
        </div>

        {/* Deposit section */}
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Deposit Funds</p>

        {/* Quick amounts */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => { setSelected(amount); setCustom('') }}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                selected === amount
                  ? 'bg-[#00d4ff] text-black'
                  : 'bg-[#0d1117] border border-[#1e2d3d] text-white hover:border-[#00d4ff]'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-6">
          <label className="text-gray-400 text-sm mb-2 block">Custom amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={custom}
              onChange={e => { setCustom(e.target.value); setSelected(null) }}
              placeholder="Enter amount..."
              min={5}
              className="w-full bg-[#161b22] border border-[#1e2d3d] text-white placeholder-gray-600 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <p className="text-gray-600 text-xs mt-1">Minimum deposit $5.00</p>
        </div>

        {/* Summary */}
        {depositAmount >= 5 && (
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-5 py-4 mb-6">
            <div className="flex justify-between mb-2">
              <p className="text-gray-400 text-sm">Deposit amount</p>
              <p className="text-white font-bold text-sm">${depositAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between mb-2">
              <p className="text-gray-400 text-sm">Processing fee</p>
              <p className="text-gray-400 text-sm">$0.00</p>
            </div>
            <div className="border-t border-[#1e2d3d] pt-2 mt-2 flex justify-between">
              <p className="text-white font-bold text-sm">New balance</p>
              <p className="text-green-400 font-bold text-sm">${(balance + depositAmount).toFixed(2)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-5">
            {success}
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={!depositAmount || depositAmount < 5 || loading}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors text-sm mb-4"
        >
          {loading ? 'Processing...' : `Deposit via PayPal${depositAmount >= 5 ? ` — $${depositAmount.toFixed(2)}` : ''}`}
        </button>

        {/* Withdraw section */}
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5 mt-6">
          <p className="text-white font-bold text-sm mb-1">Withdraw Funds</p>
          <p className="text-gray-500 text-xs mb-4">Withdraw your winnings directly to your PayPal account</p>
          <button
            onClick={() => router.push('/wallet/withdraw')}
            className="w-full border border-[#1e2d3d] hover:border-[#00d4ff] text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            Withdraw to PayPal →
          </button>
        </div>

      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#1e2d3d] px-6 py-3 flex items-center justify-around">
        <NavItem icon="🏠" label="Dashboard" onClick={() => router.push('/dashboard')} />
        <NavItem icon="💰" label="Wallet" active onClick={() => router.push('/wallet')} />
        <NavItem icon="👤" label="Profile" onClick={() => router.push('/profile')} />
        <NavItem icon="📊" label="Leaderboard" onClick={() => router.push('/leaderboard')} />
      </div>

    </main>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span className="text-xl">{icon}</span>
      <span className={`text-xs ${active ? 'text-[#00d4ff]' : 'text-gray-600'}`}>{label}</span>
    </button>
  )
}
