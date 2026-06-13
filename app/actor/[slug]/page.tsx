'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Film, Music, Star, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ContentItem } from '@/types/content'
import ContentRow from '@/components/ContentRow'
import RecommendModal from '@/components/RecommendModal'

interface ActorPageProps {
  params: {
    slug: string
  }
}

export default function ActorPage({ params }: ActorPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [actorName, setActorName] = useState('')
  const [movies, setMovies] = useState<ContentItem[]>([])
  const [music, setMusic] = useState<ContentItem[]>([])
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
    const { data: moviesData } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'movie')
      .contains('actors', [name])
      .order('stats_highly', { ascending: false })
    
    // Search for music where artist matches the name
    const { data: musicData } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'music')
      .ilike('artist', `%${name}%`)
      .order('stats_highly', { ascending: false })
    
    setMovies(moviesData || [])
    setMusic(musicData || [])
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
    // Close modal and navigate back to home with content selected
    router.push('/')
    // Store in sessionStorage to show modal on home
    sessionStorage.setItem('selectedContent', JSON.stringify(item))
  }

  const getRating = (item: ContentItem) => {
    if (item.rating_scale && item.rating_scale > 0) {
      return item.rating_scale
    }
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

  const totalAppearances = movies.length + music.length

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
              <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
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
        {/* Actor/Artist Info */}
        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
            <UserIcon size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{actorName}</h1>
          <p className="text-gray-400">
            {totalAppearances} {totalAppearances === 1 ? 'appearance' : 'appearances'}
          </p>
          <div className="flex justify-center gap-4 mt-3">
            {movies.length > 0 && (
              <span className="text-sm text-teal-400">🎬 {movies.length} Movie{movies.length !== 1 ? 's' : ''}</span>
            )}
            {music.length > 0 && (
              <span className="text-sm text-purple-400">🎵 {music.length} Track{music.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Movies Section */}
        {movies.length > 0 && (
          <div className="mb-8">
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
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(movie.title)}`
                      }}
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
                      <span className="text-xs">{getRating(movie)}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music Section */}
        {music.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="text-purple-500" size={20} />
              Music by {actorName}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {music.map((song) => (
                <div key={song.id} className="group cursor-pointer">
                  <div className="relative rounded-xl overflow-hidden bg-gray-800">
                    <img 
                      src={song.image_url} 
                      alt={song.title} 
                      className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(song.title)}`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                      <button 
                        onClick={() => handleRecommend(song)}
                        className="w-full py-2 bg-teal-600 rounded-lg text-sm font-semibold mb-2"
                      >
                        Recommend
                      </button>
                      <button 
                        onClick={() => addToWatchlist(song)}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition ${isInWatchlist(song.id) ? 'bg-teal-600' : 'bg-gray-700'}`}
                      >
                        {isInWatchlist(song.id) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-semibold text-sm truncate">{song.title}</h3>
                    <p className="text-xs text-gray-400">{song.artist}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs">{getRating(song)}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {totalAppearances === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UserIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>No movies or music found for {actorName}</p>
          </div>
        )}
      </main>
    </div>
  )
}
