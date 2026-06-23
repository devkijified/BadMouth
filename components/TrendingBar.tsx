'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, Star } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface TrendingBarProps {
  onViewDetails: (item: ContentItem) => void  // Make it required
}

export default function TrendingBar({ onViewDetails }: TrendingBarProps) {
  const [trendingItems, setTrendingItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrending()
  }, [])

  const loadTrending = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('rating', { ascending: false })
        .limit(10)

      if (error) throw error
      setTrendingItems(data || [])
    } catch (error) {
      console.error('Error loading trending:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use onViewDetails directly - just like ContentRow does
  const handleItemClick = (item: ContentItem) => {
    onViewDetails(item)  // This opens the modal
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 border-y border-gray-800 py-3 overflow-hidden">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-4 bg-gray-700 w-20 mx-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 bg-gray-700 w-8"></div>
              <div className="h-4 bg-gray-700 w-16"></div>
              <div className="h-4 bg-gray-700 w-12"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (trendingItems.length === 0) {
    return null
  }

  const displayItems = [...trendingItems, ...trendingItems]

  return (
    <div className="bg-gray-900/50 border-y border-gray-800 py-2 overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 flex-shrink-0">
          <TrendingUp size={16} className="text-red-500" />
          <span className="text-sm font-bold text-white whitespace-nowrap">TRENDING</span>
        </div>
        
        <div className="relative overflow-hidden flex-1">
          <div className="animate-scroll flex gap-8 whitespace-nowrap">
            {displayItems.map((item, index) => (
              <div 
                key={`${item.id}-${index}`} 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleItemClick(item)}
              >
                <span className="text-xs text-gray-500 font-mono">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium text-white hover:text-teal-400 transition">
                  {item.title}
                </span>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400 font-bold">
                    {item.rating?.toFixed(1) || 0}
                  </span>
                </div>
                {item.type === 'movie' ? (
                  <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-full">Movie</span>
                ) : (
                  <span className="text-[10px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full">Music</span>
                )}
                {item.is_tv_show && (
                  <span className="text-[10px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-full">TV</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
          display: flex;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
