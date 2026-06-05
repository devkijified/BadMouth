'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Search, Bell, User, Menu, Film, Music, Home as HomeIcon, Heart, Sparkles, X, LogOut } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import ContentRow from '@/components/ContentRow'
import SocialRecommendations from '@/components/SocialRecommendations'
import MobileNav from '@/components/MobileNav'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'movies' | 'music'>('movies')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Sample data with stats
  const trendingMovies = [
    { 
      id: '1', 
      title: 'The Dark Knight', 
      description: 'Batman faces the Joker in Gotham City. A masterpiece of action and drama.',
      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 
      type: 'movie' as const, 
      year: 2008,
      director: 'Christopher Nolan',
      cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
      trailer: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
      stats: { highly: 2340, recommended: 890, not: 123 }
    },
    { 
      id: '2', 
      title: 'Inception', 
      description: 'A thief who steals corporate secrets through dream-sharing technology.',
      image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 
      type: 'movie' as const, 
      year: 2010,
      director: 'Christopher Nolan',
      cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
      trailer: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
      stats: { highly: 1890, recommended: 654, not: 89 }
    },
    { 
      id: '3', 
      title: 'Interstellar', 
      description: 'A team of explorers travel through a wormhole in space.',
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 
      type: 'movie' as const, 
      year: 2014,
      director: 'Christopher Nolan',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
      trailer: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      stats: { highly: 1567, recommended: 723, not: 67 }
    },
    { 
      id: '4', 
      title: 'Pulp Fiction', 
      description: 'The lives of two mob hitmen, a boxer, and a gangster intertwine.',
      image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 
      type: 'movie' as const, 
      year: 1994,
      director: 'Quentin Tarantino',
      cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
      trailer: 'https://www.youtube.com/watch?v=s7EdQ4FqbhY',
      stats: { highly: 2100, recommended: 567, not: 234 }
    },
    { 
      id: '5', 
      title: 'The Matrix', 
      description: 'A computer hacker learns about the true nature of reality.',
      image: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 
      type: 'movie' as const, 
      year: 1999,
      director: 'Wachowski Brothers',
      cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
      trailer: 'https://www.youtube.com/watch?v=vKQi3bBA1y8',
      stats: { highly: 1987, recommended: 654, not: 98 }
    },
  ]

  const trendingMusic = [
    { 
      id: '1', 
      title: 'Blinding Lights', 
      artist: 'The Weeknd', 
      description: 'A synthwave-inspired track that broke streaming records.',
      image: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9', 
      type: 'music' as const, 
      year: 2020,
      album: 'After Hours',
      duration: '3:20',
      stats: { highly: 3420, recommended: 1234, not: 234 }
    },
    { 
      id: '2', 
      title: 'Bohemian Rhapsody', 
      artist: 'Queen', 
      description: 'A revolutionary rock opera that defined a generation.',
      image: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8', 
      type: 'music' as const, 
      year: 1975,
      album: 'A Night at the Opera',
      duration: '5:55',
      stats: { highly: 2987, recommended: 876, not: 145 }
    },
    { 
      id: '3', 
      title: 'Shape of You', 
      artist: 'Ed Sheeran', 
      description: 'A catchy pop track about love and attraction.',
      image: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8', 
      type: 'music' as const, 
      year: 2017,
      album: '÷',
      duration: '3:53',
      stats: { highly: 2654, recommended: 987, not: 234 }
    },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleViewDetails = (item: any) => {
    setSelectedContent(item)
    setShowDetailsModal(true)
  }

  const filteredContent = activeTab === 'movies' ? trendingMovies : trendingMusic

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
            BADMOUTH
          </h1>
          <p className="text-gray-400 mb-6">Your AI-powered movie & music recommendation engine</p>
          <a href="/auth" className="inline-block px-8 py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold">
            Get Started
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md border-b border-gray-800' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH
              </h1>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-6">
                <button className="text-white font-medium">Home</button>
                <button 
                  onClick={() => setActiveTab('movies')}
                  className={`flex items-center gap-1 transition ${activeTab === 'movies' ? 'text-teal-500 border-b-2 border-teal-500 pb-1' : 'text-gray-300 hover:text-white'}`}
                >
                  <Film size={16} /> Movies
                </button>
                <button 
                  onClick={() => setActiveTab('music')}
                  className={`flex items-center gap-1 transition ${activeTab === 'music' ? 'text-teal-500 border-b-2 border-teal-500 pb-1' : 'text-gray-300 hover:text-white'}`}
                >
                  <Music size={16} /> Music
                </button>
                <button className="text-gray-300 hover:text-white flex items-center gap-1">
                  <Heart size={16} /> Watchlist
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button className="hidden md:block text-gray-300 hover:text-white">
                <Search size={20} />
              </button>
              <button className="text-gray-300 hover:text-white">
                <Bell size={20} />
              </button>
              <button className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white">
                <img 
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              </button>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden text-gray-300 hover:text-white"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gray-900 shadow-xl p-4">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-800 rounded-lg">
              <img 
                src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="text-sm font-semibold">{user.user_metadata?.username || user.email?.split('@')[0]}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setActiveTab('movies'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎬 Movies</button>
              <button onClick={() => { setActiveTab('music'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎵 Music</button>
              <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">❤️ Watchlist</button>
              <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">⚙️ Settings</button>
              <button onClick={signOut} className="w-full text-left p-3 text-red-500 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        <HeroCarousel onViewDetails={handleViewDetails} />
        <div className="container mx-auto px-4">
          {/* FIRST CONTENT ROW - FIXED: type converts 'movies' to 'movie' */}
          <ContentRow 
            title={activeTab === 'movies' ? "Trending Movies" : "Trending Music"}
            items={filteredContent}
            type={activeTab === 'movies' ? 'movie' : 'music'}
            onViewDetails={handleViewDetails}
          />
          
          <SocialRecommendations onViewDetails={handleViewDetails} />
          
          {/* SECOND CONTENT ROW - FIXED: type converts 'movies' to 'movie' */}
          <ContentRow 
            title={activeTab === 'movies' ? "Recommended for You" : "New Releases"}
            items={filteredContent.slice(0, 4)}
            type={activeTab === 'movies' ? 'movie' : 'music'}
            onViewDetails={handleViewDetails}
          />
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedContent.image} alt={selectedContent.title} className="w-full h-64 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{selectedContent.title}</h2>
              {selectedContent.artist && <p className="text-gray-400 mb-2">{selectedContent.artist}</p>}
              <p className="text-gray-300 mb-4">{selectedContent.description}</p>
              <div className="space-y-2 text-sm">
                {selectedContent.year && <p>📅 Year: {selectedContent.year}</p>}
                {selectedContent.director && <p>🎬 Director: {selectedContent.director}</p>}
                {selectedContent.cast && <p>⭐ Cast: {selectedContent.cast.join(', ')}</p>}
                {selectedContent.album && <p>💿 Album: {selectedContent.album}</p>}
                {selectedContent.duration && <p>⏱️ Duration: {selectedContent.duration}</p>}
              </div>
              {selectedContent.trailer && (
                <a href={selectedContent.trailer} target="_blank" rel="noopener noreferrer" 
                   className="mt-4 inline-block px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition">
                  ▶ Watch Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} onViewDetails={handleViewDetails} items={filteredContent} />
    </div>
  )
}
