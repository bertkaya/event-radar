'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

// E-postadaki sıfırlama linki buraya gelir; supabase-js URL'deki token'ı okuyup geçici oturum açar.
export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
    if (password !== confirm) return setError('Şifreler eşleşmiyor.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return setError(error.message)
    toast('✅ Şifren güncellendi.')
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-white">Yeni Şifre Belirle</h1>
        {!ready ? (
          <div className="text-center text-sm text-gray-500 space-y-3">
            <p>Bağlantı doğrulanıyor… Bu mesaj kaybolmuyorsa bağlantının süresi dolmuş olabilir.</p>
            <Link href="/login" className="font-bold text-brand hover:underline">Yeni bağlantı iste</Link>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <input type="password" required minLength={8} autoComplete="new-password" placeholder="Yeni şifre" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 p-3 rounded-lg" />
            <input type="password" required minLength={8} autoComplete="new-password" placeholder="Yeni şifre (tekrar)" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 p-3 rounded-lg" />
            {error && <div className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <button disabled={saving} className="w-full bg-brand text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
