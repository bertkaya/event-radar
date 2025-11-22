// app/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    try {
      if (isSignUp) {
        // KAYIT OLMA
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split('@')[0] } }
        })
        if (error) throw error
        setMsg('✅ Kayıt başarılı! Şimdi giriş yapabilirsin.')
        setIsSignUp(false)
      } else {
        // GİRİŞ YAPMA
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error

        // --- AKILLI YÖNLENDİRME ---
        // Kullanıcının profilini kontrol et
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', data.user.id)
            .single()

          // Eğer tercihleri varsa Ana Sayfaya, yoksa Ankete gönder
          if (profile && profile.preferences && profile.preferences.length > 0) {
            router.push('/')
          } else {
            router.push('/onboarding')
          }
        }
      }
    } catch (error: any) {
      setMsg('Hata: ' + (error.message || 'Bir sorun oluştu'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-brand tracking-tighter">18-23</h1>
          <p className="text-gray-500 text-sm font-bold">MESAI SONRASI REHBERİ</p>
        </div>

        <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
          {isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">E-mail</label>
            <input type="email" required className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none" placeholder="mail@ornek.com" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Şifre</label>
            <input type="password" required className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none" placeholder="******" onChange={(e) => setPassword(e.target.value)} />
          </div>

          {msg && <div className={`text-center text-sm font-bold p-2 rounded ${msg.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{msg}</div>}

          <button disabled={loading} className="w-full bg-brand text-white font-bold py-4 rounded-xl hover:bg-brand-dark transition-all shadow-lg transform active:scale-95 disabled:opacity-50">
            {loading ? 'İşleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500">
            {isSignUp ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}
            <button onClick={() => { setIsSignUp(!isSignUp); setMsg(''); }} className="ml-2 font-bold text-brand hover:underline" type="button">
              {isSignUp ? 'Giriş Yap' : 'Hemen Kayıt Ol'}
            </button>
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Ana Sayfaya Dön</Link>
        </div>
      </div>
    </div>
  )
}