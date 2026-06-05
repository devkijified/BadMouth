'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'

const featuredContent = [
  {
    id: 1,
    title: 'The Dark Knight',
    description: 'Batman faces the Joker in Gotham City',
    image: 'https://image.tmdb.org/t/p/original/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    type: 'movie',
    stats: { highly: 2340, recommended: 890, not: 123 }
  },
  {
    id: 2,
    title: 'Inception',
    description: 'Dream within a dream - Mind-bending masterpiece',
    image: 'https://image.tmdb.org/t/p/original/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    type: 'movie',
    stats: { highly: 1890, recommended: 654, not: 89 }
  },
  {
    id: 3,
    title: 'Blinding Lights',
    description: 'The Weeknd - Most streamed track',
    image: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9',
    type: 'music',
    stats: { highly: 3420, recommended: 1234, not: 234 }
  }
]

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredContent.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredContent.length) % featuredContent.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredContent.length)
  }

  const content = featuredContent[currentIndex]
  const totalVotes = content.stats.highly + content.stats.recommended + content.stats.not

  return (
    <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden rounded-xl mb-8">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000"
        style={{ backgroundImage: `url(${content.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm px-2 py-1 bg-teal-600 rounded-full">{content.type === 'movie' ? '🎬 Movie' : '🎵 Music'}</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-2">{content.title}</h1>
        <p className="text-gray-300 text-sm md:text-base mb-4 max-w-lg">{content.description}</p>
        
        {/* Recommendation Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-semibold">{content.stats.highly}</span>
            <span className="text-xs text-gray-400">highly</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">👍</span>
            <span className="text-sm font-semibold">{content.stats.recommended}</span>
            <span className="text-xs text-gray-400">recommended</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">👎</span>
            <span className="text-sm font-semibold">{content.stats.not}</span>
            <span className="text-xs text-gray-400">not recommended</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-2 bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 transition">
            👍 Recommend
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-gray-600/70 rounded-lg font-semibold hover:bg-gray-600 transition">
            <MessageCircle size={18} /> View Reviews
          </button>
        </div>
      </div>

      <button 
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredContent.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentIndex ? 'w-8 bg-teal-600' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
