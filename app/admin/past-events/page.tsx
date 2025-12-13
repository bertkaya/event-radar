'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, MapPin, BarChart3, TrendingUp, Users, Eye, Ticket, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Stats card component
const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number | string, icon: any, color: string }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div>
                <h3 className="font-bold text-gray-500 text-xs uppercase mb-2">{title}</h3>
                <div className={`text-4xl font-black ${color}`}>{value}</div>
            </div>
            <Icon size={32} className={`${color} opacity-50`} />
        </div>
    </div>
)

export default function PastEvents() {
    const [pastEvents, setPastEvents] = useState<any[]>([])
    const [stats, setStats] = useState({
        total: 0,
        byCategory: {} as Record<string, number>,
        topVenues: [] as { name: string, count: number }[],
        totalClicks: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPastEvents()
    }, [])

    const fetchPastEvents = async () => {
        setLoading(true)

        // Fetch past events (start_time < now)
        const { data: events } = await supabase
            .from('events')
            .select('*')
            .lt('start_time', new Date().toISOString())
            .order('start_time', { ascending: false })
            .limit(100)

        if (events) {
            setPastEvents(events)

            // Calculate stats
            const byCategory: Record<string, number> = {}
            const venueCount: Record<string, number> = {}

            events.forEach(e => {
                byCategory[e.category] = (byCategory[e.category] || 0) + 1
                venueCount[e.venue_name] = (venueCount[e.venue_name] || 0) + 1
            })

            const topVenues = Object.entries(venueCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)

            // Fetch click counts
            const { count: clickCount } = await supabase
                .from('event_clicks')
                .select('*', { count: 'exact', head: true })

            setStats({
                total: events.length,
                byCategory,
                topVenues,
                totalClicks: clickCount || 0
            })
        }

        setLoading(false)
    }

    const [pin, setPin] = useState('')

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 font-sans text-gray-800 dark:text-gray-100">
            {pin !== '1823' ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 text-center space-y-4 max-w-sm w-full">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-3xl">🔒</div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">GEÇMİŞ ETKİNLİKLER</h1>
                        <p className="text-sm text-gray-500">Güvenlik kodunu giriniz.</p>
                        <input autoFocus type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full text-center text-3xl font-mono tracking-widest border-2 border-gray-200 dark:border-gray-600 rounded-xl p-3 focus:border-brand focus:ring-4 focus:ring-brand/10 bg-gray-50 dark:bg-gray-900 outline-none transition" placeholder="****" maxLength={4} />
                    </div>
                    <Link href="/admin" className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition">← Admin Panele Dön</Link>
                </div>
            ) : (
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Geçmiş Etkinlikler</h1>
                            <p className="text-gray-500 text-sm">Tarihi geçmiş etkinlikler ve istatistikler</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard title="Toplam Geçmiş Etkinlik" value={stats.total} icon={Calendar} color="text-brand" />
                        <StatCard title="Toplam Tıklanma" value={stats.totalClicks} icon={Eye} color="text-blue-500" />
                        <StatCard title="Kategori Sayısı" value={Object.keys(stats.byCategory).length} icon={BarChart3} color="text-green-500" />
                        <StatCard title="Aktif Mekan" value={stats.topVenues.length} icon={MapPin} color="text-purple-500" />
                    </div>

                    {/* Category Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BarChart3 size={20} /> Kategoriye Göre Dağılım</h3>
                            <div className="space-y-3">
                                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                                    <div key={cat} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{cat}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-brand h-2 rounded-full"
                                                    style={{ width: `${(count / stats.total) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 w-8">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={20} /> En Popüler Mekanlar</h3>
                            <div className="space-y-3">
                                {stats.topVenues.map((venue, idx) => (
                                    <div key={venue.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 bg-brand text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                            <span className="font-medium text-sm">{venue.name}</span>
                                        </div>
                                        <span className="text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{venue.count} etkinlik</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Past Events List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <span className="font-bold text-gray-700 dark:text-gray-300">GEÇMİŞ ETKİNLİKLER ({pastEvents.length})</span>
                        </div>
                        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {loading && <div className="p-8 text-center text-gray-400">Yükleniyor...</div>}
                            {!loading && pastEvents.length === 0 && <div className="p-8 text-center text-gray-400">Geçmiş etkinlik bulunamadı.</div>}
                            {pastEvents.map(event => (
                                <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex gap-4 items-center">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                        {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover opacity-60" /> : <Calendar size={20} className="text-gray-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 dark:text-white leading-tight truncate">{event.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.start_time).toLocaleDateString('tr-TR')}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {event.venue_name}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{event.category}</span>
                                        {event.sold_out && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Tükendi</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}
