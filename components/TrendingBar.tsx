'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, Flame } from 'lucide-react'

export default function TrendingBar() {
  const [trending, setTrending] = useState<any[]>([])

  useEffect(() => {
    loadTrending()
  }, [])

  const loadTrending = async () => {
    const { data } = await supabase
      .from('content')
      .select('title, stats_highly')
      .order('stats_highly', { ascending: false })
      .limit(5)
    setTrending(data || [])
  }

  return (
    <div className="bg-gradient-to-r from-teal-600/20 to-blue-600/20 border-y border-teal-500/20 py-2 mb-8 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Custom scroll container matching ContentRow style */}
        <div className="flex items-center gap-6 overflow-x-auto scroll-container pb-1">
          <div className="flex items-center gap-2 text-teal-500 flex-shrink-0">
            <Flame size={20} />
            <span className="font-semibold text-sm whitespace-nowrap">TRENDING</span>
          </div>
          {trending.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="text-gray-500">#{idx + 1}</span>
              <span className="whitespace-nowrap">{item.title}</span>
              <span className="text-teal-500 text-xs whitespace-nowrap">🔥 {item.stats_highly}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
            <TrendingUp size={16} />
            <span className="text-xs whitespace-nowrap">Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}
