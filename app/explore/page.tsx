'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Film, Music, Search, Star, Heart, Filter, X, Loader2, Layers } from 'lucide-react'
import Link from 'next/link'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [content, setContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'music'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [genres, setGenres] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0) // ← ADD THIS

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
    loadContent()
    if (user) {
      loadWatchlist()
    }
  }, [user, searchParams])

  const loadContent = async () => {
    setLoading(true)
    try {
      console.log('Loading explore content...')
      
      // ✅ FIX: Get ALL content with exact count
      const { data, error, count } = await supabase
        .from('content')
        .select('*', { count: 'exact' })  // ← This gets the REAL count
        .order('rating', { ascending: false })

      if (error) {
        console.error('Explore content error:', error)
        toast.error('Failed to load content')
        setContent([])
        setFilteredContent([])
        setTotalCount(0)
        setFilteredCount(0)
        setLoading(false)
        return
      }

      console.log('📊 Total content count:', count)
      console.log('📝 Content loaded:', data?.length || 0)
      
      setContent(data || [])
      setFilteredContent(data || [])
      setTotalCount(count || 0)  // ← Use the count from Supabase
      setFilteredCount(data?.length || 0)
      
      // Extract unique genres
      const uniqueGenres = new Set<string>()
      data?.forEach(item => {
        if (item.genre) {
          item.genre.split(',').forEach((g: string) => uniqueGenres.add(g.trim()))
        }
      })
      setGenres(['all', ...Array.from(uniqueGenres)])
      
      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
      
      if (categoriesData) {
        setCategories(categoriesData)
      }
      
      // Apply category filter if present
      const categoryParam = searchParams.get('category')
      if (categoryParam && categoryParam !== 'all') {
        await applyCategoryFilter(categoryParam, data || [])
      }
      
    } catch (error) {
      console.error('Error loading content:', error)
      toast.error('Failed to load content')
      setContent([])
      setFilteredContent([])
      setTotalCount(0)
      setFilteredCount(0)
    } finally {
      setLoading(false)
    }
  }

  const applyCategoryFilter = async (categoryName: string, contentData?: ContentItem[]) => {
    const data = contentData || content
    if (categoryName === 'all' || !categoryName) {
      setFilteredContent(data)
      setFilteredCount(data.length)
      return
    }
    
    // ✅ FIX: Find category by name OR id
    const category = categories.find(c => 
      c.name === categoryName || c.id === categoryName
    )
    
    if (!category) {
      console.log('Category not found:', categoryName)
      setFilteredContent(data)
      setFilteredCount(data.length)
      return
    }
    
    console.log('Filtering by category:', category.name, category.id)
    
    // ✅ FIX: Get content for this category
    const { data: categoryContent, error } = await supabase
      .from('content_categories')
      .select('content_id')
      .eq('category_id', category.id)
    
    if (error) {
      console.error('Error fetching category content:', error)
      setFilteredContent(data)
      setFilteredCount(data.length)
      return
    }
    
    if (!categoryContent || categoryContent.length === 0) {
      console.log('No content in category:', category.name)
      setFilteredContent([])
      setFilteredCount(0)
      return
    }
    
    const contentIds = categoryContent.map(cc => cc.content_id)
    const filtered = data.filter(item => contentIds.includes(item.id))
    
    console.log(`Found ${filtered.length} items in category ${category.name}`)
    setFilteredContent(filtered)
    setFilteredCount(filtered.length)
  }

  const loadWatchlist = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('content_id')
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Watchlist load error:', error)
        return
      }
      
      if (data) {
        const idsSet = new Set<string>()
        data.forEach(item => idsSet.add(item.content_id))
        setWatchlistIds(idsSet)
      }
    } catch (error) {
      console.error('Error loading watchlist:', error)
    }
  }

  const handleAddToWatchlist = async (item: ContentItem) => {
    if (!user) {
      toast.error('Please sign in to add to watchlist')
      return
    }
    
    try {
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
    } catch (error) {
      console.error('Watchlist error:', error)
      toast.error('Failed to update watchlist')
    }
  }

  const getRating = (item: ContentItem) => {
    return item.rating || 0
  }

  const handleViewDetails = (item: ContentItem) => {
    router.push(`/?details=${item.id}`)
  }

  // ✅ FIX: Combined filter function
  const applyAllFilters = () => {
    let filtered = [...content]
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(q) ||
        (item.artist && item.artist.toLowerCase().includes(q)) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        (item.genre && item.genre.toLowerCase().includes(q))
      )
    }
    
    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType)
    }
    
    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(item => 
        item.genre && item.genre.split(',').some(g => g.trim() === selectedGenre)
      )
    }
    
    // Category filter - if not "all", we need to fetch from content_categories
    if (selectedCategory !== 'all') {
      // We'll handle this with a separate async call
      // For now, filter client-side if we have the data
      const category = categories.find(c => 
        c.name === selectedCategory || c.id === selectedCategory
      )
      if (category) {
        // This is a simplified client-side filter
        // In a real app, you'd fetch from content_categories
        // For now, we'll just keep the filtered content
        // The actual category filtering is done in applyCategoryFilter
      }
    }
    
    setFilteredContent(filtered)
    setFilteredCount(filtered.length)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Re-apply all filters with new search
    setTimeout(() => applyAllFilters(), 0)
  }

  const handleTypeChange = (type: 'all' | 'movie' | 'music') => {
    setSelectedType(type)
    setTimeout(() => applyAllFilters(), 0)
  }

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    setTimeout(() => applyAllFilters(), 0)
  }

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category)
    
    if (category === 'all') {
      // Reset to show all content
      setFilteredContent(content)
      setFilteredCount(content.length)
      return
    }
    
    // Find the category by name or id
    const cat = categories.find(c => 
      c.name === category || c.id === category
    )
    
    if (!cat) {
      console.log('Category not found:', category)
      setFilteredContent(content)
      setFilteredCount(content.length)
      return
    }
    
    console.log('Filtering by category:', cat.name, cat.id)
    
    // Get content IDs for this category
    const { data: categoryContent, error } = await supabase
      .from('content_categories')
      .select('content_id')
      .eq('category_id', cat.id)
    
    if (error) {
      console.error('Error fetching category content:', error)
      setFilteredContent(content)
      setFilteredCount(content.length)
      return
    }
    
    if (!categoryContent || categoryContent.length === 0) {
      setFilteredContent([])
      setFilteredCount(0)
      return
    }
    
    const contentIds = categoryContent.map(cc => cc.content_id)
    const filtered = content.filter(item => contentIds.includes(item.id))
    
    console.log(`Found ${filtered.length} items in category ${cat.name}`)
    setFilteredContent(filtered)
    setFilteredCount(filtered.length)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSelectedGenre('all')
    setSelectedCategory('all')
    setFilteredContent(content)
    setFilteredCount(content.length)
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

              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedType !== 'all' || selectedGenre !== 'all' || selectedCategory !== 'all' || searchQuery) && (
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

        {/* Results Stats - ✅ FIXED: Show both total and filtered counts */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'Result' : 'Results'}
          </h2>
          <span className="text-xs text-gray-400">
            {filteredCount !== totalCount 
              ? `Showing ${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()}`
              : `${totalCount.toLocaleString()} total`
            }
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
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(item.title)}`
                    }}
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
