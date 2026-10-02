// lib/toast.ts
// alert() yerine engellemeyen bildirim. <Toaster /> layout'ta dinler.

export const TOAST_EVENT = 'app:toast'

export type ToastKind = 'info' | 'success' | 'error'
export type ToastDetail = { message: string; kind: ToastKind }

function inferKind(message: string): ToastKind {
  if (/^✅|başarı|alındı|gönderildi|eklendi|güncellendi|kaydedildi|yüklendi|silindi/i.test(message)) return 'success'
  if (/^❌|hata|geçersiz|başarısız|yetkisiz|gerekli|bulunamadı|lütfen/i.test(message)) return 'error'
  return 'info'
}

export function toast(message: string, kind?: ToastKind): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, kind: kind || inferKind(message) } }))
}
