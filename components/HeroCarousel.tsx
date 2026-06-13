'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Star } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface HeroCarouselProps {
  items: ContentItem[]
  onViewDetails: (item: ContentItem) => void
  onRecommend: (item: ContentItem) => void
  activeTab: string
}

export default function HeroCarousel({ items, onViewDetails, onRecommend, activeTab }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(0)
  }, [activeTab, items])

  useEffect(() => {
    if (items.length === 0) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [items.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }

  if (items.length === 0) return null

  const content = items[currentIndex]
  
  // Calculate rating
  const getRating = () => {
    if (content.rating_scale && content.rating_scale > 0) return content.rating_scale
    const total = (content.stats_highly || 0) + (content.stats_recommended || 0) + (content.stats_not || 0)
    if (total === 0) return 0
    return (((content.stats_highly || 0) * 10 + (content.stats_recommended || 0) * 7) / total).toFixed(1)
  }

  return (
    <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden mb-8">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000"
        style={{ backgroundImage: `url(${content.backdrop_url || content.image_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm px-2 py-1 bg-teal-600 rounded-full">{content.type === 'movie' ? '🎬 Movie' : '🎵 Music'}</span>
          {content.year && <span className="text-sm text-gray-300">{content.year}</span>}
          <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold">{getRating()}/10</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-2">{content.title}</h1>
        <p className="text-gray-300 text-sm md:text-base mb-4 max-w-lg">{content.description}</p>
        
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1"><span className="text-teal-500 text-lg">🔥</span><span className="text-sm font-semibold">{content.stats_highly || 0}</span></div>
          <div className="flex items-center gap-1"><span className="text-blue-500 text-lg">👍</span><span className="text-sm font-semibold">{content.stats_recommended || 0}</span></div>
          <div className="flex items-center gap-1"><span className="text-gray-500 text-lg">👎</span><span className="text-sm font-semibold">{content.stats_not || 0}</span></div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => onRecommend(content)}
            className="flex items-center gap-2 px-6 py-2 bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            <ThumbsUp size={18} /> Recommend
          </button>
          <button 
            onClick={() => onViewDetails(content)}
            className="flex items-center gap-2 px-6 py-2 bg-gray-600/70 rounded-lg font-semibold hover:bg-gray-600 transition"
          >
            <MessageCircle size={18} /> Details
          </button>
        </div>
      </div>

      <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
        <ChevronLeft size={24} />
      </button>
      <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, idx) => (
          <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-teal-600' : 'bg-gray-500'}`} />
        ))}
      </div>
    </div>
  )
}
