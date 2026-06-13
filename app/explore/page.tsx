'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Film, Music, Heart, Star, Filter, X, Sparkles, ThumbsUp, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ContentItem } from '@/types/content'
import RecommendModal from '@/components/RecommendModal'
import toast from 'react-hot-toast'

export default function ExplorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = useState<ContentItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'music'>('all')
  const [sortBy, setSortBy] = useState<'highly' | 'recommended'>('highly')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [watchlist, setWatchlist] = useState<ContentItem[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [genres, setGenres] = useState<string[]>([])

  // Load watchlist from Supabase
  const loadWatchlist = async () => {
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

  // Add to watchlist
  const addToWatchlist = async (item: ContentItem) => {
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
      
      if (error) {
        toast.error('Failed to remove from watchlist')
        return
      }
      
      setWatchlist(prev => prev.filter(i => i.id !== item.id))
      const newIdsSet = new Set(watchlistIds)
      newIdsSet.delete(item.id)
      setWatchlistIds(newIdsSet)
      toast.success(`Removed "${item.title}" from watchlist`)
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: item.id,
          content_type: item.type
        })
      
      if (error) {
        toast.error('Failed to add to watchlist')
        return
      }
      
      setWatchlist(prev => [...prev, item])
      const newIdsSet = new Set(watchlistIds)
      newIdsSet.add(item.id)
      setWatchlistIds(newIdsSet)
      toast.success(`✨ "${item.title}" added to watchlist!`)
    }
  }

  const isInWatchlist = (id: string) => watchlistIds.has(id)

  useEffect(() => {
    if (user) {
      loadWatchlist()
    }
    loadContent()
  }, [user])

  const loadContent = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('content')
      .select('*')
      .order('stats_highly', { ascending: false })
    
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
    }
    
    setFilteredItems(filtered)
  }

  const handleFilterChange = (type: 'all' | 'movie' | 'music') => {
    setTypeFilter(type)
    applyFilters(items, type, sortBy, genreFilter)
  }

  const handleSortChange = (sort: 'highly' | 'recommended') => {
    setSortBy(sort)
    applyFilters(items, typeFilter, sort, genreFilter)
  }

  const handleGenreChange = (genre: string) => {
    setGenreFilter(genre)
    applyFilters(items, typeFilter, sortBy, genre)
  }

  const handleRecommend = (item: ContentItem) => {
    setSelectedItem(item)
    setShowRecommendModal(true)
  }

  const handleRecommendSuccess = () => {
    loadContent()
  }

  const handleViewDetails = (item: ContentItem) => {
    setSelectedItem(item)
    setShowDetailsModal(true)
  }

  const getRating = (item: ContentItem) => {
    if (item.rating_scale && item.rating_scale > 0) {
      return item.rating_scale
    }
    const total = (item.stats_highly || 0) + (item.stats_recommended || 0) + (item.stats_not || 0)
    if (total === 0) return 0
    return Number((((item.stats_highly || 0) * 10 + (item.stats_recommended || 0) * 7) / total).toFixed(1))
  }

  // Platform icons mapping
  const platformIcons: Record<string, { icon: string; color: string; url: string }> = {
    'Spotify': { icon: '🎵', color: 'bg-green-600', url: 'https://spotify.com' },
    'Apple Music': { icon: '🍎', color: 'bg-red-600', url: 'https://music.apple.com' },
    'YouTube Music': { icon: '📺', color: 'bg-red-500', url: 'https://music.youtube.com' },
    'Netflix': { icon: '📺', color: 'bg-red-700', url: 'https://netflix.com' },
    'Prime Video': { icon: '📦', color: 'bg-blue-600', url: 'https://primevideo.com' },
    'Max': { icon: '🔷', color: 'bg-blue-500', url: 'https://max.com' },
    'Hulu': { icon: '🟢', color: 'bg-green-500', url: 'https://hulu.com' },
    'Disney+': { icon: '✨', color: 'bg-blue-700', url: 'https://disneyplus.com' },
    'Deezer': { icon: '🎧', color: 'bg-purple-600', url: 'https://deezer.com' },
  }

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
        userId={user?.id}
        onSuccess={handleRecommendSuccess}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedItem.backdrop_url || selectedItem.image_url} alt={selectedItem.title} className="w-full h-48 object-cover" />
              <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-bold mb-1">{selectedItem.title}</h2>
              {selectedItem.artist && <p className="text-gray-400 mb-3">{selectedItem.artist}</p>}
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">{selectedItem.long_description || selectedItem.description}</p>
              
              {/* Rating Display */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-bold">{getRating(selectedItem)}</span>
                <span className="text-gray-400">/10</span>
                <span className="text-xs text-gray-500 ml-2">
                  based on {(selectedItem.stats_highly || 0) + (selectedItem.stats_recommended || 0) + (selectedItem.stats_not || 0)} votes
                </span>
              </div>
              
              <div className="flex gap-6 mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl text-teal-500">🔥</div>
                  <div className="text-xs text-gray-400 mt-1">HIGHLY RECOMMENDED</div>
                  <div className="font-bold">{selectedItem.stats_highly || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-blue-500">👍</div>
                  <div className="text-xs text-gray-400 mt-1">RECOMMENDED</div>
                  <div className="font-bold">{selectedItem.stats_recommended || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-gray-500">👎</div>
                  <div className="text-xs text-gray-400 mt-1">NOT RECOMMENDED</div>
                  <div className="font-bold">{selectedItem.stats_not || 0}</div>
                </div>
              </div>
              
              {/* Where to Watch / Listen */}
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">{selectedItem.type === 'movie' ? '📺 Where to Watch' : '🎧 Where to Listen'}</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedItem.platforms && selectedItem.platforms.length > 0 ? (
                    selectedItem.platforms.map((platform: string, idx: number) => {
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
                    })
                  ) : (
                    <p className="text-sm text-gray-500">Platform information coming soon</p>
                  )}
                </div>
              </div>
              
              {/* Movie Details */}
              {selectedItem.type === 'movie' && selectedItem.director && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div><span className="text-gray-400">🎬 Director:</span> {selectedItem.director}</div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedItem.year}</div>
                  <div><span className="text-gray-400">⏱️ Runtime:</span> {selectedItem.runtime || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedItem.genre}</div>
                </div>
              )}
              
              {/* Music Details */}
              {selectedItem.type === 'music' && selectedItem.artist && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                  <div className="col-span-2">
                    <span className="text-gray-400">🎤 Artist:</span>{' '}
                    <span className="text-teal-400">{selectedItem.artist}</span>
                  </div>
                  <div><span className="text-gray-400">📅 Year:</span> {selectedItem.year}</div>
                  <div><span className="text-gray-400">⏱️ Duration:</span> {selectedItem.duration || 'N/A'}</div>
                  <div><span className="text-gray-400">🎭 Genre:</span> {selectedItem.genre}</div>
                </div>
              )}
              
              {/* Cast Section for Movies */}
              {selectedItem.type === 'movie' && selectedItem.actors && selectedItem.actors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">⭐ Cast</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.actors.map((actor: string, idx: number) => (
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
              
              {/* Trailer/Audio Preview */}
              {selectedItem.trailer_url && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">
                    {selectedItem.type === 'music' ? '🎧 Audio Preview' : '▶️ Watch Trailer'}
                  </h3>
                  {selectedItem.type === 'music' ? (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <audio controls className="w-full" src={selectedItem.trailer_url}>
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-xs text-gray-500 mt-2 text-center">30-second preview</p>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe src={selectedItem.trailer_url} title={selectedItem.title} className="w-full h-full" allowFullScreen />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
                <ArrowLeft size={20} />
              </button>
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
                  className={`px-4 py-2 rounded-lg transition text-sm ${typeFilter === 'all' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => handleFilterChange('movie')}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm ${typeFilter === 'movie' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  <Film size={16} /> Movies
                </button>
                <button 
                  onClick={() => handleFilterChange('music')}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm ${typeFilter === 'music' ? 'bg-teal-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  <Music size={16} /> Music
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <select 
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                >
                  <option value="highly">🔥 Most Highly Recommended</option>
                  <option value="recommended">👍 Most Recommended</option>
                </select>

                <select 
                  value={genreFilter}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
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
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-gray-400">
              Found {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="group cursor-pointer">
                  <div className="relative rounded-xl overflow-hidden bg-gray-800">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}`
                      }}
                    />
                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold">{getRating(item)}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3 gap-2">
                      <button 
                        onClick={() => handleRecommend(item)}
                        className="w-full py-2 bg-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-700 transition flex items-center justify-center gap-2"
                      >
                        <ThumbsUp size={14} /> Recommend
                      </button>
                      <button 
                        onClick={() => handleViewDetails(item)}
                        className="w-full py-2 bg-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-600 transition flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={14} /> Details
                      </button>
                      <button 
                        onClick={() => addToWatchlist(item)}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${isInWatchlist(item.id) ? 'bg-teal-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <Heart size={14} className={isInWatchlist(item.id) ? 'fill-white' : ''} />
                        {isInWatchlist(item.id) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                    </div>
                    {isInWatchlist(item.id) && (
                      <div className="absolute top-2 left-2 bg-teal-600 rounded-full p-1">
                        <Heart size={10} className="fill-white" />
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
          </>
        )}
      </main>
    </div>
  )
}
