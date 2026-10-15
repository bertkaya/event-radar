// MapLibre GL 6, web işçisi (worker) dosyasının adresini kendi bulur ama Turbopack/Next altında yanlış çözülür
// ("Worker failed to load", MIME text/html) ve harita zemini boş çizilir. Çözüm: işçi dosyasını public/ altından
// sunup VectorBasemap içinde setWorkerUrl ile göstermek. Kopya node_modules'tan üretilir (sürümle senkron kalır) ve
// repoya girmez (.gitignore). npm run dev ve build öncesi otomatik çalışır (predev, prebuild).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs')
const dst = join(root, 'public', 'maplibre', 'maplibre-gl-worker.mjs')

if (!existsSync(src)) {
  console.error('maplibre-gl kurulu değil: önce npm install çalıştırın (beklenen dosya: ' + src + ')')
  process.exit(1)
}
mkdirSync(dirname(dst), { recursive: true })
copyFileSync(src, dst)
console.log('MapLibre işçisi kopyalandı → public/maplibre/maplibre-gl-worker.mjs')
