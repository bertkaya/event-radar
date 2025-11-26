import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/', // Admin panelini Google'dan gizle
    },
    sitemap: 'https://event-radar.vercel.app/sitemap.xml', // Buraya kendi vercel linkini yaz
  }
}