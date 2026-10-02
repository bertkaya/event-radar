# 18-23 · Etkinlik Rehberi

Mesai sonrası (18:00–23:00) etkinlik keşif uygulaması: İstanbul, Ankara ve İzmir'deki konser, tiyatro, stand-up ve daha fazlası; harita + liste, kişisel uyum puanı, "Bu Akşamı Planla" ve "Sürpriz Yap".

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind 3 · Supabase (Postgres + Auth) · Leaflet · Puppeteer/Cheerio scraper'lar (GitHub Actions)

## Kurulum

```bash
npm install
cp env.example .env.local   # değerleri doldurun
npm run dev
```

### Ortam değişkenleri

| Değişken | Nerede | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SITE_URL` | public | Canonical adres (paylaşım linkleri, sitemap, OG). Domain değişince sadece bunu güncelleyin |
| `NEXT_PUBLIC_DEMO_MODE` | public | `true` ise prod'da DB boşken demo etkinlikler gösterilir |
| `SUPABASE_SERVICE_ROLE_KEY` | **sunucu** | Admin proxy'si, form gönderimleri, hesap silme ve scraper'lar için. Asla `NEXT_PUBLIC_` yapmayın |
| `ADMIN_PASSWORD` | **sunucu** | `/admin` şifresi (≥12 karakter) |
| `ADMIN_SESSION_SECRET` | **sunucu** | Admin cookie imzası (≥32 karakter) |
| `GEMINI_API_KEY` | script | Opsiyonel, `scripts/enrich_events.ts` |

## Veritabanı

Şema + RLS tek dosyada ve idempotent: [`supabase/migrations/20260928000000_schema_and_rls.sql`](supabase/migrations/20260928000000_schema_and_rls.sql). Supabase Dashboard > SQL Editor'da çalıştırın (mevcut veritabanında güvenle tekrar çalıştırılabilir).

Güvenlik modeli:
- **anon / authenticated** yalnızca RLS'in izin verdiğini yapar: onaylı etkinlikleri okur, kendi favori/takip/profilini yönetir, onay bekleyen yorum ve etkinlik önerir.
- **Admin paneli** tarayıcıya hiçbir anahtar vermez: `lib/admin-db.ts` istekleri `/api/admin/sb/*` proxy'sine yollar; proxy httpOnly admin cookie'sini doğrular ve `service_role` ile PostgREST'e iletir.
- Herkese açık formlar (`venue_applications`, `event_suggestions`) `/api/submit` üzerinden: doğrulama + honeypot + IP başına rate limit.

## Scraper'lar

```bash
npx tsx scripts/run_scrapers.ts            # hepsi
npx tsx scripts/run_scrapers.ts bubilet    # tek kaynak
```

`.github/workflows/scrape_events.yml` 6 saatte bir çalışır. Repo secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Çekilen etkinlikler `is_approved=false` ile admin onayına düşer.

## Sayfalar

| Yol | Açıklama |
|---|---|
| `/` | Harita + akış, keşif modları, filtreler (`?event=ID` ile etkinlik açılır) |
| `/etkinlik/[id]` | SSR/ISR etkinlik sayfası, OG + JSON-LD (paylaşım ve SEO) |
| `/login`, `/reset-password` | Giriş, kayıt (KVKK onaylı), şifre sıfırlama |
| `/profile`, `/onboarding`, `/calendar` | Kullanıcı alanı (hesap silme dahil) |
| `/venue` | Mekân sahibinin etkinlik önermesi |
| `/admin` | Yönetim paneli (env şifresi) |
| `/kvkk` | Aydınlatma metni — **köşeli parantezli alanları doldurun** |

## Deploy (Vercel)

1. Migration'ı Supabase'de çalıştırın.
2. Vercel > Settings > Environment Variables'a yukarıdaki değişkenleri ekleyin.
3. Supabase > Authentication > URL Configuration: *Site URL* = `NEXT_PUBLIC_SITE_URL`, *Redirect URLs*'e `<site>/reset-password` ve `<site>/onboarding` ekleyin.
4. GitHub repo secrets'a `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ekleyin (scraper workflow).
