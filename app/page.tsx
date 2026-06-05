'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Search, Bell, User, Menu, Film, Music, Home, Heart, Sparkles, X, LogOut, Filter, ExternalLink, Shield } from 'lucide-react'
import Link from 'next/link'
import HeroCarousel from '@/components/HeroCarousel'
import ContentRow from '@/components/ContentRow'
import SocialRecommendations from '@/components/SocialRecommendations'
import MobileNav from '@/components/MobileNav'
import { ContentItem, Category } from '@/types/content'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'movie' | 'music'>('movie')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [showGenreFilter, setShowGenreFilter] = useState(false)
  const [watchlist, setWatchlist] = useState<ContentItem[]>([])
  const [notifications, setNotifications] = useState<string[]>([])
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  
  // Data from Supabase
  const [categories, setCategories] = useState<Category[]>([])
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [contentByCategory, setContentByCategory] = useState<Record<string, ContentItem[]>>({})
  const [loading, setLoading] = useState(true)

  // Available genres for filtering
  const genres = ['all', 'Action', 'Drama', 'Sci-Fi', 'Pop', 'Rock', 'Thriller']

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthChecking(false)
    }
    checkAuth()
  }, [])

  // Close all panels
  const closeAllPanels = () => {
    setShowWatchlist(false)
    setShowProfile(false)
    setShowNotifications(false)
  }

  // Toggle watchlist panel (close others)
  const toggleWatchlist = () => {
    if (showWatchlist) {
      setShowWatchlist(false)
    } else {
      setShowProfile(false)
      setShowNotifications(false)
      setShowWatchlist(true)
    }
  }

  // Toggle profile panel (close others)
  const toggleProfile = () => {
    if (showProfile) {
      setShowProfile(false)
    } else {
      setShowWatchlist(false)
      setShowNotifications(false)
      setShowProfile(true)
    }
  }

  // Toggle notifications panel (close others)
  const toggleNotifications = () => {
    if (showNotifications) {
      setShowNotifications(false)
    } else {
      setShowWatchlist(false)
      setShowProfile(false)
      setShowNotifications(true)
    }
  }

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse watchlist', e)
      }
    }
  }, [])

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('badmouth_watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  // Load data from Supabase
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [activeTab, user])

  const loadData = async () => {
    setLoading(true)
    
    try {
      // Load categories for current tab
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('type', activeTab)
        .eq('is_active', true)
        .order('display_order')
      
      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])
      
      // Load content for current tab
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('type', activeTab)
      
      if (contentError) throw contentError
      setAllContent(contentData || [])
      
      // Load content-category relationships
      const { data: relations, error: relationsError } = await supabase
        .from('content_categories')
        .select('*')
      
      if (relationsError) throw relationsError
      
      // Organize content by category
      const byCategory: Record<string, ContentItem[]> = {}
      for (const category of categoriesData || []) {
        const contentIds = relations?.filter(r => r.category_id === category.id).map(r => r.content_id) || []
        byCategory[category.name] = contentData?.filter(c => contentIds.includes(c.id)) || []
      }
      setContentByCategory(byCategory)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchlist = (item: ContentItem) => {
    if (watchlist.some(i => i.id === item.id)) {
      const newWatchlist = watchlist.filter(i => i.id !== item.id)
      setWatchlist(newWatchlist)
      setNotifications([`Removed "${item.title}" from watchlist`, ...notifications.slice(0, 4)])
    } else {
      const newWatchlist = [...watchlist, item]
      setWatchlist(newWatchlist)
      setNotifications([`✨ "${item.title}" added to watchlist!`, ...notifications.slice(0, 4)])
    }
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
  }

  const removeFromWatchlist = (id: string) => {
    const item = watchlist.find(i => i.id === id)
    if (item) {
      const newWatchlist = watchlist.filter(i => i.id !== id)
      setWatchlist(newWatchlist)
      setNotifications([`Removed "${item.title}" from watchlist`, ...notifications.slice(0, 4)])
      setTimeout(() => setNotifications(prev => prev.slice(1)), 3000)
    }
  }

  const isInWatchlist = (id: string) => watchlist.some(i => i.id === id)

  // Filter content by search and genre
  const getFilteredContent = (): ContentItem[] => {
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

  const handleViewDetails = (item: ContentItem) => {
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

  // Show loading spinner while checking auth
  if (isAuthChecking) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your recommendations...</p>
        </div>
      </div>
    )
  }

  const filteredContent = getFilteredContent()

  return (
    <div className="min-h-screen bg-black">
      {/* Rest of your component remains the same */}
      {/* ... (keep all the JSX from your working version) ... */}
    </div>
  )
}
