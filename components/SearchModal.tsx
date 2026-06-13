'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Search as SearchIcon, Film, Music, User } from 'lucide-react'
import { ContentItem } from '@/types/content'
import { useRouter } from 'next/navigation'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: ContentItem) => void
}

export default function SearchModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContentItem[]>([])
  const [actorResults, setActorResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length > 1) {
      searchContent()
    } else {
      setResults([])
      setActorResults([])
    }
  }, [query])

  const searchContent = async () => {
    setLoading(true)
    
    // Search for movies/music
    const { data: contentData } = await supabase
      .from('content')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .limit(20)
    
    // Search for actors in movie casts
    const { data: moviesWithActors } = await supabase
      .from('content')
      .select('actors')
      .eq('type', 'movie')
      .not('actors', 'is', null)
    
    // Extract unique actors that match the query
    const matchingActors = new Set<string>()
    moviesWithActors?.forEach(movie => {
      movie.actors?.forEach((actor: string) => {
        if (actor.toLowerCase().includes(query.toLowerCase())) {
          matchingActors.add(actor)
        }
      })
    })
    
    setResults(contentData || [])
    setActorResults(Array.from(matchingActors).slice(0, 10))
    setLoading(false)
  }

  const handleActorClick = (actorName: string) => {
    onClose()
    router.push(`/actor/${encodeURIComponent(actorName)}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* Close button - moved lower with mt-2 */}
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition">
            <X size={24} />
          </button>
        </div>
        
        <h2 className="text-2xl font-bold mb-6">Search</h2>
        
        <div className="relative mb-8">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search movies, music, actors, artists..."
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
        ) : (
          <div className="space-y-8">
            {/* Actor/Artist Results */}
            {actorResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User size={18} className="text-teal-500" />
                  Actors & Artists
                </h3>
                <div className="flex flex-wrap gap-2">
                  {actorResults.map((actor) => (
                    <button
                      key={actor}
                      onClick={() => handleActorClick(actor)}
                      className="px-4 py-2 bg-gray-800 rounded-full text-sm hover:bg-teal-600/30 hover:text-teal-400 transition"
                    >
                      {actor}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Content Results */}
            {results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <SearchIcon size={18} className="text-teal-500" />
                  Movies & Music
                </h3>
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
                          {item.artist && ` • ${item.artist}`}
                        </p>
                      </div>
                      {item.type === 'movie' ? <Film size={20} className="text-teal-500" /> : <Music size={20} className="text-teal-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {query.length > 1 && results.length === 0 && actorResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No results found for "{query}"</p>
              </div>
            )}
            
            {query.length <= 1 && (
              <div className="text-center py-12 text-gray-500">
                <p>Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
