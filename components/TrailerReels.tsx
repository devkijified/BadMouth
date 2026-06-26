'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ContentItem } from '@/types/content'
import { Heart, Star, Film, Music, Play, Pause, Volume2, VolumeX, Maximize, X, ThumbsUp, MessageCircle, Share2, Bookmark, Info } from 'lucide-react'
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
  const [showInfo, setShowInfo] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

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
      // Unlike - remove from watchlist
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
      // Like - add to watchlist
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

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(progress)
    }
  }

  const handleVideoEnd = () => {
    // Auto-advance to next reel
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Loop back to start
      setCurrentIndex(0)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Detect when user scrolls to next reel
    const container = e.currentTarget
    const scrollHeight = container.scrollHeight - container.clientHeight
    const scrollTop = container.scrollTop
    
    // Calculate which reel is visible
    const reelHeight = container.clientHeight
    const index = Math.round(scrollTop / reelHeight)
    
    if (index !== currentIndex && index < reels.length) {
      setCurrentIndex(index)
      // Auto-play the new reel
      setIsPlaying(true)
      if (videoRef.current) {
        videoRef.current.play().catch(() => {})
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

  const currentReel = reels[currentIndex]

  return (
    <div 
      ref={containerRef}
      className="relative h-[80vh] md:h-[85vh] overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      onScroll={handleScroll}
    >
      {reels.map((item, index) => {
        const isActive = index === currentIndex
        const isLiked = liked.has(item.id)
        
        return (
          <div 
            key={`${item.id}-${index}`}
            className="h-[80vh] md:h-[85vh] snap-start snap-always relative bg-black"
          >
            {/* Video Background */}
            <div className="absolute inset-0 bg-black">
              {item.trailer_url && (
                <video
                  ref={isActive ? videoRef : undefined}
                  src={item.trailer_url}
                  className="w-full h-full object-contain"
                  muted={isMuted}
                  loop={false}
                  playsInline
                  autoPlay={isActive}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                  onClick={handleVideoClick}
                />
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Progress Bar */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 z-20">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Controls Overlay */}
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <button
                  onClick={handleVideoClick}
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
                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {item.title}
                </h2>
                
                {/* Artist/Director */}
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
                
                {/* Rating & Type */}
                <div className="flex items-center gap-3 mb-3">
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

                {/* Description */}
                <p className="text-gray-300 text-sm line-clamp-2 max-w-xl">
                  {item.long_description || item.description}
                </p>
              </div>
            </div>

            {/* Action Buttons - Right Side */}
            <div className="absolute right-4 bottom-32 md:bottom-36 z-20 flex flex-col items-center gap-4 pointer-events-none">
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

              {/* Watchlist Button */}
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
                  onClick={handleMute}
                  className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                >
                  {isMuted ? (
                    <VolumeX size={20} className="text-white" />
                  ) : (
                    <Volume2 size={20} className="text-white" />
                  )}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Reel Counter */}
      <div className="absolute top-20 right-4 z-30 pointer-events-none">
        <div className="bg-black/50 px-3 py-1 rounded-full text-xs text-gray-300">
          {currentIndex + 1} / {reels.length}
        </div>
      </div>
    </div>
  )
}
