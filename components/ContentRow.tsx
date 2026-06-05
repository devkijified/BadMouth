'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Play } from 'lucide-react'
import RatingModal from './RatingModal'

interface ContentItem {
  id: string
  title: string
  image: string
  rating: number
  userRating?: number
  year?: number
  type: 'movie' | 'music'
  artist?: string
}

interface ContentRowProps {
  title: string
  items: ContentItem[]
  type: 'movie' | 'music'
}

export default function ContentRow({ title, items, type }: ContentRowProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${title.replace(/\s/g, '')}`)
    if (container) {
      const scrollAmount = 300
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const handleRate = (item: ContentItem) => {
    setSelectedItem(item)
    setShowRatingModal(true)
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        <button className="text-sm text-gray-400 hover:text-white transition">View All</button>
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-r-lg opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          id={`scroll-${title.replace(/\s/g, '')}`}
          className="flex gap-4 overflow-x-auto scroll-container px-4 pb-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[160px] md:w-[200px] group/item">
              <div className="relative rounded-lg overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-[240px] md:h-[280px] object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => handleRate(item)}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
                  >
                    <Star size={20} className="text-yellow-400" />
                  </button>
                  <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                    <Play size={20} />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                {item.artist && <p className="text-xs text-gray-400">{item.artist}</p>}
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs">{item.rating}</span>
                  {item.userRating && (
                    <span className="text-xs text-gray-500">(Your: {item.userRating})</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-l-lg opacity-0 group-hover:opacity-100 transition"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {selectedItem && showRatingModal && (
        <RatingModal
          item={selectedItem}
          onClose={() => setShowRatingModal(false)}
          onRate={(rating, comment) => {
            console.log('Rated:', rating, comment)
            setShowRatingModal(false)
          }}
        />
      )}
    </div>
  )
}
