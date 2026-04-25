'use client'
import { createContext, useContext, useCallback } from 'react'
import { useStore } from '@/lib/store'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type ToastFn = (message: string, type?: ToastType) => void

const ToastContext = createContext<ToastFn | undefined>(undefined)

const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
const COLORS: Record<ToastType, string> = {
  success: 'border-green-500/40 text-green-400',
  error:   'border-red-500/40 text-red-400',
  info:    'border-[rgba(0,212,255,0.3)] text-[#00d4ff]',
  warning: 'border-yellow-500/40 text-yellow-400',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const addToast = useStore(s => s.addToast)
  const removeToast = useStore(s => s.removeToast)
  const toasts = useStore(s => s.toasts)

  const toast = useCallback<ToastFn>((message, type = 'info') => {
    addToast(message, type)
  }, [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
              bg-[#161b22] border backdrop-blur-sm shadow-xl
              animate-slide-in text-sm font-semibold cursor-pointer
              ${COLORS[t.type as ToastType]}
            `}
          >
            <span>{ICONS[t.type as ToastType]}</span>
            <span className="text-white">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
