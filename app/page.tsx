'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Bell, User, Menu, Film, Music, Home, Heart, Sparkles, X, LogOut, Filter, Shield, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HeroCarousel from '@/components/HeroCarousel'
import ContentRow from '@/components/ContentRow'
import SocialRecommendations from '@/components/SocialRecommendations'
import MobileNav from '@/components/MobileNav'
import SearchModal from '@/components/SearchModal'
import RecommendModal from '@/components/RecommendModal'
import HomeFeed from '@/components/HomeFeed'
import TrendingBar from '@/components/TrendingBar'
import QuickStats from '@/components/QuickStats'
import WatchlistBasedRecommendations from '@/components/WatchlistBasedRecommendations'
import { ContentItem, Category } from '@/types/content'
import toast from 'react-hot-toast'

export default function HomePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState<'home' | 'movies' | 'music'>('home')
  const [activeTab, setActiveTab] = useState<'movie' | 'music'>('movie')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [showGenreFilter, setShowGenreFilter] = useState(false)
  const [watchlist, setWatchlist] = useState<ContentItem[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<string[]>([])
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [recommendItem, setRecommendItem] = useState<ContentItem | null>(null)
  
  // Data from Supabase
  const [categories, setCategories] = useState<Category[]>([])
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [contentByCategory, setContentByCategory] = useState<Record<string, ContentItem[]>>({})
  const [loading, setLoading] = useState(true)

  // Data for Home page (movies + music combined)
  const [homeMovies, setHomeMovies] = useState<ContentItem[]>([])
  const [homeMusic, setHomeMusic] = useState<ContentItem[]>([])
  const [homeLoading, setHomeLoading] = useState(true)

  const genres = ['all', 'Action', 'Drama', 'Sci-Fi', 'Pop', 'Rock', 'Thriller', 'Hip Hop', 'R&B', 'Electronic', 'Jazz']

  const closeAllPanels = () => {
    setShowWatchlist(false)
    setShowProfile(false)
    setShowNotifications(false)
  }

  const toggleWatchlist = () => {
    if (showWatchlist) {
      setShowWatchlist(false)
    } else {
      setShowProfile(false)
      setShowNotifications(false)
      setShowWatchlist(true)
    }
  }

  const toggleProfile = () => {
    if (showProfile) {
      setShowProfile(false)
    } else {
      setShowWatchlist(false)
      setShowNotifications(false)
      setShowProfile(true)
    }
  }

  const toggleNotifications = () => {
    if (showNotifications) {
      setShowNotifications(false)
    } else {
      setShowWatchlist(false)
      setShowProfile(false)
      setShowNotifications(true)
    }
  }

  // Load watchlist from Supabase
  const loadWatchlistFromSupabase = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('watchlist')
      .select('content_id')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error loading watchlist:', error)
      return
    }
    
    if (data && data.length > 0) {
      const contentIds = data.map(item => item.content_id)
      const { data: contentData } = await supabase
        .from('content')
        .select('*')
        .in('id', contentIds)
      
      if (contentData) {
        setWatchlist(contentData)
        const idsSet = new Set<string>()
        contentData.forEach(item => idsSet.add(item.id))
        setWatchlistIds(idsSet)
      }
    } else {
      setWatchlist([])
      setWatchlistIds(new Set())
    }
  }

  // Add to watchlist (save to Supabase)
  const addToWatchlist = async (item: ContentItem) => {
    if (!user) {
      toast.error('Please sign in to add to watchlist')
      return
    }
    
    if (watchlistIds.has(item.id)) {
      // Remove from watchlist
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', item.id)
      
      if (error) {
        console.error('Remove error:', error)
        toast.error('Failed to remove from watchlist')
        return
      }
      
      setWatchlist(prev => prev.filter(i => i.id !== item.id))
      const newIdsSet = new Set(watchlistIds)
      newIdsSet.delete(item.id)
      setWatchlistIds(newIdsSet)
      toast.success(`Removed "${item.title}" from watchlist`)
    } else {
      // Add to watchlist
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: item.id,
          content_type: item.type
        })
      
      if (error) {
        console.error('Insert error:', error)
        toast.error('Failed to add to watchlist: ' + error.message)
        return
      }
      
      setWatchlist(prev => [...prev, item])
      const newIdsSet = new Set(watchlistIds)
      newIdsSet.add(item.id)
      setWatchlistIds(newIdsSet)
      toast.success(`✨ "${item.title}" added to watchlist!`)
    }
  }

  const removeFromWatchlist = async (id: string) => {
    if (!user) return
    
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', id)
    
    if (!error) {
      setWatchlist(prev => prev.filter(i => i.id !== id))
      const newIdsSet = new Set(watchlistIds)
      newIdsSet.delete(id)
      setWatchlistIds(newIdsSet)
    }
  }

  const isInWatchlist = (id: string) => watchlistIds.has(id)

  useEffect(() => {
    if (user) {
      loadWatchlistFromSupabase()
    }
  }, [user])

  // Load data for Movies tab
  const loadMoviesData = async () => {
    setLoading(true)
    
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'movie')
        .eq('is_active', true)
        .order('display_order')
      
      setCategories(categoriesData || [])
      
      let contentQuery = supabase
        .from('content')
        .select('*')
        .eq('type', 'movie')
      
      if (selectedGenre !== 'all') {
        contentQuery = contentQuery.eq('genre', selectedGenre)
      }
      
      const { data: contentData } = await contentQuery
      
      const contentWithImages = (contentData || []).map(item => ({
        ...item,
        image_url: item.image_url || `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}`
      }))
      
      setAllContent(contentWithImages)
      
      const { data: relations } = await supabase
        .from('content_categories')
        .select('*')
      
      const byCategory: Record<string, ContentItem[]> = {}
      for (const category of categoriesData || []) {
        const contentIds = relations?.filter(r => r.category_id === category.id).map(r => r.content_id) || []
        byCategory[category.name] = contentWithImages.filter(c => contentIds.includes(c.id))
      }
      setContentByCategory(byCategory)
    } catch (error) {
      console.error('Error loading movies data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load data for Music tab
  const loadMusicData = async () => {
    setLoading(true)
    
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'music')
        .eq('is_active', true)
        .order('display_order')
      
      setCategories(categoriesData || [])
      
      let contentQuery = supabase
        .from('content')
        .select('*')
        .eq('type', 'music')
      
      if (selectedGenre !== 'all') {
        contentQuery = contentQuery.eq('genre', selectedGenre)
      }
      
      const { data: contentData } = await contentQuery
      
      const contentWithImages = (contentData || []).map(item => ({
        ...item,
        image_url: item.image_url || `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}`
      }))
      
      setAllContent(contentWithImages)
      
      const { data: relations } = await supabase
        .from('content_categories')
        .select('*')
      
      const byCategory: Record<string, ContentItem[]> = {}
      for (const category of categoriesData || []) {
        const contentIds = relations?.filter(r => r.category_id === category.id).map(r => r.content_id) || []
        byCategory[category.name] = contentWithImages.filter(c => contentIds.includes(c.id))
      }
      setContentByCategory(byCategory)
    } catch (error) {
      console.error('Error loading music data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load data for Home page (combined movies and music)
  const loadHomeData = async () => {
    setHomeLoading(true)
    
    try {
      const { data: moviesData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'movie')
        .order('stats_highly', { ascending: false })
        .limit(10)
      
      const { data: musicData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'music')
        .order('stats_highly', { ascending: false })
        .limit(10)
      
      const moviesWithImages = (moviesData || []).map(item => ({
        ...item,
        image_url: item.image_url || `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}`
      }))
      
      const musicWithImages = (musicData || []).map(item => ({
        ...item,
        image_url: item.image_url || `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}`
      }))
      
      setHomeMovies(moviesWithImages)
      setHomeMusic(musicWithImages)
    } catch (error) {
      console.error('Error loading home data:', error)
    } finally {
      setHomeLoading(false)
    }
  }

  // Trigger data loading when page changes
  useEffect(() => {
    if (user && !authLoading) {
      if (currentPage === 'home') {
        loadHomeData()
      } else if (currentPage === 'movies') {
        loadMoviesData()
      } else if (currentPage === 'music') {
        loadMusicData()
      }
    }
  }, [currentPage, user, authLoading, selectedGenre])

  const handleRecommend = (item: ContentItem) => {
    setRecommendItem(item)
    setShowRecommendModal(true)
  }

  const handleRecommendSuccess = () => {
    if (currentPage === 'home') {
      loadHomeData()
    } else if (currentPage === 'movies') {
      loadMoviesData()
    } else if (currentPage === 'music') {
      loadMusicData()
    }
  }

  const getFilteredContent = (): ContentItem[] => {
    let filtered = [...allContent]
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(item => item.genre === selectedGenre)
    }
    return filtered
  }

  const handleViewDetails = (item: ContentItem) => {
    setSelectedContent(item)
    setShowDetailsModal(true)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    closeAllPanels()
  }

  const handleHomeClick = () => {
    setCurrentPage('home')
    scrollToTop()
  }

  const handleMoviesClick = () => {
    setCurrentPage('movies')
    setActiveTab('movie')
    setSelectedGenre('all')
    scrollToTop()
  }

  const handleMusicClick = () => {
    setCurrentPage('music')
    setActiveTab('music')
    setSelectedGenre('all')
    scrollToTop()
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading BADMOUTH...</p>
        </div>
      </div>
    )
  }

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

  // Show loading for non-home pages
  if ((currentPage === 'movies' || currentPage === 'music') && loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading {currentPage === 'movies' ? 'movies' : 'music'}...</p>
        </div>
      </div>
    )
  }

  // Show loading for home page
  if (currentPage === 'home' && homeLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your personalized feed...</p>
        </div>
      </div>
    )
  }

  const filteredContent = getFilteredContent()

  // Platform icons mapping
  const platformIcons: Record<string, { icon: string; color: string; url: string }> = {
    'Spotify': { icon: '🎵', color: 'bg-green-600', url: 'https://spotify.com' },
    'Apple Music': { icon: '🍎', color: 'bg-red-600', url: 'https://music.apple.com' },
    'YouTube Music': { icon: '📺', color: 'bg-red-500', url: 'https://music.youtube.com' },
    'Netflix': { icon: '📺', color: 'bg-red-700', url: 'https://netflix.com' },
    'Prime Video': { icon: '📦', color: 'bg-blue-600', url: 'https://primevideo.com' },
    'Amazon Prime': { icon: '📦', color: 'bg-blue-600', url: 'https://primevideo.com' },
    'Max': { icon: '🔷', color: 'bg-blue-500', url: 'https://max.com' },
    'HBO Max': { icon: '🔷', color: 'bg-blue-500', url: 'https://max.com' },
    'Hulu': { icon: '🟢', color: 'bg-green-500', url: 'https://hulu.com' },
    'Disney+': { icon: '✨', color: 'bg-blue-700', url: 'https://disneyplus.com' },
    'Paramount+': { icon: '⭐', color: 'bg-blue-600', url: 'https://paramountplus.com' },
    'Deezer': { icon: '🎧', color: 'bg-purple-600', url: 'https://deezer.com' },
  }

  // ============================================
  // FIXED getRating FUNCTION - No more NaN
  // ============================================
  const getRating = (item: ContentItem) => {
    // If rating_scale is already set and valid, use it
    if (item.rating_scale && item.rating_scale > 0) {
      return item.rating_scale
    }
    
    // Get stats with defaults to avoid NaN
    const highly = item.stats_highly || 0
    const recommended = item.stats_recommended || 0
    const not = item.stats_not || 0
    const total = highly + recommended + not
    
    // Avoid division by zero
    if (total === 0) return 0
    
    // Calculate weighted rating (🔥=10, 👍=7, 👎=2)
    const rating = (highly * 10 + recommended * 7) / total
    
    // Round to 1 decimal place and ensure it's a number
    const rounded = Number(rating.toFixed(1))
    return isNaN(rounded) ? 0 : rounded
  }

  return (
    <div className="min-h-screen bg-black">
      <SearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
        onSelect={handleViewDetails}
      />

      <RecommendModal 
        isOpen={showRecommendModal} 
        onClose={() => setShowRecommendModal(false)} 
        item={recommendItem}
        userId={user.id}
        onSuccess={handleRecommendSuccess}
      />

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
                <div 
                  key={item.id} 
                  className="p-3 border-b border-gray-800 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition"
                  onClick={() => {
                    handleViewDetails(item)
                    setShowWatchlist(false)
                  }}
                >
                  <div>
                    <p className="font-medium text-sm truncate max-w-[150px]">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.type}</p>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation()
                      removeFromWatchlist(item.id)
                    }} 
                    className="text-red-500 text-xs hover:text-red-400"
                  >
                    Remove
                  </button>
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
            <img 
              src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
              alt="Profile" 
              className="w-20 h-20 rounded-full mx-auto mb-3" 
            />
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
              <button onClick={scrollToTop} className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH
              </button>
              
              <nav className="hidden md:flex gap-6">
                <button onClick={handleHomeClick} className={`flex items-center gap-1 transition ${currentPage === 'home' ? 'text-teal-500 border-b-2 border-teal-500 pb-1' : 'text-gray-300 hover:text-white'}`}>
                  <Home size={16} /> Home
                </button>
                <button onClick={handleMoviesClick} className={`flex items-center gap-1 transition ${currentPage === 'movies' ? 'text-teal-500 border-b-2 border-teal-500 pb-1' : 'text-gray-300 hover:text-white'}`}>
                  <Film size={16} /> Movies
                </button>
                <button onClick={handleMusicClick} className={`flex items-center gap-1 transition ${currentPage === 'music' ? 'text-teal-500 border-b-2 border-teal-500 pb-1' : 'text-gray-300 hover:text-white'}`}>
                  <Music size={16} /> Music
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setShowSearchModal(true)} className="text-gray-300 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>

              {/* Genre Filter - Only show on Movies and Music tabs, NOT on Home */}
              {currentPage !== 'home' && (
                <div className="relative">
                  <button onClick={() => setShowGenreFilter(!showGenreFilter)} className="text-gray-300 hover:text-white flex items-center gap-1">
                    <Filter size={18} /> <span className="text-xs hidden md:inline">Genre</span>
                  </button>
                  {showGenreFilter && (
                    <div className="absolute top-8 right-0 w-48 bg-gray-900 rounded-xl shadow-xl border border-gray-700 z-50">
                      <div className="p-2">
                        {genres.map(genre => (
                          <button 
                            key={genre} 
                            onClick={() => { setSelectedGenre(genre); setShowGenreFilter(false); if (currentPage === 'movies') loadMoviesData(); else if (currentPage === 'music') loadMusicData(); }} 
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-800 ${selectedGenre === genre ? 'text-teal-500' : 'text-gray-300'}`}
                          >
                            {genre === 'all' ? 'All Genres' : genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button onClick={toggleNotifications} className="text-gray-300 hover:text-white relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              
              <button onClick={toggleWatchlist} className="text-gray-300 hover:text-white relative">
                <Heart size={20} />
                {watchlist.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full text-[10px] flex items-center justify-center text-white">{watchlist.length}</span>}
              </button>

              {user?.email === 'kijified@gmail.com' && (
                <Link href="/admin" className="text-gray-300 hover:text-teal-500 transition">
                  <Shield size={20} />
                </Link>
              )}
              
              <button onClick={toggleProfile} className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white">
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
              <button onClick={() => { handleHomeClick(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🏠 Home</button>
              <button onClick={() => { handleMoviesClick(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎬 Movies</button>
              <button onClick={() => { handleMusicClick(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🎵 Music</button>
              <button onClick={() => { toggleWatchlist(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">❤️ Watchlist ({watchlist.length})</button>
              <button onClick={() => { toggleProfile(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">👤 Profile</button>
              <button onClick={() => { toggleNotifications(); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg">🔔 Notifications</button>
              {user?.email === 'kijified@gmail.com' && (
                <Link href="/admin" onClick={() => setIsSidebarOpen(false)} className="w-full text-left p-3 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                  <Shield size={16} /> Admin
                </Link>
              )}
              <button onClick={signOut} className="w-full text-left p-3 text-red-500 hover:bg-gray-800 rounded-lg flex items-center gap-2">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        {currentPage === 'home' ? (
          <>
            <HeroCarousel 
              items={[...homeMovies.slice(0, 2), ...homeMusic.slice(0, 1)]} 
              onViewDetails={handleViewDetails} 
              onRecommend={handleRecommend}
              activeTab={activeTab} 
            />
            <TrendingBar />
            <QuickStats userId={user.id} />
            <div className="container mx-auto px-4">
              <HomeFeed 
                onViewDetails={handleViewDetails}
                onRecommend={handleRecommend}
                onAddToWatchlist={addToWatchlist}
                onRemoveFromWatchlist={removeFromWatchlist}
                isInWatchlist={isInWatchlist}
              />
              <WatchlistBasedRecommendations 
                userId={user.id}
                watchlist={watchlist}
                onViewDetails={handleViewDetails}
                onRecommend={handleRecommend}
                onAddToWatchlist={addToWatchlist}
                onRemoveFromWatchlist={removeFromWatchlist}
                isInWatchlist={isInWatchlist}
              />
              <SocialRecommendations onViewDetails={handleViewDetails} activeTab={activeTab} />
            </div>
          </>
        ) : currentPage === 'movies' ? (
          <>
            <HeroCarousel 
              items={allContent.slice(0, 3)} 
              onViewDetails={handleViewDetails} 
              onRecommend={handleRecommend}
              activeTab={activeTab} 
            />
            <div className="container mx-auto px-4">
              {categories.map((category) => (
                <ContentRow 
                  key={category.id}
                  title={category.name}
                  items={contentByCategory[category.name] || []}
                  type={activeTab}
                  onViewDetails={handleViewDetails}
                  onRecommend={handleRecommend}
                  onAddToWatchlist={addToWatchlist}
                  onRemoveFromWatchlist={removeFromWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              ))}
              <SocialRecommendations onViewDetails={handleViewDetails} activeTab={activeTab} />
            </div>
          </>
        ) : (
          // MUSIC TAB
          <>
            <HeroCarousel 
              items={allContent.slice(0, 3)} 
              onViewDetails={handleViewDetails} 
              onRecommend={handleRecommend}
              activeTab={activeTab} 
            />
            <div className="container mx-auto px-4">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <ContentRow 
                    key={category.id}
                    title={category.name}
                    items={contentByCategory[category.name] || []}
                    type={activeTab}
                    onViewDetails={handleViewDetails}
                    onRecommend={handleRecommend}
                    onAddToWatchlist={addToWatchlist}
                    onRemoveFromWatchlist={removeFromWatchlist}
                    isInWatchlist={isInWatchlist}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Music size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No music categories found</p>
                </div>
              )}
              
              {allContent.length === 0 && categories.length > 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No music content yet. Check back later!</p>
                </div>
              )}
              
              <SocialRecommendations onViewDetails={handleViewDetails} activeTab={activeTab} />
            </div>
          </>
        )}
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedContent.backdrop_url || selectedContent.image_url} alt={selectedContent.title} className="w-full h-48 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-bold mb-1">{selectedContent.title}</h2>
              {selectedContent.artist && <p className="text-gray-400 mb-3">{selectedContent.artist}</p>}
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">{selectedContent.long_description || selectedContent.description}</p>
              
              {/* Rating Display - Now safe from NaN */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-bold">{getRating(selectedContent)}</span>
                <span className="text-gray-400">/10</span>
                <span className="text-xs text-gray-500 ml-2">
                  based on {(selectedContent.stats_highly || 0) + (selectedContent.stats_recommended || 0) + (selectedContent.stats_not || 0)} votes
                </span>
              </div>
              
              <div className="flex gap-6 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl text-teal-500">🔥</div>
                  <div className="text-xs text-gray-400 mt-1">HIGHLY RECOMMENDED</div>
                  <div className="font-bold">{selectedContent.stats_highly || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-blue-500">👍</div>
                  <div className="text-xs text-gray-400 mt-1">RECOMMENDED</div>
                  <div className="font-bold">{selectedContent.stats_recommended || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-gray-500">👎</div>
                  <div className="text-xs text-gray-400 mt-1">NOT RECOMMENDED</div>
                  <div className="font-bold">{selectedContent.stats_not || 0}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">{selectedContent.type === 'movie' ? '📺 Where to Watch' : '🎧 Where to Listen'}</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedContent.platforms?.map((platform: string, idx: number) => {
                    const info = platformIcons[platform] || { icon: '🎬', color: 'bg-gray-600', url: '#' }
                    return (
                      <a 
                        key={idx} 
                        href={info.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-3 py-2 ${info.color} rounded-lg text-sm font-medium hover:opacity-80 transition`}
                        title={platform}
                      >
                        <span className="text-base">{info.icon}</span>
                        <span className="hidden sm:inline">{platform}</span>
                      </a>
                    )
                  })}
                </div>
              </div>
              
              {selectedContent.type === 'movie' && selectedContent.director && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎬 Director:</span> {selectedContent.director}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Runtime:</span> {selectedContent.runtime || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedContent.genre}</div>
                </div>
              )}
              
              {selectedContent.type === 'music' && selectedContent.artist && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div className="col-span-2">
                    <span className="text-gray-400">🎤 Artist:</span>{' '}
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        router.push(`/actor/${encodeURIComponent(selectedContent.artist!)}`)
                      }}
                      className="text-teal-400 hover:text-teal-300 hover:underline transition"
                    >
                      {selectedContent.artist}
                    </button>
                  </div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedContent.year}</div>
                  <div><span className="text-gray-400">⏱️ Duration:</span> {selectedContent.duration || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedContent.genre}</div>
                </div>
              )}
              
              {selectedContent.type === 'movie' && selectedContent.actors && selectedContent.actors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">⭐ Cast</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent.actors.map((actor: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setShowDetailsModal(false)
                          router.push(`/actor/${encodeURIComponent(actor)}`)
                        }}
                        className="px-3 py-1 bg-gray-800 rounded-full text-sm hover:bg-teal-600/30 hover:text-teal-400 transition"
                      >
                        {actor}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
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

      <MobileNav 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          if (tab === 'movie') handleMoviesClick()
          else handleMusicClick()
        }} 
        onViewDetails={handleViewDetails}
        onHomeClick={handleHomeClick}
        onProfileClick={toggleProfile}
        onWatchlistClick={toggleWatchlist}
        items={filteredContent} 
      />
    </div>
  )
}
