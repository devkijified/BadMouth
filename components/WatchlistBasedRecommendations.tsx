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
    
    // Get genres from watchlist items
    const watchlistGenres = new Set<string>()
    watchlist.forEach(item => {
      if (item.genre) watchlistGenres.add(item.genre)
    })
    
    if (watchlistGenres.size === 0) {
      setLoading(false)
      return
    }
    
    // Get content that matches watchlist genres but isn't in watchlist
    const { data } = await supabase
      .from('content')
      .select('*')
      .in('genre', Array.from(watchlistGenres))
      .limit(12)
    
    // Filter out items already in watchlist
    const filtered = data?.filter(item => !watchlist.some(w => w.id === item.id)) || []
    setRecommendations(filtered)
    setLoading(false)
  }

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
