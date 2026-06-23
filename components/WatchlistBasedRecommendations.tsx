'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ContentItem } from '@/types/content'
import { Star, Heart, Film, Music } from 'lucide-react'
import toast from 'react-hot-toast'

interface WatchlistBasedRecommendationsProps {
  userId: string
  watchlist: ContentItem[]
  onViewDetails: (item: ContentItem) => void
  onRecommend: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => void
  onRemoveFromWatchlist: (id: string) => void
  isInWatchlist: (id: string) => boolean
}

export default function WatchlistBasedRecommendations({
  userId,
  watchlist,
  onViewDetails,
  onRecommend,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist
}: WatchlistBasedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (watchlist.length > 0) {
      loadRecommendations()
    } else {
      setLoading(false)
      setRecommendations([])
    }
  }, [watchlist])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      // Get genres from watchlist items
      const genres = new Set<string>()
      watchlist.forEach(item => {
        if (item.genre) {
          item.genre.split(',').forEach((g: string) => genres.add(g.trim()))
        }
      })

      if (genres.size === 0) {
        setRecommendations([])
        setLoading(false)
        return
      }

      // Find content with similar genres, excluding what's already in watchlist
      const watchlistIds = new Set(watchlist.map(item => item.id))
      const genreArray = Array.from(genres)
      
      let query = supabase
        .from('content')
        .select('*')
        .order('rating', { ascending: false })
        .limit(10)

      // Try to find content matching genres
      let results: ContentItem[] = []
      let allData: ContentItem[] = []
      
      for (const genre of genreArray) {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .contains('genre', [genre])
          .order('rating', { ascending: false })
          .limit(5)

        if (!error && data) {
          results = results.concat(data)
        }
      }

      // Remove duplicates and items already in watchlist
      const uniqueResults = results
        .filter((item, index, self) => 
          self.findIndex(i => i.id === item.id) === index &&
          !watchlistIds.has(item.id)
        )
        .slice(0, 10)

      // If no results from genre matching, get top rated content
      if (uniqueResults.length === 0) {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .order('rating', { ascending: false })
          .limit(10)

        if (!error && data) {
          allData = data.filter(item => !watchlistIds.has(item.id))
        }
      }

      setRecommendations(uniqueResults.length > 0 ? uniqueResults : allData)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      toast.error('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 px-4">
          Because You Liked...
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0 || watchlist.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 px-4">
        Because You Liked...
      </h2>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto scroll-container px-4 pb-4">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[140px] xs:w-[160px] md:w-[200px] group/item cursor-pointer"
            onClick={() => onViewDetails(item)}
          >
            <div className="relative rounded-lg overflow-hidden bg-gray-800">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-[200px] xs:h-[220px] md:h-[260px] object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] xs:text-xs font-bold text-white">
                  {getRating(item).toFixed(1)}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition flex flex-col justify-end p-2 xs:p-3 gap-1 xs:gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRecommend(item)
                  }}
                  className="flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 bg-teal-600 rounded-lg text-[10px] xs:text-xs font-semibold hover:bg-teal-700 transition"
                >
                  <Star size={12} className="fill-white" /> Rate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isInWatchlist(item.id)) {
                      onRemoveFromWatchlist(item.id)
                    } else {
                      onAddToWatchlist(item)
                    }
                  }}
                  className={`flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 rounded-lg text-[10px] xs:text-xs font-semibold transition ${
                    isInWatchlist(item.id) ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Heart size={12} className={isInWatchlist(item.id) ? 'fill-white' : ''} />
                  <span className="hidden xs:inline">{isInWatchlist(item.id) ? 'In Watchlist' : 'Watchlist'}</span>
                </button>
              </div>
            </div>
            <div className="p-1 xs:p-2">
              <h3 className="font-semibold text-[11px] xs:text-sm truncate">{item.title}</h3>
              <p className="text-[9px] xs:text-xs text-gray-400 truncate">
                {item.artist || item.director || 'Unknown'}
              </p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Star size={8} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[9px] text-yellow-400">{getRating(item).toFixed(1)}</span>
                <span className="text-[8px] text-gray-500">({item.rating_count || 0})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
