'use client'

import { Home, Film, Music, Heart, User, Play, Compass } from 'lucide-react'  // ← Changed from Search to Compass
import { ContentItem } from '@/types/content'
import { useRouter } from 'next/navigation'

interface MobileNavProps {
  activeTab: 'movie' | 'music'
  onTabChange: (tab: 'movie' | 'music' | 'home' | 'reels' | 'explore') => void
  onViewDetails: (item: ContentItem) => void
  onHomeClick: () => void
  onProfileClick: () => void
  onWatchlistClick: () => void
  items: ContentItem[]
  currentPage: 'home' | 'movies' | 'music' | 'reels' | 'explore'
}

export default function MobileNav({
  activeTab,
  onTabChange,
  onViewDetails,
  onHomeClick,
  onProfileClick,
  onWatchlistClick,
  items,
  currentPage
}: MobileNavProps) {
  const router = useRouter()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-gray-900/95 backdrop-blur-md border-t border-gray-800 safe-bottom">
        <div className="flex items-center justify-around py-2">
          {/* Home */}
          <button
            onClick={() => {
              onHomeClick()
              onTabChange('home')
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPage === 'home' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <Home size={24} />
            <span className="text-[10px]">Home</span>
          </button>

          {/* Movies */}
          <button
            onClick={() => {
              onTabChange('movie')
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPage === 'movies' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <Film size={24} />
            <span className="text-[10px]">Movies</span>
          </button>

          {/* Explore - Centered Floating Button with COMPASS */}
          <button
            onClick={() => {
              router.push('/explore')
            }}
            className="flex flex-col items-center gap-0.5 transition relative -mt-6"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-teal-600 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:scale-105">
              <Compass size={28} className="text-white" />  {/* ← Changed from Search to Compass */}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Explore</span>
          </button>

          {/* Reels */}
          <button
            onClick={() => {
              onTabChange('reels')
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPage === 'reels' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <Play size={24} />
            <span className="text-[10px]">Reels</span>
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex flex-col items-center gap-0.5 text-gray-400"
          >
            <User size={24} />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
