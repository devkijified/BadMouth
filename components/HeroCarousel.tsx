'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Star, Heart, ThumbsUp, MessageCircle } from 'lucide-react'
import { ContentItem } from '@/types/content'
import { useRouter } from 'next/navigation'

interface HeroCarouselProps {
  items: ContentItem[]
  onViewDetails: (item: ContentItem) => void
  onRecommend: (item: ContentItem) => void
  activeTab: 'movie' | 'music'
}

export default function HeroCarousel({ items, onViewDetails, onRecommend, activeTab }: HeroCarouselProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const content = items[currentIndex] || items[0]

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovering && items.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % items.length)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [items.length, isHovering])

  if (!items || items.length === 0) return null

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }

  const handleActorClick = (actorName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/actor/${encodeURIComponent(actorName)}`)
  }

  const isTVShow = (item: ContentItem) => {
    return item.genre === 'TV Series' || 
           item.is_tv_show === true ||
           (item.type === 'movie' && item.runtime && item.runtime.includes('min per episode'))
  }

  return (
    <div 
      className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ 
          backgroundImage: `url(${content.backdrop_url || content.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              {isTVShow(content) && (
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">TV Series</span>
              )}
              <span className="bg-teal-600/80 text-white text-xs px-2 py-0.5 rounded-full">
                {activeTab === 'movie' ? 'Movie' : 'Music'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
              {content.title}
            </h1>

            {/* Artist/Director */}
            {content.artist && (
              <p className="text-lg sm:text-xl text-gray-300 mb-3">
                by {content.artist}
              </p>
            )}
            {content.director && !content.artist && (
              <p className="text-lg sm:text-xl text-gray-300 mb-3">
                Directed by {content.director}
              </p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={20} className="fill-yellow-400" />
                <span className="text-xl font-bold">{getRating(content).toFixed(1)}</span>
                <span className="text-gray-400 text-sm">/10</span>
              </span>
              <span className="text-gray-400 text-sm">
                {content.rating_count || 0} ratings
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm md:text-base line-clamp-3 max-w-xl mb-4">
              {content.long_description || content.description}
            </p>

            {/* Cast/Artists */}
            {content.actors && content.actors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {content.actors.slice(0, 3).map((actor) => (
                  <button
                    key={actor}
                    onClick={(e) => handleActorClick(actor, e)}
                    className="text-xs text-gray-400 hover:text-teal-400 transition"
                  >
                    {actor}
                  </button>
                ))}
                {content.actors.length > 3 && (
                  <span className="text-xs text-gray-500">+{content.actors.length - 3} more</span>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onViewDetails(content)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                <Play size={18} /> Details
              </button>
              <button
                onClick={() => onRecommend(content)}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 transition"
              >
                <Star size={18} /> Rate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
