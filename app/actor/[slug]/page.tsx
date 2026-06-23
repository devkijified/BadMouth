'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Star, Film, Music, Heart, Loader2, User } from 'lucide-react'  // 👈 Add User here
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface ActorPageProps {
  params: {
    slug: string
  }
}

export default function ActorPage({ params }: ActorPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [actorName, setActorName] = useState('')
  const [actorData, setActorData] = useState<any>(null)
  const [movies, setMovies] = useState<ContentItem[]>([])
  const [music, setMusic] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const decoded = decodeURIComponent(params.slug)
    setActorName(decoded)
    loadActorData(decoded)
  }, [params.slug])

  const loadActorData = async (name: string) => {
    setLoading(true)
    try {
      // Search for movies where actor appears
      const { data: movieData, error: movieError } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'movie')
        .contains('actors', [name])
        .order('rating', { ascending: false })

      if (movieError) throw movieError

      // Search for music where artist matches
      const { data: musicData, error: musicError } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'music')
        .eq('artist', name)
        .order('rating', { ascending: false })

      if (musicError) throw musicError

      setMovies(movieData || [])
      setMusic(musicData || [])
      
      // Set actor data from first result
      if (movieData && movieData.length > 0) {
        setActorData({
          name: name,
          image: movieData[0].image_url,
        })
      } else if (musicData && musicData.length > 0) {
        setActorData({
          name: name,
          image: musicData[0].image_url,
        })
      }

      // Load watchlist
      if (user) {
        loadWatchlist()
      }
    } catch (error) {
      console.error('Error loading actor data:', error)
      toast.error('Failed to load actor data')
    } finally {
      setLoading(false)
    }
  }

  const loadWatchlist = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('watchlist')
      .select('content_id')
      .eq('user_id', user.id)
    
    if (data) {
      const idsSet = new Set<string>()
      data.forEach(item => idsSet.add(item.content_id))
      setWatchlistIds(idsSet)
    }
  }

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  // 👇 This navigates to home with details parameter - modal opens automatically
  const handleViewDetails = (item: ContentItem) => {
    router.push(`/?details=${item.id}`)
  }

  const handleAddToWatchlist = async (item: ContentItem) => {
    if (!user) {
      toast.error('Please sign in to add to watchlist')
      return
    }
    
    if (watchlistIds.has(item.id)) {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', item.id)
      
      if (!error) {
        const newIdsSet = new Set(watchlistIds)
        newIdsSet.delete(item.id)
        setWatchlistIds(newIdsSet)
        toast.success(`Removed "${item.title}" from watchlist`)
      }
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: item.id,
          content_type: item.type
        })
      
      if (!error) {
        const newIdsSet = new Set(watchlistIds)
        newIdsSet.add(item.id)
        setWatchlistIds(newIdsSet)
        toast.success(`✨ "${item.title}" added to watchlist!`)
      }
    }
  }

  const isInWatchlist = (id: string) => watchlistIds.has(id)

  const allContent = [...movies, ...music]
  const totalContent = allContent.length

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH
              </Link>
            </div>
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Actor Header */}
      <div className="relative">
        {actorData?.image && (
          <div className="w-full h-64 md:h-96 bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
            <img 
              src={actorData.image} 
              alt={actorData.name} 
              className="w-full h-full object-cover opacity-40" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
        )}
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16 md:-mt-20 pb-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-teal-500 bg-gray-800 flex-shrink-0">
              <img 
                src={actorData?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorName}`} 
                alt={actorName} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{actorName}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-400">
                <span className="flex items-center gap-1">
                  <Film size={16} /> {movies.length} Movies
                </span>
                <span className="flex items-center gap-1">
                  <Music size={16} /> {music.length} Songs
                </span>
                <span className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-400" /> 
                  {totalContent > 0 
                    ? (allContent.reduce((sum, item) => sum + getRating(item), 0) / totalContent).toFixed(1)
                    : 'N/A'
                  }/10 Average Rating
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Movies Section */}
        {movies.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Film size={24} className="text-teal-500" /> Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <div 
                  key={movie.id} 
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200"
                  onClick={() => handleViewDetails(movie)}
                >
                  <div className="relative">
                    <img 
                      src={movie.image_url} 
                      alt={movie.title} 
                      className="w-full h-48 object-cover" 
                    />
                    <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-white">{getRating(movie).toFixed(1)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToWatchlist(movie)
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                    >
                      <Heart size={14} className={isInWatchlist(movie.id) ? 'fill-teal-500 text-teal-500' : 'text-gray-400'} />
                    </button>
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                    <p className="text-xs text-gray-400">{movie.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music Section */}
        {music.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Music size={24} className="text-teal-500" /> Music
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {music.map((song) => (
                <div 
                  key={song.id} 
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200"
                  onClick={() => handleViewDetails(song)}
                >
                  <div className="relative">
                    <img 
                      src={song.image_url} 
                      alt={song.title} 
                      className="w-full h-48 object-cover" 
                    />
                    <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-white">{getRating(song).toFixed(1)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToWatchlist(song)
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                    >
                      <Heart size={14} className={isInWatchlist(song.id) ? 'fill-teal-500 text-teal-500' : 'text-gray-400'} />
                    </button>
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm truncate">{song.title}</h3>
                    <p className="text-xs text-gray-400">{song.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalContent === 0 && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold mb-2">No content found</h2>
            <p className="text-gray-400">This artist hasn't been added to BADMOUTH yet.</p>
          </div>
        )}

        {/* Back button */}
        <div className="text-center mt-8">
          <button onClick={() => router.back()} className="px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
