'use client'

import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Heart, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ContentItem } from '@/types/content'

interface ContentRowProps {
  title: string
  items: ContentItem[]
  type: 'movie' | 'music'
  onViewDetails: (item: ContentItem) => void
  onRecommend: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => void
  onRemoveFromWatchlist: (id: string) => void
  isInWatchlist: (id: string) => boolean
}

export default function ContentRow({ 
  title, 
  items, 
  type, 
  onViewDetails, 
  onRecommend,
  onAddToWatchlist, 
  onRemoveFromWatchlist, 
  isInWatchlist 
}: ContentRowProps) {
  const router = useRouter()
  
  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${title.replace(/\s/g, '')}`)
    if (container) {
      const scrollAmount = 300
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const handleActorClick = (actorName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/actor/${encodeURIComponent(actorName)}`)
  }

  if (!items || items.length === 0) return null

  // Calculate rating from stats or use rating_scale
  const getRating = (item: ContentItem) => {
    if (item.rating_scale && item.rating_scale > 0) {
      return item.rating_scale
    }
    const total = (item.stats_highly || 0) + (item.stats_recommended || 0) + (item.stats_not || 0)
    if (total === 0) return 0
    return (((item.stats_highly || 0) * 10 + (item.stats_recommended || 0) * 7) / total).toFixed(1)
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold truncate flex-1">{title}</h2>
        <Link 
          href="/explore" 
          className="text-xs sm:text-sm text-teal-400 hover:text-teal-300 transition flex items-center gap-1 whitespace-nowrap ml-2"
        >
          View All <span className="text-base sm:text-lg">→</span>
        </Link>
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
          className="flex gap-3 sm:gap-4 overflow-x-auto scroll-container px-4 pb-4" 
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item) => {
            const rating = getRating(item)
            return (
              <div key={item.id} className="flex-shrink-0 w-[140px] xs:w-[160px] md:w-[200px] group/item">
                <div className="relative rounded-lg overflow-hidden bg-gray-800 cursor-pointer" onClick={() => onViewDetails(item)}>
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className="w-full h-[200px] xs:h-[220px] md:h-[260px] object-cover" 
                  />
                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold">{rating}/10</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition flex flex-col justify-end p-2 xs:p-3 gap-1 xs:gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRecommend(item); }} 
                      className="flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 bg-teal-600 rounded-lg text-xs xs:text-sm font-semibold hover:bg-teal-700 transition"
                    >
                      <ThumbsUp size={12} className="xs:size-14" /> Recommend
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onViewDetails(item); }} 
                      className="flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 bg-gray-600/70 rounded-lg text-xs xs:text-sm font-semibold hover:bg-gray-600 transition"
                    >
                      <MessageCircle size={12} className="xs:size-14" /> Details
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isInWatchlist(item.id)) {
                          onRemoveFromWatchlist(item.id)
                        } else {
                          onAddToWatchlist(item)
                        }
                      }} 
                      className={`flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 rounded-lg text-xs xs:text-sm font-semibold transition ${isInWatchlist(item.id) ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <Heart size={12} className={isInWatchlist(item.id) ? 'fill-white xs:size-14' : 'xs:size-14'} /> 
                      <span className="hidden xs:inline">{isInWatchlist(item.id) ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>
                  </div>
                </div>
                <div className="p-1 xs:p-2">
                  <h3 className="font-semibold text-xs xs:text-sm truncate">{item.title}</h3>
                  {item.artist ? (
                    <p className="text-[10px] xs:text-xs text-gray-400 truncate">{item.artist}</p>
                  ) : item.actors && item.actors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.actors.slice(0, 2).map((actor) => (
                        <button
                          key={actor}
                          onClick={(e) => handleActorClick(actor, e)}
                          className="text-[10px] xs:text-xs text-gray-400 hover:text-teal-400 transition truncate max-w-[80px]"
                        >
                          {actor}
                        </button>
                      ))}
                      {item.actors.length > 2 && (
                        <span className="text-[10px] xs:text-xs text-gray-500">+{item.actors.length - 2}</span>
                      )}
                    </div>
                  ) : null}
                  <div className="flex justify-between mt-1">
                    <span className="flex items-center gap-0.5">
                      <span className="text-teal-500 text-[10px] xs:text-xs sm:text-sm">🔥</span>
                      <span className="text-[9px] xs:text-[10px] sm:text-xs text-gray-300">{item.stats_highly || 0}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="text-blue-500 text-[10px] xs:text-xs sm:text-sm">👍</span>
                      <span className="text-[9px] xs:text-[10px] sm:text-xs text-gray-300">{item.stats_recommended || 0}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="text-gray-500 text-[10px] xs:text-xs sm:text-sm">👎</span>
                      <span className="text-[9px] xs:text-[10px] sm:text-xs text-gray-300">{item.stats_not || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
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
