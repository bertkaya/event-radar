import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center p-6">
      <h1 className="text-9xl font-black text-brand opacity-20">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Kaybolmuş Gibisin</h2>
      <p className="text-gray-500 mt-2 mb-8">Aradığın etkinlik veya sayfa burada yok.</p>
      <Link href="/" className="bg-brand text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-dark transition">
        Ana Sayfaya Dön
      </Link>
    </div>
  )
}