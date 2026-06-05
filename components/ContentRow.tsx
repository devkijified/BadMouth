'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Heart, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface ContentItem {
  id: string
  title: string
  image: string
  type: 'movie' | 'music'
  artist?: string
  year?: number
  stats: { highly: number; recommended: number; not: number }
}

interface ContentRowProps {
  title: string
  items: ContentItem[]
  type: 'movie' | 'music'
  onViewDetails: (item: ContentItem) => void
  onAddToWatchlist?: (id: string) => void
  onRemoveFromWatchlist?: (id: string) => void
  isInWatchlist?: (id: string) => boolean
}

export default function ContentRow({ 
  title, 
  items, 
  type, 
  onViewDetails, 
  onAddToWatchlist, 
  onRemoveFromWatchlist, 
  isInWatchlist 
}: ContentRowProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    return user
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${title.replace(/\s/g, '')}`)
    if (container) {
      const scrollAmount = 300
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const handleRecommendClick = async (item: ContentItem) => {
    const currentUser = await getUser()
    if (!currentUser) {
      toast.error('Please sign in to recommend')
      return
    }
    setSelectedItem(item)
    setSelectedTier(null)
    setComment('')
    setShowModal(true)
  }

  const submitRecommendation = async () => {
    if (!selectedTier) {
      toast.error('Please select a recommendation tier')
      return
    }
    
    setSaving(true)
    const currentUser = await getUser()
    
    const { error } = await supabase
      .from('recommendations')
      .insert({
        user_id: currentUser?.id,
        content_id: selectedItem?.id,
        content_type: type,
        recommendation_tier: selectedTier,
        comment: comment,
        content_title: selectedItem?.title
      })
    
    if (error) {
      console.error('Error:', error)
      toast.error('Failed to save recommendation')
    } else {
      toast.success(`Thanks for recommending "${selectedItem?.title}"!`)
      setShowModal(false)
    }
    setSaving(false)
  }

  const getBorderColor = (stats: ContentItem['stats']) => {
    if (stats.highly > stats.recommended && stats.highly > stats.not) return 'border-green-500'
    if (stats.recommended > stats.highly && stats.recommended > stats.not) return 'border-blue-500'
    if (stats.not > stats.highly && stats.not > stats.recommended) return 'border-gray-500'
    return 'border-gray-700'
  }

  if (items.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-3 px-4">{title}</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No {type === 'movie' ? 'movies' : 'music'} found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        <button className="text-sm text-green-400 hover:text-green-300 transition">View All →</button>
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-r-lg opacity-0 group-hover:opacity-100 transition"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          id={`scroll-${title.replace(/\s/g, '')}`}
          className="flex gap-4 overflow-x-auto scroll-container px-4 pb-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`flex-shrink-0 w-[180px] md:w-[220px] group/item rounded-lg border-2 transition-all ${getBorderColor(item.stats)} hover:scale-105`}
            >
              <div className="relative rounded-lg overflow-hidden bg-gray-800">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-[240px] md:h-[280px] object-cover cursor-pointer"
                  onClick={() => onViewDetails(item)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition flex flex-col justify-end p-3 gap-2">
                  <button 
                    onClick={() => handleRecommendClick(item)}
                    className="flex items-center justify-center gap-2 p-2 bg-green-600 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                  >
                    <ThumbsUp size={16} /> Recommend
                  </button>
                  <button 
                    onClick={() => onViewDetails(item)}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-600/70 rounded-lg text-sm font-semibold hover:bg-gray-600 transition"
                  >
                    <MessageCircle size={16} /> Details
                  </button>
                  {isInWatchlist && (
                    <button 
                      onClick={() => isInWatchlist(item.id) ? onRemoveFromWatchlist?.(item.id) : onAddToWatchlist?.(item.id)}
                      className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition ${isInWatchlist(item.id) ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <Heart size={16} className={isInWatchlist(item.id) ? 'fill-white' : ''} />
                      {isInWatchlist(item.id) ? 'In Watchlist' : 'Watchlist'}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                {item.artist && <p className="text-xs text-gray-400">{item.artist}</p>}
                <div className="flex justify-between mt-2 text-xs">
                  <span className="flex items-center gap-0.5"><span className="text-green-500">🔥</span> {item.stats.highly}</span>
                  <span className="flex items-center gap-0.5"><span className="text-blue-500">👍</span> {item.stats.recommended}</span>
                  <span className="flex items-center gap-0.5"><span className="text-gray-500">👎</span> {item.stats.not}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 rounded-l-lg opacity-0 group-hover:opacity-100 transition"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Recommendation Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-xl font-semibold">Recommend {selectedItem.title}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                ✕
              </button>
            </div>
            <div className="p-4">
              <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-32 object-cover rounded-lg mb-4" />
              <p className="text-center text-gray-400 mb-4">How do you recommend this?</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button 
                  onClick={() => setSelectedTier('highly')}
                  className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${selectedTier === 'highly' ? 'bg-green-600 border-green-500' : 'bg-green-600/20 border-green-600/50 hover:bg-green-600/30'}`}
                >
                  <span className="text-4xl mb-2">🔥</span>
                  <span className="text-sm font-semibold">HIGHLY</span>
                </button>
                <button 
                  onClick={() => setSelectedTier('recommended')}
                  className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${selectedTier === 'recommended' ? 'bg-blue-600 border-blue-500' : 'bg-blue-600/20 border-blue-600/50 hover:bg-blue-600/30'}`}
                >
                  <span className="text-4xl mb-2">👍</span>
                  <span className="text-sm font-semibold">RECOMMENDED</span>
                </button>
                <button 
                  onClick={() => setSelectedTier('not')}
                  className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${selectedTier === 'not' ? 'bg-gray-600 border-gray-500' : 'bg-gray-600/20 border-gray-600/50 hover:bg-gray-600/30'}`}
                >
                  <span className="text-4xl mb-2">👎</span>
                  <span className="text-sm font-semibold">NOT</span>
                </button>
              </div>
              <textarea
                placeholder="Why do you recommend this? (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                rows={3}
              />
              <button
                onClick={submitRecommendation}
                disabled={saving || !selectedTier}
                className="w-full mt-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition"
              >
                {saving ? 'Saving...' : 'Submit Recommendation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
