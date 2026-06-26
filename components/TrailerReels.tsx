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
  Clock,
  Calendar,
  User as UserIcon,
  Music2,
  Film
} from 'lucide-react'
import Image from 'next/image'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface ReelContent extends ContentItem {
  trailer_url: string
}

export default function TrailerReels() {
  const { user } = useAuth()
  const [reels, setReels] = useState<ReelContent[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({})
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 🎬 YouTube URL converter
  const getYouTubeEmbedUrl = useCallback((url: string) => {
    if (!url) return ''
    
    // If it's already an embed URL
    if (url.includes('/embed/')) {
      return url.includes('?') ? url : `${url}?autoplay=1&mute=1&enablejsapi=1&rel=0`
    }
    
    // Extract video ID
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

  // 📋 Load user's watchlist
  useEffect(() => {
    const loadWatchlist = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .select('content_id')
          .eq('user_id', user.id)
        
        if (error) {
          console.error('Error loading watchlist:', error)
          return
        }
        
        if (data) {
          const idsSet = new Set<string>()
          data.forEach(item => idsSet.add(item.content_id))
          setWatchlistIds(idsSet)
          
          // Update current reel like/save status
          if (reels[currentIndex]) {
            setIsLiked(idsSet.has(reels[currentIndex].id))
            setIsSaved(idsSet.has(reels[currentIndex].id))
          }
        }
      } catch (error) {
        console.error('Error loading watchlist:', error)
      }
    }
    
    loadWatchlist()
  }, [user, reels, currentIndex])

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
            // Auto-advance to next reel
            handleNextReel()
            return 0
          }
          return prev + 0.3 // Smooth progress
        })
      }, 100)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentIndex, reels.length])

  // 🖱️ Scroll handling for reels
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
        
        // Update like/save status for new reel
        if (reels[index]) {
          setIsLiked(watchlistIds.has(reels[index].id))
          setIsSaved(watchlistIds.has(reels[index].id))
        }
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [currentIndex, reels, watchlistIds])

  // 🎯 Like/Unlike handler
  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like')
      return
    }
    
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', currentReel.id)
        
        if (error) throw error
        
        const newSet = new Set(watchlistIds)
        newSet.delete(currentReel.id)
        setWatchlistIds(newSet)
        setIsLiked(false)
        setIsSaved(false)
        toast.success(`Removed "${currentReel.title}" from watchlist`)
      } else {
        const { error } = await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            content_id: currentReel.id,
            content_type: currentReel.type
          })
        
        if (error) throw error
        
        const newSet = new Set(watchlistIds)
        newSet.add(currentReel.id)
        setWatchlistIds(newSet)
        setIsLiked(true)
        setIsSaved(true)
        toast.success(`❤️ "${currentReel.title}" added to watchlist!`)
      }
    } catch (error) {
      console.error('Watchlist error:', error)
      toast.error('Failed to update watchlist')
    }
  }

  // 💾 Save handler (same as like for now)
  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save')
      return
    }
    
    const currentReel = reels[currentIndex]
    if (!currentReel) return
    
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', currentReel.id)
        
        if (error) throw error
        
        const newSet = new Set(watchlistIds)
        newSet.delete(currentReel.id)
        setWatchlistIds(newSet)
        setIsSaved(false)
        setIsLiked(false)
        toast.success(`Removed "${currentReel.title}" from saved`)
      } else {
        const { error } = await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            content_id: currentReel.id,
            content_type: currentReel.type
          })
        
        if (error) throw error
        
        const newSet = new Set(watchlistIds)
        newSet.add(currentReel.id)
        setWatchlistIds(newSet)
        setIsSaved(true)
        setIsLiked(true)
        toast.success(`💾 "${currentReel.title}" saved!`)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save')
    }
  }

  // 🔄 Navigation handlers
  const handleNextReel = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
      setIsPlaying(true)
      
      // Scroll to next reel
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
      
      // Scroll to previous reel
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
      // Copy to clipboard fallback
      const url = `${window.location.origin}/?details=${currentReel.id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
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
  const embedUrl = getYouTubeEmbedUrl(currentReel?.trailer_url || '')

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
        
        return (
          <div
            key={reel.id}
            className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
          >
            {/* Video Container */}
            <div className="absolute inset-0 w-full h-full bg-black">
              {reelEmbedUrl ? (
                <iframe
                  ref={el => {
                    if (isActive) {
                      videoRefs.current[reel.id] = el
                    }
                  }}
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
                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg">
                  {reel.title}
                </h2>
                
                {/* Artist/Director */}
                <p className="text-sm text-gray-300 mb-2 drop-shadow-lg">
                  {reel.type === 'movie' ? reel.director : reel.artist}
                </p>
                
                {/* Metadata */}
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
                
                {/* Description */}
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
                    ${isSaved 
                      ? 'bg-blue-500/30 ring-2 ring-blue-500' 
                      : 'bg-black/40 hover:bg-black/60 backdrop-blur-sm'
                    }
                  `}>
                    <Bookmark 
                      className={`w-6 h-6 transition-all duration-200 ${
                        isSaved ? 'fill-blue-500 text-blue-500' : 'text-white group-hover:scale-110'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-white/80">
                    {isSaved ? 'Saved' : 'Save'}
                  </span>
                </button>

                {/* Details Button */}
                <button
                  onClick={() => setShowDetails(true)}
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
                {/* Play/Pause */}
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

                {/* Mute/Unmute */}
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

      {/* Details Modal */}
      {showDetails && currentReel && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-white">{currentReel.title}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Thumbnail */}
            {currentReel.image_url && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4">
                <img
                  src={currentReel.image_url}
                  alt={currentReel.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Details */}
            <div className="space-y-3 text-gray-300">
              {currentReel.long_description && (
                <p className="text-sm leading-relaxed">{currentReel.long_description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-800">
                {/* Type specific fields */}
                {currentReel.type === 'movie' ? (
                  <>
                    <div>
                      <span className="text-gray-500 block text-xs">Director</span>
                      <span>{currentReel.director || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Year</span>
                      <span>{currentReel.year || 'N/A'}</span>
                    </div>
                    {currentReel.runtime && (
                      <div>
                        <span className="text-gray-500 block text-xs">Runtime</span>
                        <span>{currentReel.runtime}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 block text-xs">Artist</span>
                      <span>{currentReel.artist || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Duration</span>
                      <span>{currentReel.duration || 'N/A'}</span>
                    </div>
                  </>
                )}
                
                <div>
                  <span className="text-gray-500 block text-xs">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{currentReel.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Genre</span>
                  <span>{currentReel.genre || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={handleLike}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isLiked 
                    ? 'bg-teal-500/20 text-teal-500 ring-1 ring-teal-500' 
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-teal-500' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isSaved 
                    ? 'bg-blue-500/20 text-blue-500 ring-1 ring-blue-500' 
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-500' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
