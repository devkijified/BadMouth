'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ContentItem } from '@/types/content'
import { Star, Heart, Film, Music, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface HomeFeedProps {
  onViewDetails: (item: ContentItem) => void
  onRecommend: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => void
  onRemoveFromWatchlist: (id: string) => void
  isInWatchlist: (id: string) => boolean
}

export default function HomeFeed({
  onViewDetails,
  onRecommend,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist
}: HomeFeedProps) {
  const { user } = useAuth()
  const [recentlyAdded, setRecentlyAdded] = useState<ContentItem[]>([])
  const [topRated, setTopRated] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    setLoading(true)
    try {
      // Get top rated content
      const { data: topData, error: topError } = await supabase
        .from('content')
        .select('*')
        .order('rating', { ascending: false })
        .limit(10)

      if (topError) throw topError

      // Get recently added content
      const { data: recentData, error: recentError } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      setTopRated(topData || [])
      setRecentlyAdded(recentData || [])
    } catch (error) {
      console.error('Error loading feed:', error)
      // Silent fail - don't show toast
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
          Your Feed
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  const allItems = [...topRated, ...recentlyAdded]
  if (allItems.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 px-4">
        Your Feed
      </h2>
      <div className="space-y-4 px-4">
        {allItems.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition cursor-pointer"
            onClick={() => onViewDetails(item)}
          >
            <div className="flex gap-4 p-3">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-20 h-20 rounded object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-gray-400 truncate">
                      {item.artist || item.director || (item.type === 'movie' ? 'Movie' : 'Music')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isInWatchlist(item.id)) {
                        onRemoveFromWatchlist(item.id)
                      } else {
                        onAddToWatchlist(item)
                      }
                    }}
                    className="p-1.5 hover:bg-gray-700 rounded-full transition"
                  >
                    <Heart
                      size={16}
                      className={isInWatchlist(item.id) ? 'fill-teal-500 text-teal-500' : 'text-gray-400'}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Star size={12} className="fill-yellow-400" />
                    <span className="font-bold">{getRating(item).toFixed(1)}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.type === 'movie' ? '🎬' : '🎵'} {item.year}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({item.rating_count || 0} ratings)
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRecommend(item)
                    }}
                    className="text-xs bg-teal-600/20 text-teal-400 px-2 py-0.5 rounded hover:bg-teal-600/30 transition"
                  >
                    Rate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails(item)
                    }}
                    className="text-xs bg-gray-700 px-2 py-0.5 rounded hover:bg-gray-600 transition"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
