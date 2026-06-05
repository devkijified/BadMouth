'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ContentItem } from '@/types/content'
import ContentRow from './ContentRow'

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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (watchlist.length > 0) {
      loadRecommendations()
    }
  }, [watchlist])

  const loadRecommendations = async () => {
    setLoading(true)
    
    // Get genres and artists from watchlist items
    const watchlistGenres = new Set<string>()
    const watchlistArtists = new Set<string>()
    
    watchlist.forEach(item => {
      if (item.genre) watchlistGenres.add(item.genre)
      if (item.artist) watchlistArtists.add(item.artist)
    })
    
    if (watchlistGenres.size === 0 && watchlistArtists.size === 0) {
      setLoading(false)
      return
    }
    
    // Build query based on watchlist preferences
    let query = supabase.from('content').select('*')
    
    if (watchlistGenres.size > 0) {
      query = query.in('genre', Array.from(watchlistGenres))
    }
    
    const { data } = await query.limit(12)
    
    // Filter out items already in watchlist
    const filtered = data?.filter(item => !watchlist.some(w => w.id === item.id)) || []
    setRecommendations(filtered)
    setLoading(false)
  }

  // Only show if watchlist has items AND we have recommendations
  if (watchlist.length === 0 || recommendations.length === 0) return null

  return (
    <ContentRow 
      title={`🎯 Based on Your Watchlist (${watchlist.length} items)`}
      items={recommendations}
      type="movie"
      onViewDetails={onViewDetails}
      onRecommend={onRecommend}
      onAddToWatchlist={onAddToWatchlist}
      onRemoveFromWatchlist={onRemoveFromWatchlist}
      isInWatchlist={isInWatchlist}
    />
  )
}
