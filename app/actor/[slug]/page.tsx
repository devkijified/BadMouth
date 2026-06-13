'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Film, Music, Star } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import ContentRow from '@/components/ContentRow'
import RecommendModal from '@/components/RecommendModal'

interface ActorPageProps {
  params: {
    slug: string
  }
}

export default function ActorPage({ params }: ActorPageProps) {
  const { user } = useAuth()
  const [actorName, setActorName] = useState('')
  const [movies, setMovies] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [recommendItem, setRecommendItem] = useState<ContentItem | null>(null)
  const [watchlist, setWatchlist] = useState<ContentItem[]>([])

  useEffect(() => {
    const decodedName = decodeURIComponent(params.slug)
    setActorName(decodedName)
    loadActorContent(decodedName)
    loadWatchlist()
  }, [params.slug])

  const loadWatchlist = async () => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved))
      } catch (e) {}
    }
  }

  const addToWatchlist = (item: ContentItem) => {
    if (watchlist.some(i => i.id === item.id)) {
      setWatchlist(watchlist.filter(i => i.id !== item.id))
    } else {
      setWatchlist([...watchlist, item])
    }
    localStorage.setItem('badmouth_watchlist', JSON.stringify(watchlist))
  }

  const removeFromWatchlist = (id: string) => {
    setWatchlist(watchlist.filter(i => i.id !== id))
  }

  const isInWatchlist = (id: string) => watchlist.some(i => i.id === id)

  const loadActorContent = async (name: string) => {
    setLoading(true)
    // Search for movies where cast array contains the actor name
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'movie')
      .contains('actors', [name])
      .order('stats_highly', { ascending: false })
    
    setMovies(data || [])
    setLoading(false)
  }

  const handleRecommend = (item: ContentItem) => {
    setRecommendItem(item)
    setShowRecommendModal(true)
  }

  const handleRecommendSuccess = () => {
    loadActorContent(actorName)
  }

  const handleViewDetails = (item: ContentItem) => {
    // This will be handled by a modal or navigation
    console.log('View details:', item)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <RecommendModal 
        isOpen={showRecommendModal} 
        onClose={() => setShowRecommendModal(false)} 
        item={recommendItem}
        userId={user?.id}
        onSuccess={handleRecommendSuccess}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                {actorName}
              </h1>
            </div>
            <Link href="/" className="text-gray-400 hover:text-white transition text-sm">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Actor Info */}
        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{actorName}</h1>
          <p className="text-gray-400">
            Appears in {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
          </p>
        </div>

        {/* Movies Grid */}
        {movies.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Film className="text-teal-500" size={20} />
              Movies featuring {actorName}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <div key={movie.id} className="group cursor-pointer">
                  <div className="relative rounded-xl overflow-hidden bg-gray-800">
                    <img 
                      src={movie.image_url} 
                      alt={movie.title} 
                      className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                      <button 
                        onClick={() => handleRecommend(movie)}
                        className="w-full py-2 bg-teal-600 rounded-lg text-sm font-semibold mb-2"
                      >
                        Recommend
                      </button>
                      <button 
                        onClick={() => addToWatchlist(movie)}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition ${isInWatchlist(movie.id) ? 'bg-teal-600' : 'bg-gray-700'}`}
                      >
                        {isInWatchlist(movie.id) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                    <p className="text-xs text-gray-400">{movie.year}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs">{movie.rating_scale || (movie.stats_highly > 0 ? '8.5' : '0')}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No movies found for {actorName}</p>
          </div>
        )}
      </main>
    </div>
  )
}
