'use client'

import { Film, Music, Home, User, Sparkles, Heart, Compass } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'

interface MobileNavProps {
  activeTab: 'movie' | 'music'
  onTabChange: (tab: 'movie' | 'music') => void
  onViewDetails: (item: ContentItem) => void
  onHomeClick: () => void
  onProfileClick: () => void
  onWatchlistClick: () => void
  items: ContentItem[]
  currentPage?: 'home' | 'movies' | 'music'
}

export default function MobileNav({ 
  activeTab, 
  onTabChange, 
  onViewDetails, 
  onHomeClick, 
  onProfileClick, 
  onWatchlistClick, 
  items,
  currentPage = 'home'
}: MobileNavProps) {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-black/95 backdrop-blur-xl border-t border-gray-800">
          <div className="flex items-center justify-around py-2">
            {/* Home Button - Now with active state */}
            <button 
              onClick={onHomeClick}
              className={`flex flex-col items-center py-1 transition ${currentPage === 'home' ? 'text-teal-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Home size={22} />
              <span className="text-[10px] mt-1">Home</span>
            </button>
            
            {/* Movies Button */}
            <button 
              onClick={() => onTabChange('movie')}
              className={`flex flex-col items-center py-1 transition ${currentPage === 'movies' ? 'text-teal-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Film size={22} />
              <span className="text-[10px] mt-1">Movies</span>
            </button>
            
            {/* Center Explore Button */}
            <Link 
              href="/explore"
              className="flex flex-col items-center justify-center -mt-8 w-14 h-14 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Compass size={24} className="text-white" />
              <span className="text-[8px] mt-0.5 text-white">Explore</span>
            </Link>
            
            {/* Music Button */}
            <button 
              onClick={() => onTabChange('music')}
              className={`flex flex-col items-center py-1 transition ${currentPage === 'music' ? 'text-teal-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Music size={22} />
              <span className="text-[10px] mt-1">Music</span>
            </button>
            
            {/* Profile Button */}
            <button 
              onClick={onProfileClick}
              className="flex flex-col items-center py-1 text-gray-400 hover:text-white transition"
            >
              <User size={22} />
              <span className="text-[10px] mt-1">Profile</span>
            </button>
          </div>
        </div>
      </nav>
      <div className="h-16 md:hidden" />
    </>
  )
}
