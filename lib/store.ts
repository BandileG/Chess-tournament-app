import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface AppStore {
  user: any | null
  session: any | null
  setUser: (user: any) => void
  setSession: (session: any) => void
  logout: () => void
  wallet: any | null
  setWallet: (wallet: any) => void
  updateBalance: (balance: number) => void
  tournaments: any[]
  activeTournamentId: string | null
  setTournaments: (t: any[]) => void
  upsertTournament: (t: any) => void
  setActiveTournament: (id: string | null) => void
  activeMatchId: string | null
  activeMatch: any | null
  setActiveMatch: (match: any) => void
  setActiveMatchId: (id: string | null) => void
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
        user: null,
        session: null,
        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        logout: () => set({
          user: null,
          session: null,
          wallet: null,
          activeMatchId: null,
        }),

        wallet: null,
        setWallet: (wallet) => set({ wallet }),
        updateBalance: (balance) => set(state => ({
          wallet: state.wallet ? { ...state.wallet, balance } : null
        })),

        tournaments: [],
        activeTournamentId: null,
        setTournaments: (tournaments) => set({ tournaments }),
        upsertTournament: (tournament) => set(state => {
          const exists = state.tournaments.find((t: any) => t.id === tournament.id)
          if (exists) {
            return {
              tournaments: state.tournaments.map((t: any) =>
                t.id === tournament.id ? tournament : t
              )
            }
          }
          return { tournaments: [tournament, ...state.tournaments] }
        }),
        setActiveTournament: (id) => set({ activeTournamentId: id }),

        activeMatchId: null,
        activeMatch: null,
        setActiveMatch: (match) => set({ activeMatch: match }),
        setActiveMatchId: (id) => set({ activeMatchId: id }),

        toasts: [],
        sidebarOpen: false,
        addToast: (message, type = 'info') => {
          const id = Math.random().toString(36).slice(2)
          set(state => ({
            toasts: [...state.toasts, { id, message, type }]
          }))
          setTimeout(() => get().removeToast(id), 4000)
        },
        removeToast: (id) => set(state => ({
          toasts: state.toasts.filter(t => t.id !== id)
        })),
        toggleSidebar: () => set(state => ({
          sidebarOpen: !state.sidebarOpen
        })),
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
