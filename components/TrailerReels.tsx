'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ContentItem } from '@/types/content'
import { Heart, Star, Film, Music, Play, Pause, Volume2, VolumeX, Info, Bookmark, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface TrailerReelsProps {
  onViewDetails: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => void
  onRemoveFromWatchlist: (id: string) => void
  isInWatchlist: (id: string) => boolean
  userId: string
}

export default function TrailerReels({
  onViewDetails,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  userId
}: TrailerReelsProps) {
  const [reels, setReels] = useState<ContentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [showFullscreen, setShowFullscreen] = useState(false)
  
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    loadReels()
  }, [])

  const loadReels = async () => {
    setLoading(true)
    try {
      // Get content with trailers
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '')
        .order('rating', { ascending: false })
        .limit(50)

      if (error) throw error
      
      // Shuffle the reels for variety
      const shuffled = data ? shuffleArray(data) : []
      setReels(shuffled)
      
      // Load user's watchlist
      if (userId) {
        const { data: watchlist } = await supabase
          .from('watchlist')
          .select('content_id')
          .eq('user_id', userId)
        
        if (watchlist) {
          const ids = new Set(watchlist.map(w => w.content_id))
          setLiked(ids)
        }
      }
    } catch (error) {
      console.error('Error loading reels:', error)
      toast.error('Failed to load trailers')
    } finally {
      setLoading(false)
    }
  }

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const handleLike = async (item: ContentItem) => {
    if (!userId) {
      toast.error('Please sign in to like')
      return
    }

    const isLiked = liked.has(item.id)
    
    if (isLiked) {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', item.id)
      
      if (!error) {
        const newLiked = new Set(liked)
        newLiked.delete(item.id)
        setLiked(newLiked)
        onRemoveFromWatchlist(item.id)
        toast.success(`Removed "${item.title}" from watchlist`)
      }
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: userId,
          content_id: item.id,
          content_type: item.type
        })
      
      if (!error) {
        const newLiked = new Set(liked)
        newLiked.add(item.id)
        setLiked(newLiked)
        onAddToWatchlist(item)
        toast.success(`❤️ "${item.title}" added to watchlist`)
      }
    }
  }

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  const handleVideoClick = (itemId: string) => {
    const video = videoRefs.current[itemId]
    if (video) {
      if (isPlaying) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMute = (itemId: string) => {
    const video = videoRefs.current[itemId]
    if (video) {
      video.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = (itemId: string) => {
    const video = videoRefs.current[itemId]
    if (video && video.duration) {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)
    }
  }

  const handleVideoEnd = (itemId: string, index: number) => {
    // Auto-advance to next reel
    if (index < reels.length - 1) {
      setCurrentIndex(index + 1)
      setTimeout(() => {
        const nextVideo = videoRefs.current[reels[index + 1]?.id]
        if (nextVideo) {
          nextVideo.play().catch(() => {})
        }
      }, 100)
    }
  }

  const handleScroll = () => {
    if (!containerRef.current || isScrollingRef.current) return
    
    const container = containerRef.current
    const children = container.children
    const containerHeight = container.clientHeight
    const scrollTop = container.scrollTop
    
    // Find which child is most visible
    let closestIndex = 0
    let closestDistance = Infinity
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const rect = child.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // Calculate how much of the child is visible
      const visibleTop = Math.max(rect.top, containerRect.top)
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      const childHeight = rect.height
      const visibilityRatio = visibleHeight / childHeight
      
      if (visibilityRatio > 0.5) {
        closestIndex = i
        break
      }
    }
    
    if (closestIndex !== currentIndex) {
      setCurrentIndex(closestIndex)
      setIsPlaying(true)
      
      // Pause all other videos
      Object.keys(videoRefs.current).forEach(key => {
        const video = videoRefs.current[key]
        if (video) {
          video.pause()
        }
      })
      
      // Play the current video
      const currentVideo = videoRefs.current[reels[closestIndex]?.id]
      if (currentVideo) {
        currentVideo.play().catch(() => {})
      }
    }
  }

  const handleFullscreen = (itemId: string) => {
    const video = videoRefs.current[itemId]
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen()
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trailers...</p>
        </div>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Film size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No Trailers Available</h3>
          <p className="text-gray-400">Check back later for new trailers!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[80vh] md:h-[85vh]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <Play size={20} className="text-teal-500 fill-teal-500" />
            <h2 className="text-lg font-bold text-white">Trailer Reels</h2>
          </div>
          <span className="text-xs text-gray-400 bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {reels.length}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.map((item, index) => {
          const isActive = index === currentIndex
          const isLiked = liked.has(item.id)
          const videoRef = (el: HTMLVideoElement | null) => {
            videoRefs.current[item.id] = el
          }
          
          return (
            <div 
              key={`${item.id}-${index}`}
              className="h-[80vh] md:h-[85vh] snap-start snap-always relative bg-black"
            >
              {/* Video */}
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                {item.trailer_url && (
                  <video
                    ref={videoRef}
                    src={item.trailer_url}
                    className="w-full h-full object-contain"
                    muted={isMuted}
                    loop={false}
                    playsInline
                    autoPlay={isActive && index === currentIndex}
                    onTimeUpdate={() => handleTimeUpdate(item.id)}
                    onEnded={() => handleVideoEnd(item.id, index)}
                    onClick={() => handleVideoClick(item.id)}
                  />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              </div>

              {/* Progress Bar */}
              {isActive && (
                <div className="absolute top-16 left-0 right-0 h-0.5 bg-gray-700 z-20">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Play/Pause Overlay */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <button
                    onClick={() => handleVideoClick(item.id)}
                    className="pointer-events-auto p-4 rounded-full bg-black/50 hover:bg-black/70 transition transform hover:scale-110"
                  >
                    {isPlaying ? (
                      <Pause size={48} className="text-white" />
                    ) : (
                      <Play size={48} className="text-white" />
                    )}
                  </button>
                </div>
              )}

              {/* Content Info - Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 pointer-events-none">
                <div className="max-w-2xl">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {item.title}
                  </h2>
                  
                  {item.artist && (
                    <p className="text-gray-300 text-sm md:text-base mb-2">
                      {item.artist}
                    </p>
                  )}
                  {item.director && !item.artist && (
                    <p className="text-gray-300 text-sm md:text-base mb-2">
                      Directed by {item.director}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star size={16} className="fill-yellow-400" />
                      <span className="font-bold">{getRating(item).toFixed(1)}</span>
                      <span className="text-gray-400 text-sm">/10</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">
                      {item.type === 'movie' ? '🎬 Movie' : '🎵 Music'}
                    </span>
                    {item.is_tv_show && (
                      <span className="text-xs px-2 py-0.5 bg-purple-600 rounded-full text-white">
                        📺 TV Series
                      </span>
                    )}
                  </div>

                  <p className="text-gray-300 text-sm line-clamp-2 max-w-xl">
                    {item.long_description || item.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Right Side */}
              <div className="absolute right-4 bottom-24 md:bottom-28 z-20 flex flex-col items-center gap-4 pointer-events-none">
                {/* Like Button */}
                <button
                  onClick={() => handleLike(item)}
                  className="pointer-events-auto flex flex-col items-center gap-1 group"
                >
                  <div className={`p-3 rounded-full transition ${
                    isLiked 
                      ? 'bg-teal-600 scale-110' 
                      : 'bg-black/50 hover:bg-teal-600/80'
                  }`}>
                    <Heart 
                      size={24} 
                      className={`transition ${
                        isLiked 
                          ? 'fill-white text-white' 
                          : 'text-white group-hover:text-white'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-white font-medium">
                    {isLiked ? 'Liked' : 'Like'}
                  </span>
                </button>

                {/* Info Button */}
                <button
                  onClick={() => {
                    onViewDetails(item)
                  }}
                  className="pointer-events-auto flex flex-col items-center gap-1 group"
                >
                  <div className="p-3 rounded-full bg-black/50 hover:bg-teal-600/80 transition">
                    <Info size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-white font-medium">Details</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={() => {
                    if (isInWatchlist(item.id)) {
                      onRemoveFromWatchlist(item.id)
                      const newLiked = new Set(liked)
                      newLiked.delete(item.id)
                      setLiked(newLiked)
                    } else {
                      onAddToWatchlist(item)
                      const newLiked = new Set(liked)
                      newLiked.add(item.id)
                      setLiked(newLiked)
                    }
                  }}
                  className="pointer-events-auto flex flex-col items-center gap-1 group"
                >
                  <div className={`p-3 rounded-full transition ${
                    isInWatchlist(item.id) 
                      ? 'bg-teal-600' 
                      : 'bg-black/50 hover:bg-teal-600/80'
                  }`}>
                    <Bookmark 
                      size={24} 
                      className={`transition ${
                        isInWatchlist(item.id) 
                          ? 'fill-white text-white' 
                          : 'text-white'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-white font-medium">
                    {isInWatchlist(item.id) ? 'Saved' : 'Save'}
                  </span>
                </button>
              </div>

              {/* Video Controls - Bottom Right */}
              {isActive && (
                <div className="absolute bottom-4 right-4 z-20 flex gap-2 pointer-events-none">
                  <button
                    onClick={() => handleMute(item.id)}
                    className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                  >
                    {isMuted ? (
                      <VolumeX size={20} className="text-white" />
                    ) : (
                      <Volume2 size={20} className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => handleFullscreen(item.id)}
                    className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Scroll Indicator */}
              {index === reels.length - 1 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                  <p className="text-xs text-gray-400 animate-bounce">End of reels</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
