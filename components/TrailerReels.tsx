'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { 
  Heart, Info, Bookmark, Volume2, VolumeX, ChevronUp, ChevronDown,
  Play, Pause, Share2, Star, Calendar, Film, Music2, Loader2, AlertCircle
} from 'lucide-react'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface TrailerReelsProps {
  onViewDetails: (item: ContentItem) => void
  onAddToWatchlist: (item: ContentItem) => Promise<void>
  onRemoveFromWatchlist: (id: string) => Promise<void>
  isInWatchlist: (id: string) => boolean
  userId?: string
}

export default function TrailerReels({
  onViewDetails,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  userId
}: TrailerReelsProps) {
  const [reels, setReels] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 🎬 Extract YouTube Video ID safely
  const extractYouTubeId = useCallback((url: any): string | null => {
    if (!url || typeof url !== 'string') return null
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /(?:v=)([a-zA-Z0-9_-]{11})/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match
    }
    
    const idMatch = url.match(/([a-zA-Z0-9_-]{11})/)
    if (idMatch) return idMatch
    
    return null
  }, [])

  // 🎬 Get embed URL (Controlled via dynamic settings)
  const getEmbedUrl = useCallback((url: string, muted: boolean, playing: boolean): string => {
    const videoId = extractYouTubeId(url)
    if (!videoId) return ''
    
    // Convert states to YouTube Player query parameters
    const autoplayValue = playing ? '1' : '0'
    const muteValue = muted ? '1' : '0'
    
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplayValue}&mute=${muteValue}&rel=0&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3&fs=0&autohide=1&color=white&theme=dark&playsinline=1&enablejsapi=1`
  }, [extractYouTubeId])

  // 📊 Fetch reels
  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .not('trailer_url', 'is', null)
          .neq('trailer_url', '')
          .order('rating', { ascending: false })
          .limit(50)

        if (error) {
          setError('Failed to load reels')
          setIsLoading(false)
          return
        }

        if (!data || data.length === 0) {
          setError('No trailers found. Add content with trailer URLs!')
          setIsLoading(false)
          return
        }

        const validReels = data.filter(item => extractYouTubeId(item.trailer_url) !== null)

        if (validReels.length === 0) {
          setError('No valid trailer URLs found. Please check your URLs.')
          setIsLoading(false)
          return
        }

        setReels(validReels)
        
      } catch (err) {
        setError('Something went wrong loading reels')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReels()
  }, [extractYouTubeId])

  // 🔄 Navigation handlers
  const handleNextReel = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
      setVideoLoaded(false)
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
      setVideoLoaded(false)
      setIsPlaying(true)
      
      const container = containerRef.current
      if (container) {
        const prevPosition = (currentIndex - 1) * container.clientHeight
        container.scrollTo({ top: prevPosition, behavior: 'smooth' })
      }
    }
  }, [currentIndex])

  // 🎵 Progress Bar Controller
  useEffect(() => {
    if (progress >= 100) {
      handleNextReel()
    }
  }, [progress, handleNextReel])

  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    if (isPlaying && reels.length > 0 && !isLoading) {
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => (prev < 100 ? prev + 0.5 : 100))
      }, 100)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentIndex, reels.length, isLoading])

  // 🖱️ Scroll handling
  useEffect(() => {
    const container = containerRef.current
    if (!container || reels.length === 0) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const height = container.clientHeight
      const index = Math.round(scrollTop / height)
      
      if (index !== currentIndex && index < reels.length && index >= 0) {
        setCurrentIndex(index)
        setProgress(0)
        setVideoLoaded(false)
        setIsPlaying(true)
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [currentIndex, reels.length])

  // ⌨️ Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reels.length === 0) return
      if (e.key === 'ArrowUp') handlePrevReel()
      if (e.key === 'ArrowDown') handleNextReel()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevReel, handleNextReel, isPlaying, reels.length])

  // 🖱️ Share handler
  const handleShare = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentReel.title,
          text: `Check out ${currentReel.title} on BADMOUTH!`,
          url: window.location.href
        })
      } else {
        const url = `${window.location.origin}/?details=${currentReel.id}`
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  // Handle watchlist interactions
  const handleLike = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      if (isInWatchlist && isInWatchlist(currentReel.id)) {
        await onRemoveFromWatchlist(currentReel.id)
        toast.success(`Removed "${currentReel.title}" from watchlist`)
      } else {
        await onAddToWatchlist(currentReel)
        toast.success(`❤️ "${currentReel.title}" added to watchlist!`)
      }
    } catch (error) {
      toast.error('Failed to update watchlist')
    }
  }

  const handleSave = async () => {
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      if (isInWatchlist && isInWatchlist(currentReel.id)) {
        await onRemoveFromWatchlist(currentReel.id)
        toast.success(`Removed "${currentReel.title}" from saved`)
      } else {
        await onAddToWatchlist(currentReel)
        toast.success(`💾 "${currentReel.title}" saved!`)
      }
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  // 🎬 Loading state
  if (isLoading) {
    return (
      <div className="h-[80vh] w-full bg-black flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
        <p className="text-gray-400 mt-4">Loading reels...</p>
      </div>
    )
  }

  // 🚫 Error state
  if (error || reels.length === 0) {
    return (
      <div className="h-[80vh] w-full bg-black flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Reels Available</h2>
        <p className="text-gray-400 text-center max-w-md">
          {error || 'No trailers found. Add content with trailer URLs to the database.'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="h-[80vh] w-full overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {reels.map((reel, index) => {
        const isActive = index === currentIndex
        const embedUrl = isActive ? getEmbedUrl(reel.trailer_url, isMuted, isPlaying) : ''
        const isLiked = isInWatchlist ? isInWatchlist(reel.id) : false
        
        return (
          <div key={reel.id} className="h-[80vh] w-full snap-start relative flex items-center justify-center bg-black">
            {/* Video Container */}
            <div className="absolute inset-0 w-full h-full bg-black">
              {/* PERFORMANCE FIX: Only mount the iframe if this slide is active */}
              {isActive && embedUrl ? (
                <div className="relative w-full h-full">
                  <iframe
                    key={`${reel.id}-${isActive}`}
                    src={embedUrl}
                    title={reel.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    frameBorder="0"
                    onLoad={() => setVideoLoaded(true)}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%', height: '100%', objectFit: 'cover',
                    }}
                  />
                  {!videoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                    </div>
                  )}
                </div>
              ) : (
                /* Static Placeholder for all non-active items */
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-900 to-black">
                  <div className="text-center text-white p-4">
                    <div className="text-4xl mb-4">🎥</div>
                    <p className="text-xl font-medium mb-2">{reel.title}</p>
                    <p className="text-sm text-gray-400">Loading Preview...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />

            {/* Progress Bar (Only render when active) */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 z-30">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Content Info - Bottom (Only render when active) */}
            {isActive && (
              <div className="absolute bottom-24 left-4 right-20 z-30 text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg">{reel.title}</h2>
                <p className="text-sm text-gray-300 mb-2 drop-shadow-lg">
                  {reel.type === 'movie' ? reel.director : reel.artist}
                </p>
                
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                  {reel.rating && Number(reel.rating) > 0 && (
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {Number(reel.rating).toFixed(1)}
                    </span>
                  )}
                  <span className="bg-black/40 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                    {reel.type === 'movie' ? <Film className="w-3 h-3" /> : <Music2 className="w-3 h-3" />}
                    {reel.type === 'movie' ? 'Movie' : 'Music'}
                  </span>
                  {reel.genre && (
                    <span className="bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">{reel.genre}</span>
                  )}
                  {reel.year && (
                    <span className="bg-black/40 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Calendar className="w-3 h-3" />
                      {reel.year}
                    </span>
                  )}
                </div>
                
                {reel.description && (
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2 max-w-md drop-shadow-lg">{reel.description}</p>
                )}
              </div>
            )}

            {/* Action Buttons - Right Side (Only render when active) */}
            {isActive && (
              <div className="absolute bottom-32 right-4 z-30 flex flex-col items-center gap-4">
                <button onClick={handleLike} className="group flex flex-col items-center gap-1">
                  <div className={`p-2.5 rounded-full transition-all duration-200 ${isLiked ? 'bg-teal-500/30 ring-2 ring-teal-500' : 'bg-black/40 hover:bg-black/60 backdrop-blur-sm'}`}>
                    <Heart className={`w-6 h-6 transition-all duration-200 ${isLiked ? 'fill-teal-500 text-teal-500' : 'text-white group-hover:scale-110'}`} />
                  </div>
                  <span className="text-[10px] text-white/80">{isLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button onClick={handleSave} className="group flex flex-col items-center gap-1">
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                    <Bookmark className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/80">Save</span>
                </button>

                <button onClick={() => onViewDetails(reel)} className="group flex flex-col items-center gap-1">
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                    <Info className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/80">Details</span>
                </button>

                <button onClick={handleShare} className="group flex flex-col items-center gap-1">
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                    <Share2 className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] text-white/80">Share</span>
                </button>
              </div>
            )}

            {/* Bottom Controls (Only render when active) */}
            {isActive && (
              <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200">
                  {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>
              </div>
            )}

            {/* Navigation Arrows (Desktop - Only render when active) */}
            {isActive && (
              <>
                <button onClick={handlePrevReel} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200 hidden md:block">
                  <ChevronUp className="w-6 h-6 text-white" />
                </button>
                <button onClick={handleNextReel} className="absolute right-20 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200 hidden md:block">
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
