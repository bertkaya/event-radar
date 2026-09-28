'use client'

import { useEffect, useState } from 'react'

/** Admin oturumu yoksa şifre ekranı gösterir; varsa children'ı render eder. */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'out' | 'in'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then(j => setStatus(j.authenticated ? 'in' : 'out'))
      .catch(() => setStatus('out'))
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setPassword('')
        setStatus('in')
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Giriş başarısız')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'in') return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      {status === 'checking' ? (
        <div className="text-brand font-bold animate-pulse">Kontrol ediliyor...</div>
      ) : (
        <form onSubmit={login} className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 text-center space-y-4 max-w-sm w-full">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-3xl">🔒</div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">YÖNETİCİ PANELİ</h1>
          <label htmlFor="admin-password" className="block text-sm text-gray-500">Yönetici şifresi</label>
          <input
            id="admin-password"
            autoFocus
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full text-center text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl p-3 focus:border-brand focus:ring-4 focus:ring-brand/10 bg-gray-50 dark:bg-gray-900 outline-none transition"
          />
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</div>}
          <button disabled={submitting || !password} className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-brand-dark disabled:opacity-50">
            {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      )}
    </div>
  )
}

export async function adminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' })
  window.location.reload()
}
