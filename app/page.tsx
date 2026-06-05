'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Search, Bell, User, Menu, Film, Music, Home, Heart, Sparkles } from 'lucide-react'
import HeroCarousel from '@/components/HeroCarousel'
import ContentRow from '@/components/ContentRow'
import SocialRecommendations from '@/components/SocialRecommendations'
import MobileNav from '@/components/MobileNav'

export default function Home() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'movies' | 'music'>('movies')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Sample data - replace with actual API calls
  const trendingMovies = [
    { id: '1', title: 'The Dark Knight', image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', rating: 4.8, type: 'movie' as const, year: 2008 },
    { id: '2', title: 'Inception', image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', rating: 4.7, type: 'movie' as const, year: 2010 },
    { id: '3', title: 'Interstellar', image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating: 4.6, type: 'movie' as const, year: 2014 },
    { id: '4', title: 'Pulp Fiction', image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', rating: 4.5, type: 'movie' as const, year: 1994 },
    { id: '5', title: 'The Matrix', image: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', rating: 4.7, type: 'movie' as const, year: 1999 },
  ]

  const trendingMusic = [
    { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', image: 'https://i.scdn.co/image/ab67616d0000b273c6e6d6c8a2e0e0e9e9e9e9e9', rating: 4.9, type: 'music' as const, year: 2020 },
    { id: '2', title: 'Bohemian Rhapsody', artist: 'Queen', image: 'https://i.scdn.co/image/ab67616d0000b273e8e8e8e8e8e8e8e8e8e8e8e8', rating: 4.8, type: 'music' as const, year: 1975 },
    { id: '3', title: 'Shape of You', artist: 'Ed Sheeran', image: 'https://i.scdn.co/image/ab67616d0000b273d8d8d8d8d8d8d8d8d8d8d8d8', rating: 4.6, type: 'music' as const, year: 2017 },
  ]

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
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-600 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
            BADMOUTH
          </h1>
          <p className="text-gray-400 mb-6">Your AI-powered movie & music recommendation engine</p>
          <a href="/auth" className="inline-block px-8 py-3 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg font-semibold">
            Get Started
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Prime Video Style */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                BADMOUTH
              </h1>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-6">
                <button className="nav-link text-white font-medium">Home</button>
                <button className="nav-link flex items-center gap-1">
                  <Film size={16} /> Movies
                </button>
                <button className="nav-link flex items-center gap-1">
                  <Music size={16} /> Music
                </button>
                <button className="nav-link flex items-center gap-1">
                  <Heart size={16} /> Watchlist
                </button>
              </nav>
            </div>

            {/* Search and Profile */}
            <div className="flex items-center gap-4">
              <button className="hidden md:block nav-link">
                <Search size={20} />
              </button>
              <button className="nav-link">
                <Bell size={20} />
              </button>
              <button className="flex items-center gap-2 nav-link">
                <img 
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              </button>
              <button className="md:hidden nav-link" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Carousel */}
        <HeroCarousel />

        <div className="container mx-auto px-4">
          {/* Content Rows */}
          <ContentRow 
            title="Trending Now" 
            items={trendingMovies} 
            type="movie" 
          />
          
          <ContentRow 
            title="Popular Music" 
            items={trendingMusic} 
            type="music" 
          />

          <ContentRow 
            title="Continue Watching" 
            items={trendingMovies.slice(0, 4)} 
            type="movie" 
          />

          {/* Social Recommendations */}
          <SocialRecommendations />

          <ContentRow 
            title="Recommended for You" 
            items={trendingMovies} 
            type="movie" 
          />
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
