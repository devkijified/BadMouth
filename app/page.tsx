'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Search, Bell, User, Menu, Film, Music, Home as HomeIcon, Heart, Sparkles, X, LogOut, Play, Info, ExternalLink, Star } from 'lucide-react'
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
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [notifications, setNotifications] = useState<string[]>([])

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) setWatchlist(JSON.parse(saved))
  }, [])

  const addToWatchlist = (id: string) => {
    const newWatchlist = [...watchlist, id]
    setWatchlist(newWatchlist)
    localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
    setNotifications([`Added to watchlist!`, ...notifications.slice(0, 4)])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
  }

  const removeFromWatchlist = (id: string) => {
    const newWatchlist = watchlist.filter(i => i !== id)
    setWatchlist(newWatchlist)
    localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
  }

  const isInWatchlist = (id: string) => watchlist.includes(id)

  // Complete movie database
  const moviesDB = [
    { 
      id: '1', 
      title: 'The Dark Knight', 
      description: 'Batman faces the Joker in Gotham City. A masterpiece of action and drama.',
      longDescription: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      type: 'movie', 
      year: 2008,
      director: 'Christopher Nolan',
      cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Gary Oldman'],
      platforms: ['Netflix', 'Max', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/EXeTwQWrcwY',
      runtime: '2h 32min',
      rating: 'PG-13',
      stats: { highly: 2340, recommended: 890, not: 123 },
      mood: ['Dark', 'Intense', 'Action']
    },
    { 
      id: '2', 
      title: 'Inception', 
      description: 'A thief who steals corporate secrets through dream-sharing technology.',
      longDescription: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
      image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      type: 'movie', 
      year: 2010,
      director: 'Christopher Nolan',
      cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy', 'Ken Watanabe'],
      platforms: ['Netflix', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/YoHD9XEInc0',
      runtime: '2h 28min',
      rating: 'PG-13',
      stats: { highly: 1890, recommended: 654, not: 89 },
      mood: ['Mind-bending', 'Thriller', 'Action']
    },
    { 
      id: '3', 
      title: 'Interstellar', 
      description: 'A team of explorers travel through a wormhole in space.',
      longDescription: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.',
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      type: 'movie', 
      year: 2014,
      director: 'Christopher Nolan',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
      platforms: ['Prime Video', 'Paramount+'],
      trailer: 'https://www.youtube.com/embed/zSWdZVtXT7E',
      runtime: '2h 49min',
      rating: 'PG-13',
      stats: { highly: 1567, recommended: 723, not: 67 },
      mood: ['Emotional', 'Sci-Fi', 'Adventure']
    },
    { 
      id: '4', 
      title: 'Pulp Fiction', 
      description: 'The lives of two mob hitmen, a boxer, and a gangster intertwine.',
      longDescription: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
      image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      type: 'movie', 
      year: 1994,
      director: 'Quentin Tarantino',
      cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson', 'Bruce Willis'],
      platforms: ['Netflix', 'Paramount+'],
      trailer: 'https://www.youtube.com/embed/s7EdQ4FqbhY',
      runtime: '2h 34min',
      rating: 'R',
      stats: { highly: 2100, recommended: 567, not: 234 },
      mood: ['Crime', 'Dark Comedy', 'Iconic']
    },
    { 
      id: '5', 
      title: 'The Matrix', 
      description: 'A computer hacker learns about the true nature of reality.',
      longDescription: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
      image: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      type: 'movie', 
      year: 1999,
      director: 'The Wachowskis',
      cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
      platforms: ['Max', 'Prime Video'],
      trailer: 'https://www.youtube.com/embed/vKQi3bBA1y8',
      runtime: '2h 16min',
      rating: 'R',
      stats: { highly: 1987, recommended: 654, not: 98 },
      mood: ['Sci-Fi', 'Action', 'Mind-bending']
    },
  ]

  // Complete music database
  const musicDB = [
    { 
      id: '1', 
      title: 'Blinding Lights', 
      artist: 'The Weeknd', 
      description: 'A synthwave-inspired track that broke streaming records.',
      longDescription: 'A synthwave and new wave track that became one of the best-selling singles of all time, known for its driving beat and nostalgic 80s sound.',
      image: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9',
      type: 'music', 
      year: 2020,
      artistInfo: 'The Weeknd (Abel Tesfaye) is a Canadian singer, songwriter, and record producer.',
      producers: ['Max Martin', 'Oscar Holter', 'The Weeknd'],
      writers: ['Abel Tesfaye', 'Ahmad Balshe', 'Jason Quenneville', 'Max Martin', 'Oscar Holter'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/4NRXx6U8ABQ',
      duration: '3:20',
      stats: { highly: 3420, recommended: 1234, not: 234 },
      mood: ['Energetic', 'Synthwave', 'Pop']
    },
    { 
      id: '2', 
      title: 'Bohemian Rhapsody', 
      artist: 'Queen', 
      description: 'A revolutionary rock opera that defined a generation.',
      longDescription: 'A six-minute suite, consisting of several sections without a chorus: an intro, a ballad segment, an operatic passage, a hard rock part and a reflective coda.',
      image: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8',
      type: 'music', 
      year: 1975,
      artistInfo: 'Queen are a British rock band formed in London in 1970.',
      producers: ['Roy Thomas Baker', 'Queen'],
      writers: ['Freddie Mercury'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/fJ9rUzIMcZQ',
      duration: '5:55',
      stats: { highly: 2987, recommended: 876, not: 145 },
      mood: ['Rock', 'Operatic', 'Classic']
    },
    { 
      id: '3', 
      title: 'Shape of You', 
      artist: 'Ed Sheeran', 
      description: 'A catchy pop track about love and attraction.',
      longDescription: 'A pop and dancehall track that became one of the best-selling digital singles of all time.',
      image: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8',
      backdrop: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8',
      type: 'music', 
      year: 2017,
      artistInfo: 'Ed Sheeran is an English singer-songwriter.',
      producers: ['Ed Sheeran', 'Steve Mac', 'Johnny McDaid'],
      writers: ['Ed Sheeran', 'Steve Mac', 'Johnny McDaid'],
      platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
      video: 'https://www.youtube.com/embed/JGwWNGJdvx8',
      duration: '3:53',
      stats: { highly: 2654, recommended: 987, not: 234 },
      mood: ['Pop', 'Dance', 'Romantic']
    },
  ]

  // Get filtered content based on search - FIXED: Type-safe search
  const getFilteredContent = () => {
    const content = activeTab === 'movie' ? moviesDB : musicDB
    if (!searchQuery) return content
    
    return content.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(searchQuery.toLowerCase())
      // Only check artist if it's a music item (has artist property)
      const matchesArtist = 'artist' in item && item.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesTitle || matchesArtist
    })
  }

  const handleViewDetails = (item: any) => {
    setSelectedContent(item)
    setShowDetailsModal(true)
  }

  const getMoviesByCast = (actorName: string) => {
    return moviesDB.filter(movie => movie.cast.includes(actorName))
  }

  const getMusicByArtist = (artistName: string) => {
    return musicDB.filter(song => song.artist === artistName)
  }

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

  const filteredContent = getFilteredContent()

  return (
    <div className="min-h-screen bg-black">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notif, i) => (
            <div key={i} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn">
              {notif}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md border-b border-gray-800' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
                BADMOUTH
              </h1>
              
              <nav className="hidden md:flex gap-6">
                <button className="text-white font-medium">Home</button>
                <button 
                  onClick={() => setActiveTab('movie')}
                  className={`flex items-center gap-1 transition ${activeTab === 'movie' ? 'text-green-500 border-b-2 border-green-500 pb-1' : 'text-gray-300 hover:text-white'}`}
                >
                  <Film size={16} /> Movies
                </button>
                <button 
                  onClick={() => setActiveTab('music')}
                  className={`flex items-center gap-1 transition ${activeTab === 'music' ? 'text-green-500 border-b-2 border-green-500 pb-1' : 'text-gray-300 hover:text-white'}`}
                >
                  <Music size={16} /> Music
                </button>
                <button className="text-gray-300 hover:text-white flex items-center gap-1">
                  <Heart size={16} /> Watchlist ({watchlist.length})
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                {showSearch ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Search movies or music..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-1 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-sm w-48 md:w-64"
                      autoFocus
                    />
                    <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 text-gray-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowSearch(true)} className="text-gray-300 hover:text-white">
                    <Search size={20} />
                  </button>
                )}
              </div>
              
              <button className="text-gray-300 hover:text-white relative">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              
              <button className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white">
                <img 
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              </button>
              
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-300 hover:text-white">
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
              <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-10 h-10 rounded-full" />
              <div>
                <div className="text-sm font-semibold">{user.user_metadata?.username || user.email?.split('@')[0]}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setActiveTab('movie'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎬 Movies</button>
              <button onClick={() => { setActiveTab('music'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎵 Music</button>
              <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">❤️ Watchlist ({watchlist.length})</button>
              <button className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">⚙️ Settings</button>
              <button onClick={signOut} className="w-full text-left p-3 text-red-500 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        <HeroCarousel 
          items={activeTab === 'movie' ? moviesDB.slice(0, 3) : musicDB.slice(0, 3)}
          onViewDetails={handleViewDetails}
          activeTab={activeTab}
        />
        
        <div className="container mx-auto px-4">
          <ContentRow 
            title={activeTab === 'movie' ? "Trending Movies" : "Trending Music"}
            items={filteredContent}
            type={activeTab}
            onViewDetails={handleViewDetails}
            onAddToWatchlist={addToWatchlist}
            onRemoveFromWatchlist={removeFromWatchlist}
            isInWatchlist={isInWatchlist}
          />
          
          <SocialRecommendations 
            onViewDetails={handleViewDetails}
            activeTab={activeTab}
          />
          
          <ContentRow 
            title={activeTab === 'movie' ? "Recommended for You" : "New Releases"}
            items={filteredContent.slice(0, 4)}
            type={activeTab}
            onViewDetails={handleViewDetails}
            onAddToWatchlist={addToWatchlist}
            onRemoveFromWatchlist={removeFromWatchlist}
            isInWatchlist={isInWatchlist}
          />
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedContent.backdrop || selectedContent.image} alt={selectedContent.title} className="w-full h-64 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedContent.title}</h2>
                  {'artist' in selectedContent && <p className="text-gray-400 mb-2">{selectedContent.artist}</p>}
                </div>
                <button
                  onClick={() => isInWatchlist(selectedContent.id) ? removeFromWatchlist(selectedContent.id) : addToWatchlist(selectedContent.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isInWatchlist(selectedContent.id) ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <Heart size={16} className={isInWatchlist(selectedContent.id) ? 'fill-white' : ''} />
                  {isInWatchlist(selectedContent.id) ? 'In Watchlist' : 'Add to Watchlist'}
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-4 my-4">
                <div className="flex items-center gap-1"><span className="text-green-500 text-lg">🔥</span> <span>{selectedContent.stats.highly} Highly Recommend</span></div>
                <div className="flex items-center gap-1"><span className="text-blue-500 text-lg">👍</span> <span>{selectedContent.stats.recommended} Recommend</span></div>
                <div className="flex items-center gap-1"><span className="text-gray-500 text-lg">👎</span> <span>{selectedContent.stats.not} Not Recommend</span></div>
              </div>
              
              <p className="text-gray-300 mb-4">{selectedContent.longDescription || selectedContent.description}</p>
              
              {/* Movie Details */}
              {selectedContent.type === 'movie' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
                  <div><span className="text-gray-400">🎬 Director:</span> {selectedContent.director}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Runtime:</span> {selectedContent.runtime}</div>
                  <div><span className="text-gray-400">🎭 Rating:</span> {selectedContent.rating}</div>
                </div>
              )}
              
              {/* Music Details */}
              {'artist' in selectedContent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
                  <div><span className="text-gray-400">🎤 Artist:</span> {selectedContent.artist}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Duration:</span> {selectedContent.duration}</div>
                  <div><span className="text-gray-400">🎵 Producers:</span> {selectedContent.producers?.join(', ')}</div>
                </div>
              )}
              
              {/* Cast / Artists - Clickable */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{selectedContent.type === 'movie' ? '⭐ Cast' : '🎤 Artists & Writers'}</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedContent.cast || selectedContent.writers || []).map((person: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const related = selectedContent.type === 'movie' ? getMoviesByCast(person) : getMusicByArtist(person)
                        if (related.length > 0) {
                          alert(`Found ${related.length} ${selectedContent.type === 'movie' ? 'movies' : 'songs'} featuring ${person}`)
                        }
                      }}
                      className="px-3 py-1 bg-gray-800 rounded-full text-sm hover:bg-gray-700 transition"
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Where to Watch / Listen */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{selectedContent.type === 'movie' ? '📺 Where to Watch' : '🎧 Where to Listen'}</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.platforms?.map((platform: string, idx: number) => (
                    <button key={idx} className="px-3 py-1 bg-green-600 rounded-lg text-sm hover:bg-green-700 transition">
                      {platform} →
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Trailer / Video */}
              {(selectedContent.trailer || selectedContent.video) && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">▶️ Trailer</h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={selectedContent.trailer || selectedContent.video}
                      title={selectedContent.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              {/* Mood Tags */}
              {selectedContent.mood && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">🎭 Mood Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent.mood.map((tag: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-gray-800 rounded-full text-sm">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} onViewDetails={handleViewDetails} items={filteredContent} />
    </div>
  )
}
