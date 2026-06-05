'use client'

import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Heart } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface ContentRowProps {
  title: string
  items: ContentItem[]
  type: 'movie' | 'music'
  onViewDetails: (item: ContentItem) => void
  onAddToWatchlist?: (item: ContentItem) => void
  onRemoveFromWatchlist?: (id: string) => void
  isInWatchlist?: (id: string) => boolean
}

export default function ContentRow({ title, items, type, onViewDetails, onAddToWatchlist, onRemoveFromWatchlist, isInWatchlist }: ContentRowProps) {
  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${title.replace(/\s/g, '')}`)
    if (container) {
      const scrollAmount = 300
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        <button className="text-sm text-green-400 hover:text-green-300 transition">View All →</button>
      </div>

      <div className="relative group">
        <button 
          onClick={() => scroll('left')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-r-lg opacity-0 group-hover:opacity-100 transition"
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
              <div className="relative rounded-lg overflow-hidden bg-gray-800 cursor-pointer" onClick={() => onViewDetails(item)}>
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  className="w-full h-[220px] md:h-[260px] object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition flex flex-col justify-end p-3 gap-2">
                  <button 
                    className="flex items-center justify-center gap-2 p-2 bg-green-600 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                    onClick={(e) => { e.stopPropagation(); /* Handle recommend */ }}
                  >
                    <ThumbsUp size={14} /> Recommend
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onViewDetails(item); }} 
                    className="flex items-center justify-center gap-2 p-2 bg-gray-600/70 rounded-lg text-sm font-semibold hover:bg-gray-600 transition"
                  >
                    <MessageCircle size={14} /> Details
                  </button>
                  {onAddToWatchlist && isInWatchlist && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isInWatchlist(item.id)) {
                          onRemoveFromWatchlist?.(item.id)
                        } else {
                          onAddToWatchlist?.(item)
                        }
                      }} 
                      className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition ${isInWatchlist(item.id) ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <Heart size={14} className={isInWatchlist(item.id) ? 'fill-white' : ''} /> 
                      {isInWatchlist(item.id) ? 'In Watchlist' : 'Watchlist'}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                {item.artist && <p className="text-xs text-gray-400">{item.artist}</p>}
                <div className="flex justify-between mt-1 text-[11px]">
                  <span className="flex items-center gap-0.5"><span className="text-green-500">🔥</span> {item.stats_highly || 0}</span>
                  <span className="flex items-center gap-0.5"><span className="text-blue-500">👍</span> {item.stats_recommended || 0}</span>
                  <span className="flex items-center gap-0.5"><span className="text-gray-500">👎</span> {item.stats_not || 0}</span>
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
    </div>
  )
}
