'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ThumbsUp, MessageCircle, Share2, User, Star } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface SocialRecommendationsProps {
  onViewDetails: (item: ContentItem) => void
  activeTab: 'movie' | 'music'
}

interface Recommendation {
  id: string
  user_id: string
  content_id: string
  content_type: string
  recommendation_tier: string
  comment: string
  created_at: string
  profiles: {
    username: string
    avatar_url: string
  }
  content: {
    title: string
    image_url: string
    type: string
  }
}

const tierConfig = {
  highly: { emoji: '🔥', label: 'HIGHLY RECOMMENDED', color: 'bg-teal-600/20 text-teal-400 border-teal-600' },
  recommended: { emoji: '👍', label: 'RECOMMENDED', color: 'bg-blue-600/20 text-blue-400 border-blue-600' },
  not: { emoji: '👎', label: 'NOT RECOMMENDED', color: 'bg-gray-600/20 text-gray-400 border-gray-600' }
}

export default function SocialRecommendations({ onViewDetails, activeTab }: SocialRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [activeTab])

  const loadRecommendations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        profiles(username, avatar_url),
        content(title, image_url, type)
      `)
      .eq('content_type', activeTab)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setRecommendations(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-4">
          <MessageCircle size={20} className="text-teal-500" />
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
          <MessageCircle size={20} className="text-teal-500" />
          <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No recommendations yet. Be the first to recommend something!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <MessageCircle size={20} className="text-teal-500" />
        <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        <span className="text-sm text-gray-500">({recommendations.length})</span>
      </div>

      <div className="space-y-4 px-4">
        {recommendations.map((rec) => {
          const tier = tierConfig[rec.recommendation_tier as keyof typeof tierConfig] || tierConfig.recommended
          return (
            <div 
              key={rec.id} 
              className={`bg-gray-800/50 rounded-xl p-4 border-l-4 ${tier.color.replace('border-', 'border-l-')} hover:bg-gray-800 transition cursor-pointer`}
              onClick={() => onViewDetails({ id: rec.content_id, title: rec.content?.title, type: rec.content_type, image_url: rec.content?.image_url } as ContentItem)}
            >
              <div className="flex gap-3">
                <img 
                  src={rec.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.profiles?.username}`} 
                  alt={rec.profiles?.username} 
                  className="w-10 h-10 rounded-full" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{rec.profiles?.username || 'Anonymous'}</span>
                    <span className="text-xs text-gray-500">• {new Date(rec.created_at).toLocaleDateString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>
                      {tier.emoji} {tier.label}
                    </span>
                  </div>
                  <h3 className="font-bold mb-1 truncate">{rec.content?.title || 'Unknown Content'}</h3>
                  {rec.comment && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{rec.comment}</p>}
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                      <ThumbsUp size={14} /> Like
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
