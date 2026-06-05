'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ContentItem } from '@/types/content'
import ContentRow from './ContentRow'

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
  const [trendingMovies, setTrendingMovies] = useState<ContentItem[]>([])
  const [trendingMusic, setTrendingMusic] = useState<ContentItem[]>([])
  const [recommendedForYou, setRecommendedForYou] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHomeFeed()
  }, [])

  const loadHomeFeed = async () => {
    setLoading(true)
    
    // Get trending movies (by stats_highly)
    const { data: movies } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'movie')
      .order('stats_highly', { ascending: false })
      .limit(10)
    
    // Get trending music
    const { data: music } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'music')
      .order('stats_highly', { ascending: false })
      .limit(10)
    
    // Get recommended (mix of movies and music)
    const { data: recommended } = await supabase
      .from('content')
      .select('*')
      .order('stats_recommended', { ascending: false })
      .limit(10)
    
    setTrendingMovies(movies || [])
    setTrendingMusic(music || [])
    setRecommendedForYou(recommended || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div>
      <ContentRow 
        title="🔥 Trending Movies"
        items={trendingMovies}
        type="movie"
        onViewDetails={onViewDetails}
        onRecommend={onRecommend}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        isInWatchlist={isInWatchlist}
      />
      
      <ContentRow 
        title="🎵 Trending Music"
        items={trendingMusic}
        type="music"
        onViewDetails={onViewDetails}
        onRecommend={onRecommend}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        isInWatchlist={isInWatchlist}
      />
      
      <ContentRow 
        title="✨ Recommended For You"
        items={recommendedForYou}
        type={recommendedForYou[0]?.type === 'movie' ? 'movie' : 'music'}
        onViewDetails={onViewDetails}
        onRecommend={onRecommend}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        isInWatchlist={isInWatchlist}
      />
    </div>
  )
}
