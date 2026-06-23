'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface SocialRecommendationsProps {
  onViewDetails: (item: ContentItem) => void
  activeTab: 'movie' | 'music'
}

export default function SocialRecommendations({ onViewDetails, activeTab }: SocialRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [activeTab])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      // Since content_id is TEXT, we need to join differently
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          *,
          profiles!user_id(username, avatar_url)
        `)
        .eq('content_type', activeTab)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error loading recommendations:', error)
        setRecommendations([])
        setLoading(false)
        return
      }
      
      // Fetch content data separately since content_id is TEXT
      if (data && data.length > 0) {
        const contentIds = data.map(rec => rec.content_id)
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('id, title, image_url, artist, type, year, rating, rating_count')
          .in('id', contentIds)

        if (contentError) {
          console.error('Error loading content:', contentError)
          setRecommendations(data)
          setLoading(false)
          return
        }

        // Merge recommendations with content
        const merged = data.map(rec => ({
          ...rec,
          content: contentData?.find(c => c.id === rec.content_id)
        })).filter(rec => rec.content)

        setRecommendations(merged)
      } else {
        setRecommendations([])
      }
    } catch (error) {
      console.error('Error loading social recommendations:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 px-4">
          Community Ratings
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">
          Community Ratings
        </h2>
        <span className="text-xs text-gray-400">
          {recommendations.length} ratings
        </span>
      </div>

      <div className="space-y-3 px-4">
        {recommendations.map((rec) => (
          <div 
            key={rec.id} 
            className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition cursor-pointer"
            onClick={() => onViewDetails(rec.content)}
          >
            <div className="flex items-start gap-3">
              <img 
                src={rec.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.profiles?.username || 'anonymous'}`} 
                alt={rec.profiles?.username || 'Anonymous'} 
                className="w-10 h-10 rounded-full flex-shrink-0" 
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {rec.profiles?.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-500">rated</span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star size={14} className="fill-yellow-400" />
                    <span className="font-bold">{rec.rating || 0}/10</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <img 
                    src={rec.content?.image_url} 
                    alt={rec.content?.title} 
                    className="w-8 h-8 rounded object-cover flex-shrink-0" 
                  />
                  <div>
                    <p className="font-medium text-sm truncate">
                      {rec.content?.title || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {rec.content?.artist || rec.content?.director || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                {rec.comment && (
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                    "{rec.comment}"
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onViewDetails(rec.content)
                }}
                className="text-teal-400 hover:text-teal-300 transition text-sm whitespace-nowrap"
              >
                View →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
