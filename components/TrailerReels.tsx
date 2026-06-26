// components/TrailerReels.tsx

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  Heart, 
  Info, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Share2,
  Star,
  Calendar,
  Film,
  Music2
} from 'lucide-react'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

// ✅ ADD THIS: Define the props interface
interface TrailerReelsProps {
  onViewDetails: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => Promise<void>
  onRemoveFromWatchlist: (id: string) => Promise<void>
  isInWatchlist: (id: string) => boolean
  userId?: string
}

// ✅ ADD THIS: Accept props in the component
export default function TrailerReels({
  onViewDetails,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  userId
}: TrailerReelsProps) {
  const { user } = useAuth()
  const [reels, setReels] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 🎬 YouTube URL converter
  const getYouTubeEmbedUrl = useCallback((url: string) => {
    if (!url) return ''
    
    if (url.includes('/embed/')) {
      return url.includes('?') ? url : `${url}?autoplay=1&mute=1&enablejsapi=1&rel=0`
    }
    
    let videoId = ''
    
    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0] || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    } else if (url.includes('/v/')) {
      videoId = url.split('/v/')[1]?.split('?')[0] || ''
    } else if (url.includes('/e/')) {
      videoId = url.split('/e/')[1]?.split('?')[0] || ''
    } else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('shorts/')[1]?.split('?')[0] || ''
    }
    
    if (!videoId) return url
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0`
  }, [])

  // 📊 Fetch reels
  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log('🔍 Fetching reels...')
        const { data, error, count } = await supabase
          .from('content')
          .select('*', { count: 'exact' })
          .not('trailer_url', 'is', null)
          .neq('trailer_url', '')
          .order('rating', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching reels:', error)
          setError('Failed to load reels')
          return
        }

        if (!data || data.length === 0) {
          setError('No trailers found. Add content with trailer URLs!')
          return
        }

        console.log(`✅ Loaded ${data.length} reels`)
        setReels(data)
        setTotalCount(count || data.length)
        
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong loading reels')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReels()
  }, [])

  // 🎵 Progress bar animation
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    if (isPlaying && reels.length > 0) {
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNextReel()
            return 0
          }
          return prev + 0.3
        })
      }, 100)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentIndex, reels.length])

  // 🖱️ Scroll handling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const height = container.clientHeight
      const index = Math.round(scrollTop / height)
      
      if (index !== currentIndex && index < reels.length) {
        setCurrentIndex(index)
        setProgress(0)
        setIsPlaying(true)
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [currentIndex, reels.length])

  // 🔄 Navigation handlers
  const handleNextReel = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
      setIsPlaying(true)
      
      const container = containerRef.current
      if (container) {
        const nextPosition = (currentIndex + 1) * container.clientHeight
        container.scrollTo({ top: nextPosition, behavior: 'smooth' })
      }
    }
  }, [currentIndex, reels.length])

  const handlePrevReel = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setProgress(0)
      setIsPlaying(true)
      
      const container = containerRef.current
      if (container) {
        const prevPosition = (currentIndex - 1) * container.clientHeight
        container.scrollTo({ top: prevPosition, behavior: 'smooth' })
      }
    }
  }, [currentIndex])

  // ⌨️ Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handlePrevReel()
      if (e.key === 'ArrowDown') handleNextReel()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevReel, handleNextReel, isPlaying])

  // 🖱️ Share handler
  const handleShare = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      await navigator.share({
        title: currentReel.title,
        text: `Check out ${currentReel.title} on BADMOUTH!`,
        url: window.location.href
      })
    } catch (error) {
      const url = `${window.location.origin}/?details=${currentReel.id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  // ✅ FIX: Handle like using props
  const handleLike = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    if (isInWatchlist && isInWatchlist(currentReel.id)) {
      await onRemoveFromWatchlist(currentReel.id)
      toast.success(`Removed "${currentReel.title}" from watchlist`)
    } else {
      await onAddToWatchlist(currentReel)
      toast.success(`❤️ "${currentReel.title}" added to watchlist!`)
    }
  }

  // ✅ FIX: Handle save using props
  const handleSave = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    if (isInWatchlist && isInWatchlist(currentReel.id)) {
      await onRemoveFromWatchlist(currentReel.id)
      toast.success(`Removed "${currentReel.title}" from saved`)
    } else {
      await onAddToWatchlist(currentReel)
      toast.success(`💾 "${currentReel.title}" saved!`)
    }
  }

  // 🎬 Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 mt-4 animate-pulse">Loading reels...</p>
      </div>
    )
  }

  // 🚫 Error state
  if (error || reels.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-6">🎬</div>
        <h2 className="text-2xl font-bold text-white mb-2">No Reels Available</h2>
        <p className="text-gray-400 text-center max-w-md">
          {error || 'No trailers found. Add content with trailer URLs to the database.'}
        </p>
        <p className="text-gray-500 text-sm mt-4">
          Trailer URLs should be from YouTube or Vimeo
        </p>
      </div>
    )
  }

  const currentReel = reels[currentIndex]

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Reels Container */}
      {reels.map((reel, index) => {
        const isActive = index === currentIndex
        const reelEmbedUrl = getYouTubeEmbedUrl(reel.trailer_url)
        const isLiked = isInWatchlist ? isInWatchlist(reel.id) : false
        
        return (
          <div
            key={reel.id}
            className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
          >
            {/* Video Container */}
            <div className="absolute inset-0 w-full h-full bg-black">
              {reelEmbedUrl ? (
                <iframe
                  src={reelEmbedUrl}
                  title={reel.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  frameBorder="0"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-900 to-black">
                  <div className="text-center text-white p-4">
                    <div className="text-4xl mb-4">🎥</div>
                    <p className="text-xl font-medium mb-2">{reel.title}</p>
                    <p className="text-sm text-gray-400">No trailer available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

            {/* Progress Bar */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 z-30">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Header Counter */}
            <div className="absolute top-4 left-4 z-30">
              <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-white text-sm font-medium">
                  {index + 1} / {reels.length}
                </span>
              </div>
            </div>

            {/* Content Info - Bottom */}
            {isActive && (
              <div className="absolute bottom-24 left-4 right-20 z-30 text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg">
                  {reel.title}
                </h2>
                
                <p className="text-sm text-gray-300 mb-2 drop-shadow-lg">
                  {reel.type === 'movie' ? reel.director : reel.artist}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                  {reel.rating && (
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {reel.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
                    {reel.type === 'movie' ? (
                      <Film className="w-3 h-3" />
                    ) : (
                      <Music2 className="w-3 h-3" />
                    )}
                    {reel.type === 'movie' ? 'Movie' : 'Music'}
                  </span>
                  {reel.genre && (
                    <span className="bg-black/40 px-2 py-1 rounded-full">
                      {reel.genre}
                    </span>
                  )}
                  {reel.year && (
                    <span className="bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {reel.year}
                    </span>
                  )}
                </div>
                
                {reel.description && (
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2 max-w-md drop-shadow-lg">
                    {reel.description}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons - Right Side */}
            {isActive && (
              <div className="absolute bottom-32 right-4 z-30 flex flex-col items-center gap-4">
                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className="group flex flex-col items-center gap-1"
                >
                  <div className={`
                    p-2.5 rounded-full transition-all duration-200
                    ${isLiked 
                      ? 'bg-teal-500/30 ring-2 ring-teal-500' 
                      : 'bg-black/40 hover:bg-black/60 backdrop-blur-sm'
                    }
                  `}>
                    <Heart 
                      className={`w-6 h-6 transition-all duration-200 ${
                        isLiked ? 'fill-teal-500 text-teal-500' : 'text-white group-hover:scale-110'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-white/80">
                    {isLiked ? 'Liked' : 'Like'}
                  </span>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  className="group flex flex-col items-center gap-1"
                >
                  <div className={`
                    p-2.5 rounded-full transition-all duration-200
                    ${isLiked 
                      ? 'bg-blue-500/30 ring-2 ring-blue-500' 
                      : 'bg-black/40 hover:bg-black/60 backdrop-blur-sm'
                    }
                  `}>
                    <Bookmark 
                      className={`w-6 h-6 transition-all duration-200 ${
                        isLiked ? 'fill-blue-500 text-blue-500' : 'text-white group-hover:scale-110'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-white/80">
                    {isLiked ? 'Saved' : 'Save'}
                  </span>
                </button>

                {/* Details Button */}
                <button
                  onClick={() => {
                    setShowDetails(true)
                    onViewDetails(reel)
                  }}
                  className="group flex flex-col items-center gap-1"
                >
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                    <Info className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/80">Details</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="group flex flex-col items-center gap-1"
                >
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                    <Share2 className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/80">Share</span>
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            {isActive && (
              <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            )}

            {/* Navigation Arrows (Desktop) */}
            {isActive && (
              <>
                <button
                  onClick={handlePrevReel}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200 hidden md:block"
                >
                  <ChevronUp className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={handleNextReel}
                  className="absolute right-20 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200 hidden md:block"
                >
                  <ChevronDown className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
