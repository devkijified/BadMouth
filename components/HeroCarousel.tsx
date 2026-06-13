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
  
  const getRating = () => {
    if (content.rating_scale && content.rating_scale > 0) return content.rating_scale
    const total = (content.stats_highly || 0) + (content.stats_recommended || 0) + (content.stats_not || 0)
    if (total === 0) return 0
    return Number((((content.stats_highly || 0) * 10 + (content.stats_recommended || 0) * 7) / total).toFixed(1))
  }

  return (
    <div className="relative h-[50vh] sm:h-[60vh] md:h-[70vh] w-full overflow-hidden mb-6 sm:mb-8">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000"
        style={{ backgroundImage: `url(${content.backdrop_url || content.image_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-12">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 bg-teal-600 rounded-full">{content.type === 'movie' ? '🎬 Movie' : '🎵 Music'}</span>
          {content.year && <span className="text-[10px] sm:text-xs md:text-sm text-gray-300">{content.year}</span>}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-black/50 px-1.5 sm:px-2 py-0.5 rounded-full">
            <Star size={12} className="sm:size-14 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold">{getRating()}</span>
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2 line-clamp-2">{content.title}</h1>
        <p className="text-gray-300 text-[11px] sm:text-xs md:text-sm mb-2 sm:mb-4 max-w-lg line-clamp-2 sm:line-clamp-3">{content.description}</p>
        
        <div className="flex gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div className="flex items-center gap-0.5"><span className="text-teal-500 text-sm sm:text-base md:text-lg">🔥</span><span className="text-[10px] sm:text-xs md:text-sm font-semibold">{content.stats_highly || 0}</span></div>
          <div className="flex items-center gap-0.5"><span className="text-blue-500 text-sm sm:text-base md:text-lg">👍</span><span className="text-[10px] sm:text-xs md:text-sm font-semibold">{content.stats_recommended || 0}</span></div>
          <div className="flex items-center gap-0.5"><span className="text-gray-500 text-sm sm:text-base md:text-lg">👎</span><span className="text-[10px] sm:text-xs md:text-sm font-semibold">{content.stats_not || 0}</span></div>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <button 
            onClick={() => onRecommend(content)}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-teal-600 rounded-lg text-[11px] sm:text-xs md:text-sm font-semibold hover:bg-teal-700 transition"
          >
            <ThumbsUp size={14} className="sm:size-16" /> Recommend
          </button>
          <button 
            onClick={() => onViewDetails(content)}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-gray-600/70 rounded-lg text-[11px] sm:text-xs md:text-sm font-semibold hover:bg-gray-600 transition"
          >
            <MessageCircle size={14} className="sm:size-16" /> Details
          </button>
        </div>
      </div>

      <button onClick={goToPrevious} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
        <ChevronLeft size={20} className="sm:size-24" />
      </button>
      <button onClick={goToNext} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
        <ChevronRight size={20} className="sm:size-24" />
      </button>

      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2">
        {items.slice(0, 5).map((_, idx) => (
          <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${idx === currentIndex ? 'w-4 sm:w-8 bg-teal-600' : 'bg-gray-500'}`} />
        ))}
      </div>
    </div>
  )
}
