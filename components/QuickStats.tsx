'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Film, Music, Heart, ThumbsUp, Trophy, TrendingUp } from 'lucide-react'

interface QuickStatsProps {
  userId: string
}

export default function QuickStats({ userId }: QuickStatsProps) {
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    totalWatchlist: 0,
    topGenre: 'None',
    contributionLevel: 'Bronze'
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // Get user's recommendations count
    const { count: recCount } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Get watchlist from localStorage
    const saved = localStorage.getItem('badmouth_watchlist')
    const watchlist = saved ? JSON.parse(saved) : []
    
    // Determine contribution level
    let level = 'Bronze'
    if ((recCount || 0) >= 10) level = 'Gold'
    else if ((recCount || 0) >= 5) level = 'Silver'
    
    setStats({
      totalRecommendations: recCount || 0,
      totalWatchlist: watchlist.length,
      topGenre: 'Action',
      contributionLevel: level
    })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 px-4">
      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
        <ThumbsUp className="w-5 h-5 text-teal-500 mx-auto mb-1" />
        <p className="text-2xl font-bold">{stats.totalRecommendations}</p>
        <p className="text-xs text-gray-400">Recommendations</p>
      </div>
      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
        <p className="text-2xl font-bold">{stats.totalWatchlist}</p>
        <p className="text-xs text-gray-400">Watchlist</p>
      </div>
      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
        <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
        <p className="text-sm font-semibold">{stats.contributionLevel}</p>
        <p className="text-xs text-gray-400">Contributor</p>
      </div>
      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
        <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
        <p className="text-sm font-semibold">{stats.topGenre}</p>
        <p className="text-xs text-gray-400">Top Genre</p>
      </div>
    </div>
  )
}
