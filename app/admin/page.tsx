'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Search, Bell, User, Menu, Film, Music, Home, Heart, Sparkles, X, LogOut, Filter, ExternalLink } from 'lucide-react'
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
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [showGenreFilter, setShowGenreFilter] = useState(false)
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [notifications, setNotifications] = useState<string[]>([])
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Data from Supabase
  const [categories, setCategories] = useState<any[]>([])
  const [allContent, setAllContent] = useState<any[]>([])
  const [contentByCategory, setContentByCategory] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // Available genres for filtering
  const genres = ['all', 'Action', 'Drama', 'Sci-Fi', 'Pop', 'Rock', 'Thriller']

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) setWatchlist(JSON.parse(saved))
  }, [])

  // Load data from Supabase
  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    
    // Load categories for current tab
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('type', activeTab)
      .eq('is_active', true)
      .order('display_order')
    
    setCategories(categoriesData || [])
    
    // Load content for current tab
    const { data: contentData } = await supabase
      .from('content')
      .select('*')
      .eq('type', activeTab)
    
    setAllContent(contentData || [])
    
    // Load content-category relationships
    const { data: relations } = await supabase
      .from('content_categories')
      .select('*')
    
    // Organize content by category
    const byCategory: Record<string, any[]> = {}
    for (const category of categoriesData || []) {
      const contentIds = relations?.filter(r => r.category_id === category.id).map(r => r.content_id) || []
      byCategory[category.name] = contentData?.filter(c => contentIds.includes(c.id)) || []
    }
    setContentByCategory(byCategory)
    
    setLoading(false)
  }

  const addToWatchlist = (item: any) => {
    if (watchlist.some(i => i.id === item.id)) {
      const newWatchlist = watchlist.filter(i => i.id !== item.id)
      setWatchlist(newWatchlist)
      localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
      setNotifications([`Removed "${item.title}" from watchlist`, ...notifications.slice(0, 4)])
    } else {
      const newWatchlist = [...watchlist, item]
      setWatchlist(newWatchlist)
      localStorage.setItem('badmouth_watchlist', JSON.stringify(newWatchlist))
      setNotifications([`✨ "${item.title}" added to watchlist!`, ...notifications.slice(0, 4)])
    }
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
  }

  const isInWatchlist = (id: string) => watchlist.some(i => i.id === id)

  // Filter content by search and genre
  const getFilteredContent = () => {
    let filtered = [...allContent]
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.artist && item.artist.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(item => item.genre === selectedGenre)
    }
    return filtered
  }

  const handleViewDetails = (item: any) => {
    setSelectedContent(item)
    setShowDetailsModal(true)
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  const filteredContent = getFilteredContent()

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
                  <button onClick={() => addToWatchlist(item)} className="text-red-500 text-xs">Remove</button>
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

              {/* Genre Filter */}
              <div className="relative">
                <button onClick={() => setShowGenreFilter(!showGenreFilter)} className="text-gray-300 hover:text-white flex items-center gap-1">
                  <Filter size={18} /> <span className="text-xs hidden md:inline">Genre</span>
                </button>
                {showGenreFilter && (
                  <div className="absolute top-8 right-0 w-48 bg-gray-900 rounded-xl shadow-xl border border-gray-700 z-50">
                    <div className="p-2">
                      {genres.map(genre => (
                        <button key={genre} onClick={() => { setSelectedGenre(genre); setShowGenreFilter(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-800 ${selectedGenre === genre ? 'text-green-500' : 'text-gray-300'}`}>
                          {genre === 'all' ? 'All Genres' : genre}
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
        {/* Hero Carousel - first 3 items */}
        <HeroCarousel items={allContent.slice(0, 3)} onViewDetails={handleViewDetails} activeTab={activeTab} />
        
        <div className="container mx-auto px-4">
          {/* Dynamic Categories from Database */}
          {categories.map((category) => (
            <ContentRow 
              key={category.id}
              title={category.name}
              items={contentByCategory[category.name] || []}
              type={activeTab}
              onViewDetails={handleViewDetails}
              onAddToWatchlist={addToWatchlist}
              onRemoveFromWatchlist={addToWatchlist}
              isInWatchlist={isInWatchlist}
            />
          ))}
          
          {/* Search Results */}
          {searchQuery && filteredContent.length > 0 && (
            <ContentRow 
              title={`Search Results for "${searchQuery}"`}
              items={filteredContent}
              type={activeTab}
              onViewDetails={handleViewDetails}
              onAddToWatchlist={addToWatchlist}
              onRemoveFromWatchlist={addToWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )}
          
          {/* Community Recommendations */}
          <SocialRecommendations onViewDetails={handleViewDetails} activeTab={activeTab} />
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedContent.backdrop_url || selectedContent.image_url} alt={selectedContent.title} className="w-full h-48 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-bold mb-1">{selectedContent.title}</h2>
              {selectedContent.artist && <p className="text-gray-400 mb-3">{selectedContent.artist}</p>}
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">{selectedContent.long_description || selectedContent.description}</p>
              
              {/* Stats with Labels */}
              <div className="flex gap-6 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-center"><div className="text-2xl text-green-500">🔥</div><div className="text-xs text-gray-400 mt-1">HIGHLY RECOMMENDED</div><div className="font-bold">{selectedContent.stats_highly || 0}</div></div>
                <div className="text-center"><div className="text-2xl text-blue-500">👍</div><div className="text-xs text-gray-400 mt-1">RECOMMENDED</div><div className="font-bold">{selectedContent.stats_recommended || 0}</div></div>
                <div className="text-center"><div className="text-2xl text-gray-500">👎</div><div className="text-xs text-gray-400 mt-1">NOT RECOMMENDED</div><div className="font-bold">{selectedContent.stats_not || 0}</div></div>
              </div>
              
              {/* Where to Watch / Listen */}
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
              {selectedContent.type === 'movie' && selectedContent.director && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎬 Director:</span> {selectedContent.director}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Runtime:</span> {selectedContent.runtime || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedContent.genre}</div>
                  {selectedContent.actors && selectedContent.actors.length > 0 && (
                    <div className="col-span-2"><span className="text-gray-400">⭐ Cast:</span> {selectedContent.actors.join(', ')}</div>
                  )}
                </div>
              )}
              
              {/* Music Details */}
              {selectedContent.type === 'music' && selectedContent.artist && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎤 Artist:</span> {selectedContent.artist}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Duration:</span> {selectedContent.duration || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedContent.genre}</div>
                </div>
              )}
              
              {/* Trailer */}
              {selectedContent.trailer_url && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">▶️ Watch Trailer</h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe src={selectedContent.trailer_url} title={selectedContent.title} className="w-full h-full" allowFullScreen />
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
