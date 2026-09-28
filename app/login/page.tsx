// app/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mode = 'signin' | 'signup' | 'forgot'

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-posta veya şifre hatalı.',
  'Email not confirmed': 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.',
  'User already registered': 'Bu e-posta ile zaten bir hesap var.',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kvkk, setKvkk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const router = useRouter()

  const switchMode = (m: Mode) => { setMode(m); setMsg(null) }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setMsg({ text: 'Şifre sıfırlama bağlantısı e-postana gönderildi.', ok: true })
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Şifre en az 8 karakter olmalı.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: email.split('@')[0], kvkk_accepted_at: new Date().toISOString() },
          },
        })
        if (error) throw error
        if (data.session) {
          router.push('/onboarding')
        } else {
          setMsg({ text: 'Kayıt başarılı! Hesabını etkinleştirmek için e-postandaki bağlantıya tıkla.', ok: true })
          setMode('signin')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Tercihleri varsa ana sayfaya, yoksa ankete
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', data.user.id)
          .maybeSingle()
        router.push(profile?.preferences?.length ? '/' : '/onboarding')
      }
    } catch (error) {
      const message = (error as Error).message || 'Bir sorun oluştu'
      setMsg({ text: AUTH_ERRORS[message] || message, ok: false })
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'signup' ? 'Hesap Oluştur' : mode === 'forgot' ? 'Şifremi Unuttum' : 'Giriş Yap'
  const cta = mode === 'signup' ? 'Kayıt Ol' : mode === 'forgot' ? 'Bağlantı Gönder' : 'Giriş Yap'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-brand tracking-tighter">18-23</h1>
          <p className="text-gray-500 text-sm font-bold">MESAİ SONRASI REHBERİ</p>
        </div>

        <h2 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-white">{title}</h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 mb-1 uppercase">E-mail</label>
            <input id="email" type="email" required autoComplete="email" value={email} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none" placeholder="mail@ornek.com" onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase">Şifre</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-bold text-brand hover:underline">Şifremi unuttum</button>
                )}
              </div>
              <input id="password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input type="checkbox" required checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} className="mt-0.5" />
              <span><Link href="/kvkk" target="_blank" className="font-bold underline">KVKK Aydınlatma Metni</Link>&apos;ni okudum, kabul ediyorum.</span>
            </label>
          )}

          {msg && <div role="status" className={`text-center text-sm font-bold p-2 rounded ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}

          <button disabled={loading} className="w-full bg-brand text-white font-bold py-4 rounded-xl hover:bg-brand-dark transition-all shadow-lg transform active:scale-95 disabled:opacity-50">
            {loading ? 'İşleniyor...' : cta}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'forgot' ? (
            <button type="button" onClick={() => switchMode('signin')} className="font-bold text-brand hover:underline">← Girişe dön</button>
          ) : (
            <p className="text-gray-500">
              {mode === 'signup' ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}
              <button onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="ml-2 font-bold text-brand hover:underline" type="button">
                {mode === 'signup' ? 'Giriş Yap' : 'Hemen Kayıt Ol'}
              </button>
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Ana Sayfaya Dön</Link>
        </div>
      </div>
    </div>
  )
}
