'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Film, Music, Heart, Star, Filter, X, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import RecommendModal from '@/components/RecommendModal'

export default function ExplorePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ContentItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'music'>('all')
  const [sortBy, setSortBy] = useState<'highly' | 'recommended' | 'recent'>('highly')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [genres, setGenres] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('badmouth_watchlist')
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved).map((i: any) => i.id))
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setItems(data)
      // Extract unique genres
      const allGenres = new Set<string>()
      data.forEach(item => {
        if (item.genre) allGenres.add(item.genre)
      })
      setGenres(['all', ...Array.from(allGenres)])
      applyFilters(data, typeFilter, sortBy, genreFilter)
    }
    setLoading(false)
  }

  const applyFilters = (data: ContentItem[], type: string, sort: string, genre: string) => {
    let filtered = [...data]
    
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type)
    }
    
    if (genre !== 'all') {
      filtered = filtered.filter(item => item.genre === genre)
    }
    
    if (sort === 'highly') {
      filtered.sort((a, b) => (b.stats_highly || 0) - (a.stats_highly || 0))
    } else if (sort === 'recommended') {
      filtered.sort((a, b) => (b.stats_recommended || 0) - (a.stats_recommended || 0))
    } else if (sort === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    
    setFilteredItems(filtered)
  }

  const handleFilterChange = (type: 'all' | 'movie' | 'music') => {
    setTypeFilter(type)
    applyFilters(items, type, sortBy, genreFilter)
  }

  const handleSortChange = (sort: 'highly' | 'recommended' | 'recent') => {
    setSortBy(sort)
    applyFilters(items, typeFilter, sort, genreFilter)
  }

  const handleGenreChange = (genre: string) => {
    setGenreFilter(genre)
    applyFilters(items, typeFilter, sortBy, genre)
  }

  const addToWatchlist = (item: ContentItem) => {
    const saved = localStorage.getItem('badmouth_watchlist')
    let current = saved ? JSON.parse(saved) : []
    
    if (current.some((i: any) => i.id === item.id)) {
      current = current.filter((i: any) => i.id !== item.id)
    } else {
      current.push(item)
    }
    
    localStorage.setItem('badmouth_watchlist', JSON.stringify(current))
    setWatchlist(current.map((i: any) => i.id))
  }

  const isInWatchlist = (id: string) => watchlist.includes(id)

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 text-teal-500" size={48} />
          <p className="text-gray-400">Please sign in to explore content</p>
          <Link href="/" className="mt-4 inline-block px-6 py-2 bg-teal-600 rounded-lg">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <RecommendModal 
        isOpen={showRecommendModal} 
        onClose={() => setShowRecommendModal(false)} 
        item={selectedItem}
        userId={user.id}
        onSuccess={() => loadContent()}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                Explore All
              </h1>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
            >
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="sticky top-16 z-40 bg-gray-900 border-b border-gray-800 p-4">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 rounded-lg transition ${typeFilter === 'all' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => handleFilterChange('movie')}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${typeFilter === 'movie' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  <Film size={16} /> Movies
                </button>
                <button 
                  onClick={() => handleFilterChange('music')}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${typeFilter === 'music' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  <Music size={16} /> Music
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <select 
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  <option value="highly">🔥 Most Highly Recommended</option>
                  <option value="recommended">👍 Most Recommended</option>
                  <option value="recent">🕐 Recently Added</option>
                </select>

                <select 
                  value={genreFilter}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>
                      {genre === 'all' ? 'All Genres' : genre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No content found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative rounded-xl overflow-hidden bg-gray-800">
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                    <button 
                      onClick={() => {
                        setSelectedItem(item)
                        setShowRecommendModal(true)
                      }}
                      className="w-full py-2 bg-teal-600 rounded-lg text-sm font-semibold mb-2"
                    >
                      Recommend
                    </button>
                    <button 
                      onClick={() => addToWatchlist(item)}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition ${isInWatchlist(item.id) ? 'bg-teal-600' : 'bg-gray-700'}`}
                    >
                      {isInWatchlist(item.id) ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                  </div>
                  {isInWatchlist(item.id) && (
                    <div className="absolute top-2 right-2 bg-teal-600 rounded-full p-1">
                      <Heart size={12} className="fill-white" />
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-400">{item.type === 'movie' ? '🎬 Movie' : '🎵 Music'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="flex items-center gap-0.5"><span className="text-teal-500">🔥</span> {item.stats_highly || 0}</span>
                    <span className="flex items-center gap-0.5"><span className="text-blue-500">👍</span> {item.stats_recommended || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
