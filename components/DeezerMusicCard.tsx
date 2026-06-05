'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Play, Pause, Headphones, Heart, Music, Sparkles } from 'lucide-react'

interface DeezerTrack {
  id: number
  title: string
  preview: string
  artist: {
    name: string
  }
  album: {
    title: string
    cover_xl: string
    cover_medium: string
  }
  duration: number
  rank: number
}

interface DeezerMusicCardProps {
  track: DeezerTrack
  onRecommend?: (track: DeezerTrack) => void
  onViewDetails?: (track: DeezerTrack) => void
}

export default function DeezerMusicCard({ track, onRecommend, onViewDetails }: DeezerMusicCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isRecommended, setIsRecommended] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handlePlayPause = () => {
    if (!track.preview) return

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } else {
      const audio = new Audio(track.preview)
      audioRef.current = audio
      audio.play()
      setIsPlaying(true)
      audio.onended = () => {
        setIsPlaying(false)
        audioRef.current = null
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRecommend = () => {
    setIsRecommended(!isRecommended)
    if (onRecommend) {
      onRecommend(track)
    }
  }

  return (
    <div 
      className="group relative bg-gray-800/50 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 border border-gray-700 hover:border-teal-500/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Album Cover */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-900/20 to-teal-900/20">
        <Image
          src={track.album.cover_xl || track.album.cover_medium}
          alt={track.title}
          fill
          className="object-cover group-hover:scale-110 transition duration-500"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
        
        {/* Play Button Overlay */}
        {track.preview && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"
          >
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          </button>
        )}
        
        {/* Rank Badge */}
        {track.rank && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            #{Math.floor(track.rank / 10000)}K
          </div>
        )}
        
        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs">
          {formatDuration(track.duration)}
        </div>
      </div>
      
      {/* Track Info */}
      <div className="p-4">
        <h3 className="font-bold text-base truncate group-hover:text-teal-400 transition">
          {track.title}
        </h3>
        <p className="text-sm text-gray-400 truncate flex items-center gap-1">
          <Headphones className="w-3 h-3" />
          {track.artist.name}
        </p>
        <p className="text-xs text-gray-500 truncate mt-1">
          {track.album.title}
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleRecommend}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
              isRecommended 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${isRecommended ? 'fill-white' : ''}`} />
            {isRecommended ? 'Recommended' : 'Recommend'}
          </button>
          <button
            onClick={() => onViewDetails && onViewDetails(track)}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <Music className="w-4 h-4" />
            Details
          </button>
        </div>
      </div>
      
      {/* Audio Preview Indicator */}
      {track.preview && isPlaying && (
        <div className="absolute bottom-20 left-4 right-4">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
