'use client'

import { useEffect, useState } from 'react'
import { TOAST_EVENT, type ToastDetail } from '@/lib/toast'

type Item = ToastDetail & { id: number }

/** Uygulama geneli bildirimler (alert() yerine). layout.tsx'te bir kez render edilir. */
export default function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    let seq = 0
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail
      const id = ++seq
      setItems(prev => [...prev.slice(-3), { ...detail, id }])
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), detail.kind === 'error' ? 6000 : 3500)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  return (
    <div aria-live="polite" className="fixed z-[9999] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          role={item.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in fade-in slide-in-from-bottom-2 ${
            item.kind === 'error' ? 'bg-red-600' : item.kind === 'success' ? 'bg-emerald-600' : 'bg-gray-900'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
