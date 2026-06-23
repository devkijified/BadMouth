'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Star, Heart, TrendingUp } from 'lucide-react'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface QuickStatsProps {
  userId: string
}

export default function QuickStats({ userId }: QuickStatsProps) {
  const [stats, setStats] = useState({
    totalRatings: 0,
    watchlistCount: 0,
    averageRating: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Get user's watchlist count
      const { count: watchlistCount, error: watchlistError } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (watchlistError) console.error('Watchlist count error:', watchlistError)

      // Get user's ratings count
      const { count: ratingsCount, error: ratingsError } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (ratingsError) console.error('Ratings count error:', ratingsError)

      // Get average rating of user's recommendations
      const { data: userRatings, error: avgError } = await supabase
        .from('recommendations')
        .select('rating')
        .eq('user_id', userId)

      if (avgError) console.error('Avg rating error:', avgError)

      let avgRating = 0
      if (userRatings && userRatings.length > 0) {
        avgRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
      }

      setStats({
        totalRatings: ratingsCount || 0,
        watchlistCount: watchlistCount || 0,
        averageRating: Math.round(avgRating * 10) / 10
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 px-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-8 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4 px-4 mb-8">
      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
          <Star size={16} />
          <span className="text-xs text-gray-400">Your Ratings</span>
        </div>
        <p className="text-2xl font-bold">{stats.totalRatings}</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-red-500 mb-1">
          <Heart size={16} />
          <span className="text-xs text-gray-400">Watchlist</span>
        </div>
        <p className="text-2xl font-bold">{stats.watchlistCount}</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
          <TrendingUp size={16} />
          <span className="text-xs text-gray-400">Avg Rating</span>
        </div>
        <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
      </div>
    </div>
  )
}
