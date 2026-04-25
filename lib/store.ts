import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User, Wallet, Tournament, Match } from '@/types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface AppStore {
  // Auth
  user: User | null
  session: any | null
  setUser: (user: User | null) => void
  setSession: (session: any | null) => void
  logout: () => void
  // Wallet
  wallet: Wallet | null
  setWallet: (wallet: Wallet | null) => void
  updateBalance: (balance: number) => void
  // Tournaments
  tournaments: Tournament[]
  activeTournamentId: string | null
  setTournaments: (t: Tournament[]) => void
  upsertTournament: (t: Tournament) => void
  setActiveTournament: (id: string | null) => void
  // Match
  activeMatchId: string | null
  activeMatch: Match | null
  setActiveMatch: (match: Match | null) => void
  setActiveMatchId: (id: string | null) => void
  // UI
  toasts: Toast[]
  sidebarOpen: boolean
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  toggleSidebar: () => void
}

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Auth
        user: null,
        session: null,
        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        logout: () => set({ user: null, session: null, wallet: null, activeMatchId: null }),

        // Wallet
        wallet: null,
        setWallet: (wallet) => set({ wallet }),
        updateBalance: (balance) => set(state => ({
          wallet: state.wallet ? { ...state.wallet, balance } : null
        })),

        // Tournaments
        tournaments: [],
        activeTournamentId: null,
        setTournaments: (tournaments) => set({ tournaments }),
        upsertTournament: (tournament) => set(state => {
          const exists = state.tournaments.find(t => t.id === tournament.id)
          if (exists) {
            return { tournaments: state.tournaments.map(t => t.id === tournament.id ? tournament : t) }
          }
          return { tournaments: [tournament, ...state.tournaments] }
        }),
        setActiveTournament: (id) => set({ activeTournamentId: id }),

        // Match
        activeMatchId: null,
        activeMatch: null,
        setActiveMatch: (match) => set({ activeMatch: match }),
        setActiveMatchId: (id) => set({ activeMatchId: id }),

        // UI
        toasts: [],
        sidebarOpen: false,
        addToast: (message, type = 'info') => {
          const id = Math.random().toString(36).slice(2)
          set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
          setTimeout(() => get().removeToast(id), 4000)
        },
        removeToast: (id) => set(state => ({
          toasts: state.toasts.filter(t => t.id !== id)
        })),
        toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      }),
      {
        name: 'blitzstake-store',
        partialize: (state) => ({
          user: state.user,
          activeMatchId: state.activeMatchId,
        }),
      }
    )
  )
)
