'use client'

import { Home, Film, Music, Heart, User, Play, Compass } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface MobileNavProps {
  activeTab: 'movie' | 'music'
  onTabChange: (tab: 'movie' | 'music' | 'home' | 'reels' | 'explore') => void
  onViewDetails: (item: ContentItem) => void
  onHomeClick: () => void
  onProfileClick: () => void
  onWatchlistClick: () => void
  onExploreClick: () => void
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
  onExploreClick,
  items,
  currentPage
}: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-gray-900/95 backdrop-blur-md border-t border-gray-800 pb-safe">
        <div className="flex items-center justify-around py-2">
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

          <button
            onClick={() => {
              onExploreClick()
              onTabChange('explore')
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPage === 'explore' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <Compass size={24} />
            <span className="text-[10px]">Explore</span>
          </button>

          <button
            onClick={() => {
              onTabChange('music')
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPage === 'music' ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <Music size={24} />
            <span className="text-[10px]">Music</span>
          </button>

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
