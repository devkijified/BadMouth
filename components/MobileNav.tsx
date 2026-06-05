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
}

export default function MobileNav({ 
  activeTab, 
  onTabChange, 
  onViewDetails, 
  onHomeClick, 
  onProfileClick, 
  onWatchlistClick, 
  items 
}: MobileNavProps) {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-black/95 backdrop-blur-xl border-t border-gray-800">
          <div className="flex items-center justify-around py-2">
            <button 
              onClick={onHomeClick}
              className="flex flex-col items-center py-1 text-gray-400 hover:text-white transition"
            >
              <Home size={22} />
              <span className="text-[10px] mt-1">Home</span>
            </button>
            
            <button 
              onClick={() => onTabChange('movie')}
              className={`flex flex-col items-center py-1 transition ${activeTab === 'movie' ? 'text-teal-500' : 'text-gray-400'}`}
            >
              <Film size={22} />
              <span className="text-[10px] mt-1">Movies</span>
            </button>
            
            <Link 
              href="/explore"
              className="flex flex-col items-center justify-center -mt-8 w-14 h-14 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Compass size={24} className="text-white" />
            </Link>
            
            <button 
              onClick={() => onTabChange('music')}
              className={`flex flex-col items-center py-1 transition ${activeTab === 'music' ? 'text-teal-500' : 'text-gray-400'}`}
            >
              <Music size={22} />
              <span className="text-[10px] mt-1">Music</span>
            </button>
            
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
