'use client'

import { Film, Music, Home, Search, User, Heart, Sparkles } from 'lucide-react'

interface MobileNavProps {
  activeTab: 'movies' | 'music'
  onTabChange: (tab: 'movies' | 'music') => void
}

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-black/95 backdrop-blur-xl border-t border-gray-800">
          <div className="flex items-center justify-around py-2">
            <button className="flex flex-col items-center py-1 text-gray-400 hover:text-white transition">
              <Home size={22} />
              <span className="text-[10px] mt-1">Home</span>
            </button>
            
            <button 
              onClick={() => onTabChange('movies')}
              className={`flex flex-col items-center py-1 transition ${
                activeTab === 'movies' ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              <Film size={22} />
              <span className="text-[10px] mt-1">Movies</span>
            </button>
            
            <button className="flex flex-col items-center justify-center -mt-8 w-14 h-14 bg-gradient-to-r from-red-600 to-purple-600 rounded-full shadow-lg hover:scale-110 transition-transform">
              <Sparkles size={24} className="text-white" />
            </button>
            
            <button 
              onClick={() => onTabChange('music')}
              className={`flex flex-col items-center py-1 transition ${
                activeTab === 'music' ? 'text-purple-500' : 'text-gray-400'
              }`}
            >
              <Music size={22} />
              <span className="text-[10px] mt-1">Music</span>
            </button>
            
            <button className="flex flex-col items-center py-1 text-gray-400 hover:text-white transition">
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
