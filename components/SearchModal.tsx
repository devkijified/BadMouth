'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Search as SearchIcon, Film, Music } from 'lucide-react'
import { ContentItem } from '@/types/content'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: ContentItem) => void
}

export default function SearchModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length > 1) {
      searchContent()
    } else {
      setResults([])
    }
  }, [query])

  const searchContent = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('content')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .limit(20)
    setResults(data || [])
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Search</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search movies or music..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500 text-lg"
            autoFocus
          />
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item)
                  onClose()
                  setQuery('')
                }}
                className="w-full flex items-center gap-4 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition text-left"
              >
                <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400">
                    {item.type === 'movie' ? '🎬 Movie' : '🎵 Music'} • {item.year}
                  </p>
                </div>
                {item.type === 'movie' ? <Film size={20} className="text-teal-500" /> : <Music size={20} className="text-teal-500" />}
              </button>
            ))}
          </div>
        ) : query.length > 1 ? (
          <div className="text-center py-12 text-gray-500">No results found</div>
        ) : null}
      </div>
    </div>
  )
}
