# Eski scraper'lar (devre dışı)

Bu klasördeki Puppeteer/HTML scraper'ları **çalıştırılmıyor**. Durumları için `lib/sources/catalog.ts`'ye bakın:

- Biletix, Biletinial: kullanım koşulları yazılı izin istiyor (`pending_permission`)
- Bubilet: bot doğrulaması (`blocked`)
- Lavarla: etkinlik takvimi kaldırılmış (`unsupported`)
- Passo: yapılandırılmış veri yok, izin gerekli

İzin alınan bir kaynak, `scripts/ingest/adapters/` altına ortak `SourceAdapter` arayüzüyle yeni bir adaptör olarak eklenmeli
ve katalogda `decision: 'integrated'` yapılmalı. Aktif alım: `npx tsx scripts/ingest/run.ts`.
