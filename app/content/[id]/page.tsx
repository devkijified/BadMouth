'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'

export default function ContentPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContent()
  }, [params.id])

  const loadContent = async () => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('id', params.id)
      .single()
    setContent(data)
    setLoading(false)
  }

  const getRating = (item: ContentItem) => {
    const total = (item.stats_highly || 0) + (item.stats_recommended || 0) + (item.stats_not || 0)
    if (total === 0) return 0
    return Number((((item.stats_highly || 0) * 10 + (item.stats_recommended || 0) * 7) / total).toFixed(1))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Content not found</p>
          <Link href="/" className="mt-4 inline-block text-teal-500">Go Home</Link>
        </div>
      </div>
    )
  }

  const platformIcons: Record<string, { icon: string; color: string }> = {
    'Spotify': { icon: '🎵', color: 'bg-green-600' },
    'Apple Music': { icon: '🍎', color: 'bg-red-600' },
    'YouTube Music': { icon: '📺', color: 'bg-red-500' },
    'Netflix': { icon: '📺', color: 'bg-red-700' },
    'Prime Video': { icon: '📦', color: 'bg-blue-600' },
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              {content.title}
            </h1>
            <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <img src={content.image_url} alt={content.title} className="w-full h-64 object-cover rounded-xl mb-6" />
          
          <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
          {content.artist && <p className="text-gray-400 mb-4">{content.artist}</p>}
          
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} className="text-yellow-400 fill-yellow-400" />
            <span className="text-2xl font-bold">{getRating(content)}</span>
            <span className="text-gray-400">/10</span>
          </div>
          
          <p className="text-gray-300 mb-6">{content.long_description || content.description}</p>
          
          <div className="flex gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl text-teal-500">🔥</div>
              <div className="font-bold">{content.stats_highly}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-blue-500">👍</div>
              <div className="font-bold">{content.stats_recommended}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-gray-500">👎</div>
              <div className="font-bold">{content.stats_not}</div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Where to {content.type === 'movie' ? 'Watch' : 'Listen'}</h3>
            <div className="flex flex-wrap gap-2">
              {content.platforms?.map((platform, idx) => {
                const info = platformIcons[platform] || { icon: '🎬', color: 'bg-gray-600' }
                return (
                  <span key={idx} className={`flex items-center gap-2 px-3 py-2 ${info.color} rounded-lg text-sm`}>
                    {info.icon} {platform}
                  </span>
                )
              })}
            </div>
          </div>
          
          {content.type === 'movie' && content.actors && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {content.actors.map((actor, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(`/actor/${encodeURIComponent(actor)}`)}
                    className="px-3 py-1 bg-gray-800 rounded-full text-sm hover:bg-teal-600/30 transition"
                  >
                    {actor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
