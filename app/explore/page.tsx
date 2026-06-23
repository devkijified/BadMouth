'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Film, Music, Search, Star, Heart, Filter, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

export default function ExplorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [content, setContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'music'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [genres, setGenres] = useState<string[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadContent()
    if (user) {
      loadWatchlist()
    }
  }, [user])

  const loadContent = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('rating', { ascending: false })

      if (error) throw error

      setContent(data || [])
      setFilteredContent(data || [])
      
      // Extract unique genres
      const uniqueGenres = new Set<string>()
      data?.forEach(item => {
        if (item.genre) {
          item.genre.split(',').forEach((g: string) => uniqueGenres.add(g.trim()))
        }
      })
      setGenres(['all', ...Array.from(uniqueGenres)])
    } catch (error) {
      console.error('Error loading content:', error)
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const loadWatchlist = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('watchlist')
      .select('content_id')
      .eq('user_id', user.id)
    
    if (data) {
      const idsSet = new Set<string>()
      data.forEach(item => idsSet.add(item.content_id))
      setWatchlistIds(idsSet)
    }
  }

  const handleAddToWatchlist = async (item: ContentItem) => {
    if (!user) {
      toast.error('Please sign in to add to watchlist')
      return
    }
    
    if (watchlistIds.has(item.id)) {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', item.id)
      
      if (!error) {
        const newIdsSet = new Set(watchlistIds)
        newIdsSet.delete(item.id)
        setWatchlistIds(newIdsSet)
        toast.success(`Removed "${item.title}" from watchlist`)
      }
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: item.id,
          content_type: item.type
        })
      
      if (!error) {
        const newIdsSet = new Set(watchlistIds)
        newIdsSet.add(item.id)
        setWatchlistIds(newIdsSet)
        toast.success(`✨ "${item.title}" added to watchlist!`)
      }
    }
  }

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  const handleViewDetails = (item: ContentItem) => {
    router.push(`/?details=${item.id}`)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    applyFilters(query, selectedType, selectedGenre)
  }

  const applyFilters = (query: string, type: string, genre: string) => {
    let filtered = [...content]
    
    // Search query
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(q) ||
        (item.artist && item.artist.toLowerCase().includes(q)) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.genre && item.genre.toLowerCase().includes(q))
      )
    }
    
    // Type filter
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type)
    }
    
    // Genre filter
    if (genre !== 'all') {
      filtered = filtered.filter(item => 
        item.genre && item.genre.split(',').some(g => g.trim() === genre)
      )
    }
    
    setFilteredContent(filtered)
  }

  const handleTypeChange = (type: 'all' | 'movie' | 'music') => {
    setSelectedType(type)
    applyFilters(searchQuery, type, selectedGenre)
  }

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    applyFilters(searchQuery, selectedType, genre)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSelectedGenre('all')
    setFilteredContent(content)
  }

  const isInWatchlist = (id: string) => watchlistIds.has(id)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-400 hover:text-white transition p-2"
              >
                <Filter size={20} />
              </button>
              <Link href="/" className="text-gray-400 hover:text-white transition">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for movies, music, artists, directors..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500 text-white"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTypeChange('all')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      selectedType === 'all' ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleTypeChange('movie')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      selectedType === 'movie' ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Movies
                  </button>
                  <button
                    onClick={() => handleTypeChange('music')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      selectedType === 'music' ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Music
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                >
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre === 'all' ? 'All Genres' : genre}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedType !== 'all' || selectedGenre !== 'all' || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-teal-400 hover:text-teal-300 transition mt-4 md:mt-0"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Stats */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {filteredContent.length} {filteredContent.length === 1 ? 'Result' : 'Results'}
          </h2>
          <span className="text-xs text-gray-400">
            Sorted by Rating
          </span>
        </div>

        {/* Content Grid */}
        {filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200"
                onClick={() => handleViewDetails(item)}
              >
                <div className="relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  {item.is_tv_show && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        TV Series
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-white">{getRating(item).toFixed(1)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToWatchlist(item)
                    }}
                    className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                  >
                    <Heart
                      size={14}
                      className={isInWatchlist(item.id) ? 'fill-teal-500 text-teal-500' : 'text-gray-400'}
                    />
                  </button>
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {item.artist || item.director || item.type === 'movie' ? 'Movie' : 'Music'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-yellow-400">⭐ {getRating(item).toFixed(1)}</span>
                    <span className="text-[8px] text-gray-500">({item.rating_count || 0})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
