'use client'

import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Heart, Star, Tv } from 'lucide-react'
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
  maxItems?: number
}

export default function ContentRow({ 
  title, 
  items, 
  type, 
  onViewDetails, 
  onRecommend,
  onAddToWatchlist, 
  onRemoveFromWatchlist, 
  isInWatchlist,
  maxItems = 20  // Changed from 10 to 20 to show more
}: ContentRowProps) {
  const router = useRouter()
  const displayItems = items.slice(0, maxItems)
  
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

  if (!displayItems || displayItems.length === 0) return null

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  const isTVShow = (item: ContentItem) => {
    return item.genre === 'TV Series' || 
           item.is_tv_show === true ||
           (item.type === 'movie' && item.runtime && item.runtime.includes('min per episode'))
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold truncate flex-1">{title}</h2>
        <Link href={`/explore?category=${encodeURIComponent(title)}`} className="text-xs sm:text-sm text-teal-400 hover:text-teal-300 transition flex items-center gap-1 whitespace-nowrap ml-2">
          View All <span className="text-base sm:text-lg">→</span>
        </Link>
      </div>

      <div className="relative group">
        <button 
          onClick={() => scroll('left')} 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-r-lg opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div 
          id={`scroll-${title.replace(/\s/g, '')}`} 
          className="flex gap-3 sm:gap-4 overflow-x-auto scroll-container px-4 pb-4" 
          style={{ scrollBehavior: 'smooth' }}
        >
          {displayItems.map((item, idx) => {
            const tvShow = isTVShow(item)
            const rating = getRating(item)
            return (
              <div key={`${item.id}-${idx}`} className="flex-shrink-0 w-[140px] xs:w-[160px] md:w-[200px] group/item">
                <div 
                  className="relative rounded-lg overflow-hidden bg-gray-800 cursor-pointer" 
                  onClick={() => onViewDetails(item)}
                >
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className="w-full h-[200px] xs:h-[220px] md:h-[260px] object-cover" 
                  />
                  
                  {/* TV Show Badge */}
                  {tvShow && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Tv size={10} /> TV Series
                      </div>
                    </div>
                  )}
                  
                  {/* Rating Badge - No count */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] xs:text-xs font-bold">{rating.toFixed(1)}</span>
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover/item:opacity-100 transition-all duration-300 flex flex-col justify-end p-2 xs:p-3 gap-1 xs:gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onRecommend(item); 
                      }} 
                      className="flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 bg-teal-600 rounded-lg text-[10px] xs:text-xs font-semibold hover:bg-teal-700 transition"
                    >
                      <Star size={12} className="fill-white" /> Rate
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onViewDetails(item); 
                      }} 
                      className="flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 bg-gray-600/80 rounded-lg text-[10px] xs:text-xs font-semibold hover:bg-gray-600 transition"
                    >
                      <MessageCircle size={12} /> Details
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
                      className={`flex items-center justify-center gap-1 xs:gap-2 p-1.5 xs:p-2 rounded-lg text-[10px] xs:text-xs font-semibold transition ${
                        isInWatchlist(item.id) 
                          ? 'bg-teal-600' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Heart size={12} className={isInWatchlist(item.id) ? 'fill-white' : ''} /> 
                      <span className="hidden xs:inline">{isInWatchlist(item.id) ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>
                  </div>
                </div>
                
                {/* Content Info */}
                <div className="p-1 xs:p-2">
                  <h3 className="font-semibold text-[11px] xs:text-sm truncate">{item.title}</h3>
                  
                  {tvShow ? (
                    <p className="text-[9px] xs:text-[10px] text-purple-400 truncate">
                      TV Series • {item.year}
                    </p>
                  ) : item.artist ? (
                    <p className="text-[9px] xs:text-xs text-gray-400 truncate">
                      {item.artist}
                    </p>
                  ) : item.actors && item.actors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.actors.slice(0, 2).map((actor) => (
                        <button 
                          key={actor} 
                          onClick={(e) => handleActorClick(actor, e)} 
                          className="text-[9px] xs:text-[10px] text-gray-400 hover:text-teal-400 transition truncate max-w-[70px]"
                        >
                          {actor}
                        </button>
                      ))}
                      {item.actors.length > 2 && (
                        <span className="text-[9px] xs:text-[10px] text-gray-500">
                          +{item.actors.length - 2}
                        </span>
                      )}
                    </div>
                  ) : null}
                  
                  {/* Rating Display - No count */}
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-bold text-yellow-400">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-gray-500">/10</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button 
          onClick={() => scroll('right')} 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-l-lg opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
