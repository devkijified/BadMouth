'use client'

import { useState } from 'react'
import { searchDeezerMusic } from '@/app/actions/music'
import { Search, Loader2, X } from 'lucide-react'
import DeezerMusicCard from './DeezerMusicCard'

interface DeezerTrack {
  id: number
  title: string
  preview: string
  artist: { name: string }
  album: { title: string; cover_xl: string; cover_medium: string }
  duration: number
  rank: number
}

export default function MusicSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DeezerTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    const tracks = await searchDeezerMusic(query, 12)
    setResults(tracks)
    setShowResults(true)
    setLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for music by artist or song title..."
            className="w-full px-5 py-4 pl-12 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500 text-white placeholder-gray-400"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>
      
      {/* Results */}
      {showResults && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {results.length > 0 ? `Found ${results.length} tracks` : 'No results found'}
            </h3>
            <button
              onClick={() => setShowResults(false)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          
          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((track) => (
                <DeezerMusicCard
                  key={track.id}
                  track={track}
                  onRecommend={(t) => console.log('Recommended:', t.title)}
                  onViewDetails={(t) => console.log('View details:', t.title)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
