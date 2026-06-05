'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Search, Bell, User, Menu, Film, Music, Home, Heart, Sparkles, X, LogOut, Plus, Filter } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import ContentRow from '@/components/ContentRow'
import SocialRecommendations from '@/components/SocialRecommendations'
import MobileNav from '@/components/MobileNav'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'movie' | 'music'>('movie')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string>('all')
  const [showMoodFilter, setShowMoodFilter] = useState(false)
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [notifications, setNotifications] = useState<string[]>([])
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Mood options
  const moods = ['all', 'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Romance', 'Horror', 'Thriller', 'Pop', 'Rock', 'Hip Hop', 'Jazz']

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) setWatchlist(JSON.parse(saved))
  }, [])

  const addToWatchlist = (item: any) => {
    const newWatchlist = [...watchlist, item]
    setWatchlist(newWatchlist)
    localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
    setNotifications([`✨ "${item.title}" added to watchlist!`, ...notifications.slice(0, 4)])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
  }

  const removeFromWatchlist = (id: string) => {
    const newWatchlist = watchlist.filter(i => i.id !== id)
    setWatchlist(newWatchlist)
    localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
    setNotifications([`Removed from watchlist`, ...notifications.slice(0, 4)])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
  }

  const isInWatchlist = (id: string) => watchlist.some(i => i.id === id)

  // Complete movie database
  const moviesDB = [
    { 
      id: '1', 
      title: 'The Dark Knight', 
      description: 'Batman faces the Joker in Gotham City.',
      longDescription: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests of his ability to fight injustice.',
      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      type: 'movie' as const, 
      year: 2008,
      director: 'Christopher Nolan',
      cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'],
      platforms: ['Netflix', 'Max', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/EXeTwQWrcwY',
      runtime: '2h 32min',
      rating: 'PG-13',
      genre: 'Action',
      stats: { highly: 2340, recommended: 890, not: 123 },
      mood: ['Dark', 'Intense', 'Action']
    },
    { 
      id: '2', 
      title: 'Inception', 
      description: 'A thief who steals secrets through dream-sharing.',
      longDescription: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
      image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      type: 'movie' as const, 
      year: 2010,
      director: 'Christopher Nolan',
      cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'],
      platforms: ['Netflix', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/YoHD9XEInc0',
      runtime: '2h 28min',
      rating: 'PG-13',
      genre: 'Sci-Fi',
      stats: { highly: 1890, recommended: 654, not: 89 },
      mood: ['Mind-bending', 'Thriller', 'Action']
    },
    { 
      id: '3', 
      title: 'Interstellar', 
      description: 'A team explores a wormhole in space.',
      longDescription: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.',
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      type: 'movie' as const, 
      year: 2014,
      director: 'Christopher Nolan',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
      platforms: ['Prime Video', 'Paramount+'],
      trailer: 'https://www.youtube.com/embed/zSWdZVtXT7E',
      runtime: '2h 49min',
      rating: 'PG-13',
      genre: 'Sci-Fi',
      stats: { highly: 1567, recommended: 723, not: 67 },
      mood: ['Emotional', 'Sci-Fi', 'Adventure']
    },
    { 
      id: '4', 
      title: 'Parasite', 
      description: 'A dark Korean thriller about class struggle.',
      longDescription: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
      image: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      type: 'movie' as const, 
      year: 2019,
      director: 'Bong Joon-ho',
      cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'],
      platforms: ['Hulu', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/5xH0HfJHsaY',
      runtime: '2h 12min',
      rating: 'R',
      genre: 'Drama',
      stats: { highly: 2456, recommended: 789, not: 45 },
      mood: ['Dark', 'Thought-provoking', 'Drama']
    },
    { 
      id: '5', 
      title: 'Train to Busan', 
      description: 'Korean zombie action horror on a train.',
      longDescription: 'While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan.',
      image: 'https://image.tmdb.org/t/p/w500/1pHHp7N49XHkxCEMZwG9pEqN4T5.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/1pHHp7N49XHkxCEMZwG9pEqN4T5.jpg',
      type: 'movie' as const, 
      year: 2016,
      director: 'Yeon Sang-ho',
      cast: ['Gong Yoo', 'Jung Yu-mi', 'Ma Dong-seok'],
      platforms: ['Netflix', 'Shudder'],
      trailer: 'https://www.youtube.com/embed/7hmJfVq8w08',
      runtime: '1h 58min',
      rating: 'Not Rated',
      genre: 'Horror',
      stats: { highly: 1876, recommended: 543, not: 98 },
      mood: ['Intense', 'Scary', 'Emotional']
    },
  ]

  // Custom categories for movies
  const movieCategories = {
    'Trending Movies': moviesDB,
    'Korean Movie Lovers': moviesDB.filter(m => m.title === 'Parasite' || m.title === 'Train to Busan'),
    'Sci-Fi Adventures': moviesDB.filter(m => m.genre === 'Sci-Fi'),
    'Action Packed': moviesDB.filter(m => m.genre === 'Action'),
  }

  // Complete music database
  const musicDB = [
    { 
      id: '1', 
      title: 'Blinding Lights', 
      artist: 'The Weeknd', 
      description: 'A synthwave track that broke records.',
      longDescription: 'A synthwave track that became one of the best-selling singles of all time.',
      image: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9',
      type: 'music' as const, 
      year: 2020,
      artistInfo: 'The Weeknd is a Canadian singer and songwriter.',
      producers: ['Max Martin', 'Oscar Holter'],
      writers: ['Abel Tesfaye', 'Max Martin', 'Oscar Holter'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/4NRXx6U8ABQ',
      duration: '3:20',
      genre: 'Pop',
      stats: { highly: 3420, recommended: 1234, not: 234 },
      mood: ['Energetic', 'Synthwave', 'Pop']
    },
    { 
      id: '2', 
      title: 'Bohemian Rhapsody', 
      artist: 'Queen', 
      description: 'A revolutionary rock opera.',
      longDescription: 'A six-minute suite consisting of several sections without a chorus.',
      image: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8',
      type: 'music' as const, 
      year: 1975,
      artistInfo: 'Queen are a British rock band formed in London.',
      producers: ['Roy Thomas Baker', 'Queen'],
      writers: ['Freddie Mercury'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/fJ9rUzIMcZQ',
      duration: '5:55',
      genre: 'Rock',
      stats: { highly: 2987, recommended: 876, not: 145 },
      mood: ['Rock', 'Operatic', 'Classic']
    },
    { 
      id: '3', 
      title: 'Shape of You', 
      artist: 'Ed Sheeran', 
      description: 'A catchy pop track about love.',
      longDescription: 'A pop and dancehall track that became one of the best-selling digital singles.',
      image: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8',
      type: 'music' as const, 
      year: 2017,
      artistInfo: 'Ed Sheeran is an English singer-songwriter.',
      producers: ['Ed Sheeran', 'Steve Mac'],
      writers: ['Ed Sheeran', 'Steve Mac'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/JGwWNGJdvx8',
      duration: '3:53',
      genre: 'Pop',
      stats: { highly: 2654, recommended: 987, not: 234 },
      mood: ['Pop', 'Dance', 'Romantic']
    },
  ]

  // Custom categories for music
  const musicCategories = {
    'Trending Music': musicDB,
    'Pop Hits': musicDB.filter(m => m.genre === 'Pop'),
    'Rock Classics': musicDB.filter(m => m.genre === 'Rock'),
  }

  // Get filtered content based on search and mood
  const getFilteredContent = () => {
    const content = activeTab === 'movie' ? moviesDB : musicDB
    let filtered = content
    
    if (searchQuery) {
      filtered = filtered.filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesArtist = 'artist' in item && item.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTitle || matchesArtist
      })
    }
    
    if (selectedMood !== 'all') {
      filtered = filtered.filter(item => item.genre === selectedMood || item.mood.includes(selectedMood))
    }
    
    return filtered
  }

  const handleViewDetails = (item: any) => {
    setSelectedContent(item)
    setShowDetailsModal(true)
  }

  const categories = activeTab === 'movie' ? movieCategories : musicCategories

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
            BADMOUTH
          </h1>
          <p className="text-gray-400 mb-6">Your AI-powered movie & music recommendation engine</p>
          <a href="/auth" className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg font-semibold">
            Get Started
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-gray-900 rounded-xl shadow-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No notifications yet</p>
            ) : (
              notifications.map((notif, i) => (
                <div key={i} className="p-3 border-b border-gray-800 text-sm">{notif}</div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Watchlist Panel */}
      {showWatchlist && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-gray-900 rounded-xl shadow-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">My Watchlist ({watchlist.length})</h3>
            <button onClick={() => setShowWatchlist(false)}><X size={16} /></button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {watchlist.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Your watchlist is empty</p>
            ) : (
              watchlist.map((item) => (
                <div key={item.id} className="p-3 border-b border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.type}</p>
                  </div>
                  <button onClick={() => removeFromWatchlist(item.id)} className="text-red-500 text-xs">Remove</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Profile Panel */}
      {showProfile && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-gray-900 rounded-xl shadow-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">Profile</h3>
            <button onClick={() => setShowProfile(false)}><X size={16} /></button>
          </div>
          <div className="p-4 text-center">
            <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-20 h-20 rounded-full mx-auto mb-3" />
            <h4 className="font-semibold">{user.user_metadata?.username || user.email?.split('@')[0]}</h4>
            <p className="text-xs text-gray-400 mb-3">{user.email}</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-800 rounded-lg p-2">
                <p className="text-xl font-bold">{watchlist.length}</p>
                <p className="text-xs text-gray-400">Watchlist</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <p className="text-xl font-bold">0</p>
                <p className="text-xs text-gray-400">Recommendations</p>
              </div>
            </div>
            <button onClick={signOut} className="w-full mt-4 py-2 bg-red-600 rounded-lg text-sm">Sign Out</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md border-b border-gray-800' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
                BADMOUTH
              </button>
              
              <nav className="hidden md:flex gap-6">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-white font-medium">Home</button>
                <button onClick={() => setActiveTab('movie')} className={`flex items-center gap-1 transition ${activeTab === 'movie' ? 'text-green-500 border-b-2 border-green-500 pb-1' : 'text-gray-300 hover:text-white'}`}>
                  <Film size={16} /> Movies
                </button>
                <button onClick={() => setActiveTab('music')} className={`flex items-center gap-1 transition ${activeTab === 'music' ? 'text-green-500 border-b-2 border-green-500 pb-1' : 'text-gray-300 hover:text-white'}`}>
                  <Music size={16} /> Music
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                {showSearch ? (
                  <div className="flex items-center">
                    <input type="text" placeholder="Search movies or music..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-1 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-sm w-48 md:w-64" autoFocus />
                    <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 text-gray-400 hover:text-white"><X size={18} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowSearch(true)} className="text-gray-300 hover:text-white"><Search size={20} /></button>
                )}
              </div>

              {/* Mood Filter */}
              <div className="relative">
                <button onClick={() => setShowMoodFilter(!showMoodFilter)} className="text-gray-300 hover:text-white flex items-center gap-1">
                  <Filter size={18} /> <span className="text-xs hidden md:inline">Filter</span>
                </button>
                {showMoodFilter && (
                  <div className="absolute top-8 right-0 w-48 bg-gray-900 rounded-xl shadow-xl border border-gray-700 z-50">
                    <div className="p-2">
                      {moods.map(mood => (
                        <button key={mood} onClick={() => { setSelectedMood(mood); setShowMoodFilter(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-800 ${selectedMood === mood ? 'text-green-500' : 'text-gray-300'}`}>
                          {mood === 'all' ? 'All Genres' : mood}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button onClick={() => setShowNotifications(true)} className="text-gray-300 hover:text-white relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              
              <button onClick={() => setShowWatchlist(true)} className="text-gray-300 hover:text-white relative">
                <Heart size={20} />
                {watchlist.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[10px] flex items-center justify-center">{watchlist.length}</span>}
              </button>
              
              <button onClick={() => setShowProfile(true)} className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white">
                <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-8 h-8 rounded-full" />
              </button>
              
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-300 hover:text-white"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gray-900 shadow-xl p-4">
            <div className="flex justify-between items-center mb-6"><span className="text-lg font-bold">Menu</span><button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button></div>
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-800 rounded-lg">
              <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-10 h-10 rounded-full" />
              <div><div className="text-sm font-semibold">{user.user_metadata?.username || user.email?.split('@')[0]}</div><div className="text-xs text-gray-400">{user.email}</div></div>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setActiveTab('movie'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎬 Movies</button>
              <button onClick={() => { setActiveTab('music'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎵 Music</button>
              <button onClick={() => { setShowWatchlist(true); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">❤️ Watchlist ({watchlist.length})</button>
              <button onClick={() => { setShowProfile(true); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">👤 Profile</button>
              <button onClick={() => { setShowNotifications(true); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🔔 Notifications</button>
              <button onClick={signOut} className="w-full text-left p-3 text-red-500 hover:bg-gray-800 rounded-lg flex items-center gap-2"><LogOut size={16} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        <HeroCarousel items={(activeTab === 'movie' ? moviesDB : musicDB).slice(0, 3)} onViewDetails={handleViewDetails} activeTab={activeTab} />
        
        <div className="container mx-auto px-4">
          {/* Dynamic Categories */}
          {Object.entries(categories).map(([categoryTitle, items]) => (
            <ContentRow 
              key={categoryTitle}
              title={categoryTitle}
              items={items as any[]}
              type={activeTab}
              onViewDetails={handleViewDetails}
              onAddToWatchlist={addToWatchlist}
              onRemoveFromWatchlist={removeFromWatchlist}
              isInWatchlist={isInWatchlist}
            />
          ))}
          
          <SocialRecommendations onViewDetails={handleViewDetails} activeTab={activeTab} />
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedContent.backdrop || selectedContent.image} alt={selectedContent.title} className="w-full h-48 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-bold mb-1">{selectedContent.title}</h2>
              {'artist' in selectedContent && <p className="text-gray-400 mb-3">{selectedContent.artist}</p>}
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">{selectedContent.longDescription || selectedContent.description}</p>
              
              {/* Stats with Labels */}
              <div className="flex gap-6 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-center"><div className="text-2xl text-green-500">🔥</div><div className="text-xs text-gray-400 mt-1">HIGHLY RECOMMENDED</div><div className="font-bold">{selectedContent.stats.highly}</div></div>
                <div className="text-center"><div className="text-2xl text-blue-500">👍</div><div className="text-xs text-gray-400 mt-1">RECOMMENDED</div><div className="font-bold">{selectedContent.stats.recommended}</div></div>
                <div className="text-center"><div className="text-2xl text-gray-500">👎</div><div className="text-xs text-gray-400 mt-1">NOT RECOMMENDED</div><div className="font-bold">{selectedContent.stats.not}</div></div>
              </div>
              
              {/* Where to Watch / Listen - WITH LABEL */}
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">{selectedContent.type === 'movie' ? '📺 Where to Watch' : '🎧 Where to Listen'}</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.platforms?.map((platform: string, idx: number) => (
                    <button key={idx} className="px-4 py-2 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2">
                      {platform} <ExternalLink size={12} />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Movie Details */}
              {selectedContent.type === 'movie' && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎬 Director:</span> {selectedContent.director}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Runtime:</span> {selectedContent.runtime}</div>
                  <div><span className="text-gray-400">🎭 Rating:</span> {selectedContent.rating}</div>
                </div>
              )}
              
              {/* Music Details */}
              {'artist' in selectedContent && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎤 Artist:</span> {selectedContent.artist}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Duration:</span> {selectedContent.duration}</div>
                  <div><span className="text-gray-400">🎵 Producers:</span> {selectedContent.producers?.join(', ')}</div>
                </div>
              )}
              
              {/* Trailer */}
              {(selectedContent.trailer || selectedContent.video) && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">▶️ Watch Trailer</h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe src={selectedContent.trailer || selectedContent.video} title={selectedContent.title} className="w-full h-full" allowFullScreen />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} onViewDetails={handleViewDetails} items={getFilteredContent()} />
    </div>
  )
}
