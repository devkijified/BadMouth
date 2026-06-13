'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ThumbsUp, MessageCircle, Share2, Loader2 } from 'lucide-react'
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
  updated_at?: string
  profiles: {
    id: string
    username: string
    avatar_url: string
  }
  content: {
    id: string
    title: string
    image_url: string
    type: string
    artist: string
    description: string
    year: number
    genre: string
    stats_highly: number
    stats_recommended: number
    stats_not: number
    rating_scale: number
  }
}

const tierConfig = {
  highly: { emoji: '🔥', label: 'HIGHLY RECOMMENDED', color: 'bg-teal-600/20 text-teal-400 border-teal-600' },
  recommended: { emoji: '👍', label: 'RECOMMENDED', color: 'bg-blue-600/20 text-blue-400 border-blue-600' },
  not: { emoji: '👎', label: 'NOT RECOMMENDED', color: 'bg-gray-600/20 text-gray-400 border-gray-600' }
}

export default function SocialRecommendations({ onViewDetails, activeTab }: SocialRecommendationsProps) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [activeTab])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      // Step 1: Get recommendations
      const { data: recsData, error: recsError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('content_type', activeTab)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (recsError) {
        console.error('Error loading recommendations:', recsError)
        setRecommendations([])
        setLoading(false)
        return
      }
      
      if (!recsData || recsData.length === 0) {
        console.log('No recommendations found for type:', activeTab)
        setRecommendations([])
        setLoading(false)
        return
      }
      
      console.log('Found recommendations:', recsData.length)
      
      // Step 2: Get unique user IDs
      const userIds = [...new Set(recsData.map(rec => rec.user_id))]
      
      // Step 3: Get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
      
      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
      }
      
      // Step 4: Get unique content IDs
      const contentIds = [...new Set(recsData.map(rec => rec.content_id))]
      
      // Step 5: Get content details
      const { data: contentsData, error: contentsError } = await supabase
        .from('content')
        .select('*')
        .in('id', contentIds)
      
      if (contentsError) {
        console.error('Error loading content:', contentsError)
      }
      
      // Create maps for quick lookup
      const profileMap = new Map()
      profilesData?.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
      
      const contentMap = new Map()
      contentsData?.forEach(content => {
        contentMap.set(content.id, content)
      })
      
      // Step 6: Merge all data
      const merged: Recommendation[] = recsData.map(rec => {
        const profile = profileMap.get(rec.user_id)
        const content = contentMap.get(rec.content_id)
        
        return {
          id: rec.id,
          user_id: rec.user_id,
          content_id: rec.content_id,
          content_type: rec.content_type,
          recommendation_tier: rec.recommendation_tier,
          comment: rec.comment || '',
          created_at: rec.created_at,
          updated_at: rec.updated_at,
          profiles: {
            id: profile?.id || '',
            username: profile?.username || 'Anonymous',
            avatar_url: profile?.avatar_url || null
          },
          content: {
            id: content?.id || '',
            title: content?.title || 'Unknown Content',
            image_url: content?.image_url || '',
            type: content?.type || rec.content_type,
            artist: content?.artist || '',
            description: content?.description || '',
            year: content?.year || 0,
            genre: content?.genre || '',
            stats_highly: content?.stats_highly || 0,
            stats_recommended: content?.stats_recommended || 0,
            stats_not: content?.stats_not || 0,
            rating_scale: content?.rating_scale || 0
          }
        }
      })
      
      console.log('Merged recommendations:', merged.length)
      setRecommendations(merged)
    } catch (error) {
      console.error('Error in loadRecommendations:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-4">
          <MessageCircle size={20} className="text-teal-500" />
          <h2 className="text-xl md:text-2xl font-semibold">BadMouthers Recommendations</h2>
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
          <h2 className="text-xl md:text-2xl font-semibold">BadMouthers Recommendations</h2>
        </div>
        <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl mx-4">
          <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No recommendations yet.</p>
          <p className="text-xs text-gray-600 mt-1">Be the first to recommend something!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <MessageCircle size={20} className="text-teal-500" />
        <h2 className="text-xl md:text-2xl font-semibold">BadMouthers Recommendations</h2>
        <span className="text-sm text-gray-500">({recommendations.length})</span>
      </div>

      <div className="space-y-4 px-4">
        {recommendations.map((rec) => {
          const tier = tierConfig[rec.recommendation_tier as keyof typeof tierConfig] || tierConfig.recommended
          const username = rec.profiles?.username || 'Anonymous'
          const avatarUrl = rec.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          const isCurrentUser = user?.id === rec.user_id
          
          const fullContent: ContentItem = {
            id: rec.content.id,
            title: rec.content.title,
            description: rec.content.description,
            long_description: rec.content.description,
            image_url: rec.content.image_url,
            backdrop_url: rec.content.image_url,
            type: rec.content.type as 'movie' | 'music',
            year: rec.content.year,
            director: null,
            artist: rec.content.artist,
            actors: null,
            platforms: [],
            trailer_url: null,
            runtime: null,
            duration: null,
            genre: rec.content.genre,
            stats_highly: rec.content.stats_highly,
            stats_recommended: rec.content.stats_recommended,
            stats_not: rec.content.stats_not,
            rating_scale: rec.content.rating_scale
          }
          
          return (
            <div 
              key={rec.id} 
              className={`bg-gray-800/50 rounded-xl p-4 border-l-4 ${tier.color.replace('border-', 'border-l-')} hover:bg-gray-800 transition cursor-pointer ${isCurrentUser ? 'ring-1 ring-teal-500/50' : ''}`}
              onClick={() => onViewDetails(fullContent)}
            >
              <div className="flex gap-3">
                <img src={avatarUrl} alt={username} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{username}</span>
                    {isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-teal-600/30 text-teal-400 rounded-full ml-1">You</span>
                    )}
                    <span className="text-xs text-gray-500">• {new Date(rec.created_at).toLocaleDateString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>
                      {tier.emoji} {tier.label}
                    </span>
                  </div>
                  <h3 className="font-bold mb-1 truncate">{rec.content.title}</h3>
                  {rec.content.artist && <p className="text-xs text-gray-400 mb-2">{rec.content.artist}</p>}
                  {rec.comment && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{rec.comment}</p>}
                  <div className="flex gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation() }} 
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                    >
                      <ThumbsUp size={14} /> Like
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation() }} 
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                    >
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
