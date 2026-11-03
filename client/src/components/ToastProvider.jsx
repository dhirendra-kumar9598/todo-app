import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext } from '../context/toast'

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((message, { tone = 'default', duration = 2800 } = {}) => {
    clearTimeout(timer.current)
    setToast({ message, tone, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-50">
        {toast && (
          <div
            key={toast.key}
            className={`animate-toast-in absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-danger' : 'bg-ink'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
