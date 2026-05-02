'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  rating: number
  wins: number
  losses: number
  draws: number
  total_earnings: number
  wallet_balance: number
  onboarded: boolean
  fair_play_agreed: boolean
  created_at: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'settings'>('stats')
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClientComponentClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      // Load profile
      supabase.from('users').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setNewDisplayName(data.display_name || data.username)
          }
          setLoading(false)
        })

      // Load recent transactions
      supabase.from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) setTransactions(data)
        })
    })
  }, [router])

  const handleSaveDisplayName = async () => {
    if (!profile || !newDisplayName.trim()) return
    setSaving(true)
    const supabase = createClientComponentClient()
    await supabase.from('users')
      .update({ display_name: newDisplayName.trim() })
      .eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, display_name: newDisplayName.trim() } : null)
    setEditingName(false)
    setSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClientComponentClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-[#00d4ff] border-[#1e2d3d] animate-spin" />
      </main>
    )
  }

  if (!profile) return null

  const totalGames = profile.wins + profile.losses + profile.draws
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0
  const initials = profile.username.slice(0, 2).toUpperCase()

  const TX_ICONS: Record<string, string> = {
    deposit: '💳',
    withdrawal: '💸',
    entry: '🎮',
    winning: '🏆',
    refund: '↩️',
  }

  const TX_COLORS: Record<string, string> = {
    deposit: 'text-green-400',
    withdrawal: 'text-red-400',
    entry: 'text-yellow-400',
    winning: 'text-[#00d4ff]',
    refund: 'text-gray-400',
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <main className="min-h-screen bg-[#080c10] pb-24">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-sm font-bold">
          <span className="text-[#00d4ff]">BLITZ</span>
          <span className="text-white">STAKE</span>
        </h1>
        <button
          onClick={handleLogout}
          className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Profile header */}
      <div className="px-5 mb-6">
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center text-black font-bold text-xl flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    className="flex-1 bg-[#1e2d3d] border border-[#2d4060] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#00d4ff]"
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={saving}
                    className="bg-[#00d4ff] text-black text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-gray-500 text-xs px-2"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-lg truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-gray-500 text-xs mt-0.5">@{profile.username}</p>
              <div className="flex items-center gap-2 mt-1">
                {profile.fair_play_agreed && (
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold">
                    ✓ Fair Play
                  </span>
                )}
                <span className="text-[10px] bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 px-2 py-0.5 rounded-full font-semibold">
                  ★ {profile.rating} ELO
                </span>
              </div>
            </div>
          </div>

          {/* Balance + earnings row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#080c10] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">Wallet Balance</p>
              <p className="text-[#00d4ff] font-bold text-xl">
                ${(profile.wallet_balance ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-[#080c10] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">Total Earned</p>
              <p className="text-green-400 font-bold text-xl">
                ${(profile.total_earnings ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="flex bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-1 gap-1">
          {(['stats', 'history', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-[#00d4ff] text-black'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="px-5">
          {/* Win rate */}
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5 mb-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Performance</p>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-semibold">Win Rate</p>
              <p className="text-[#00d4ff] font-bold">{winRate}%</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#1e2d3d] rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] h-2 rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
            {/* W/L/D */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#080c10] rounded-xl p-3 text-center">
                <p className="text-green-400 font-bold text-xl">{profile.wins}</p>
                <p className="text-gray-500 text-xs mt-0.5">Wins</p>
              </div>
              <div className="bg-[#080c10] rounded-xl p-3 text-center">
                <p className="text-red-400 font-bold text-xl">{profile.losses}</p>
                <p className="text-gray-500 text-xs mt-0.5">Losses</p>
              </div>
              <div className="bg-[#080c10] rounded-xl p-3 text-center">
                <p className="text-gray-400 font-bold text-xl">{profile.draws}</p>
                <p className="text-gray-500 text-xs mt-0.5">Draws</p>
              </div>
            </div>
          </div>

          {/* More stats */}
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Career</p>
            {[
              { label: 'Total Games', value: totalGames },
              { label: 'ELO Rating', value: profile.rating },
              { label: 'Total Earned', value: `$${(profile.total_earnings ?? 0).toFixed(2)}` },
              { label: 'Member Since', value: formatDate(profile.created_at) },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-3 border-b border-[#1e2d3d] last:border-0">
                <p className="text-gray-400 text-sm">{item.label}</p>
                <p className="text-white font-bold text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="px-5">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-500 text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i < transactions.length - 1 ? 'border-b border-[#1e2d3d]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#080c10] flex items-center justify-center text-lg flex-shrink-0">
                      {TX_ICONS[tx.type] ?? '💰'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {formatDate(tx.created_at)} · {formatTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${
                    tx.amount > 0
                      ? TX_COLORS[tx.type] ?? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="px-5">
          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl overflow-hidden mb-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest px-5 pt-5 pb-3">Account</p>
            {[
              {
                label: 'Display Name',
                value: profile.display_name || profile.username,
                action: () => { setActiveTab('stats'); setEditingName(true) }
              },
              {
                label: 'Username',
                value: `@${profile.username}`,
                action: null
              },
              {
                label: 'ELO Rating',
                value: `${profile.rating}`,
                action: null
              },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < arr.length - 1 ? 'border-b border-[#1e2d3d]' : ''
                } ${item.action ? 'cursor-pointer hover:bg-[#1e2d3d]/30' : ''}`}
                onClick={item.action ?? undefined}
              >
                <p className="text-gray-400 text-sm">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold">{item.value}</p>
                  {item.action && <span className="text-gray-600 text-xs">›</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl overflow-hidden mb-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest px-5 pt-5 pb-3">Actions</p>
            <button
              onClick={() => router.push('/wallet')}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d] hover:bg-[#1e2d3d]/30 transition-colors"
            >
              <p className="text-gray-400 text-sm">Wallet</p>
              <span className="text-gray-600 text-xs">›</span>
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1e2d3d]/30 transition-colors"
            >
              <p className="text-gray-400 text-sm">Leaderboard</p>
              <span className="text-gray-600 text-xs">›</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold py-4 rounded-2xl text-sm hover:bg-red-500/20 transition-all"
          >
            Logout
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#1e2d3d] px-6 py-3 flex items-center justify-around">
        <NavItem icon="🏠" label="Dashboard" onClick={() => router.push('/dashboard')} />
        <NavItem icon="💰" label="Wallet" onClick={() => router.push('/wallet')} />
        <NavItem icon="👤" label="Profile" active onClick={() => router.push('/profile')} />
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