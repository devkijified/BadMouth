'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ThumbsUp, MessageCircle, Share2, Star, Heart } from 'lucide-react'

interface Recommendation {
  id: string
  username: string
  avatar_url: string
  content_id: string
  content_type: 'movie' | 'music'
  recommendation_tier: 'highly' | 'recommended' | 'not'
  comment: string
  created_at: string
  profiles: { username: string; avatar_url: string }
}

interface SocialRecommendationsProps {
  onViewDetails?: (item: any) => void
  activeTab?: 'movie' | 'music'
}

const tierConfig = {
  highly: { emoji: '🔥', label: 'HIGHLY RECOMMENDED', color: 'bg-green-600/20 text-green-400 border-green-600' },
  recommended: { emoji: '👍', label: 'RECOMMENDED', color: 'bg-blue-600/20 text-blue-400 border-blue-600' },
  not: { emoji: '👎', label: 'NOT RECOMMENDED', color: 'bg-gray-600/20 text-gray-400 border-gray-600' }
}

export default function SocialRecommendations({ onViewDetails, activeTab = 'movie' }: SocialRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadRecommendations()
  }, [activeTab])

  const loadRecommendations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, profiles(username, avatar_url)')
      .eq('content_type', activeTab)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setRecommendations(data)
    }
    setLoading(false)
  }

  const handleLike = async (id: string) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
    // Here you would increment likes in the database
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-4">
          <MessageCircle size={20} className="text-green-500" />
          <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        </div>
        <div className="space-y-4 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-4">
          <MessageCircle size={20} className="text-green-500" />
          <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Heart size={48} className="mx-auto mb-2 opacity-50" />
          <p>Be the first to recommend something!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <MessageCircle size={20} className="text-green-500" />
        <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        <span className="text-sm text-gray-500">({recommendations.length})</span>
      </div>

      <div className="space-y-4 px-4">
        {recommendations.map((rec) => {
          const tier = tierConfig[rec.recommendation_tier as keyof typeof tierConfig]
          return (
            <div 
              key={rec.id} 
              className={`bg-gray-800/50 rounded-xl p-4 border-l-4 ${tier.color.replace('border-', 'border-l-')} hover:bg-gray-800 transition cursor-pointer`}
              onClick={() => onViewDetails && onViewDetails({ id: rec.content_id, type: rec.content_type })}
            >
              <div className="flex gap-3">
                <img 
                  src={rec.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.profiles?.username}`} 
                  alt={rec.profiles?.username} 
                  className="w-10 h-10 rounded-full" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{rec.profiles?.username || 'Anonymous'}</span>
                    <span className="text-xs text-gray-500">• {new Date(rec.created_at).toLocaleDateString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color.replace('border-', 'bg-').replace('border-', '')}/20 text-${tier.color.split('-')[1]}`}>
                      {tier.emoji} {tier.label}
                    </span>
                  </div>
                  <h3 className="font-bold mb-1">{rec.content_title || 'Content'}</h3>
                  {rec.comment && <p className="text-sm text-gray-400 mb-3">{rec.comment}</p>}
                  <div className="flex gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLike(rec.id); }} 
                      className={`flex items-center gap-1 text-xs transition ${liked[rec.id] ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                    >
                      <ThumbsUp size={14} /> {liked[rec.id] ? rec.likes + 1 : rec.likes || 0}
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
