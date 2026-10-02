// Vercel build'inde Chrome indirme (scraper'lar sadece GitHub Actions'da çalışır)
module.exports = { skipDownload: !!process.env.VERCEL }
