'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MessageCircle, ThumbsUp } from 'lucide-react'

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
}

export default function ContentRow({ title, items, type, onViewDetails }: ContentRowProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [userRecommendation, setUserRecommendation] = useState<string | null>(null)

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${title.replace(/\s/g, '')}`)
    if (container) {
      const scrollAmount = 300
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const handleRecommend = (item: ContentItem) => {
    setSelectedItem(item)
    setUserRecommendation(null)
    setShowModal(true)
  }

  const submitRecommendation = async (tier: string) => {
    console.log('User recommended', selectedItem?.title, 'as:', tier)
    // Here you would save to Supabase
    setShowModal(false)
    // Show success message
    alert(`Thank you! You recommended "${selectedItem?.title}" as ${tier === 'highly' ? '🔥 HIGHLY RECOMMENDED' : tier === 'recommended' ? '👍 RECOMMENDED' : '👎 NOT RECOMMENDED'}`)
  }

  const getTotalVotes = (stats: ContentItem['stats']) => {
    return stats.highly + stats.recommended + stats.not
  }

  const getDominantTier = (stats: ContentItem['stats']) => {
    const total = getTotalVotes(stats)
    if (stats.highly > stats.recommended && stats.highly > stats.not) return 'highly'
    if (stats.recommended > stats.highly && stats.recommended > stats.not) return 'recommended'
    if (stats.not > stats.highly && stats.not > stats.recommended) return 'not'
    return 'none'
  }

  const getBorderColor = (stats: ContentItem['stats']) => {
    const dominant = getDominantTier(stats)
    switch(dominant) {
      case 'highly': return 'border-red-600'
      case 'recommended': return 'border-green-600'
      case 'not': return 'border-gray-600'
      default: return 'border-gray-700'
    }
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        <button className="text-sm text-teal-400 hover:text-teal-300 transition">View All →</button>
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
                    onClick={() => handleRecommend(item)}
                    className="flex items-center justify-center gap-2 p-2 bg-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
                  >
                    <ThumbsUp size={16} /> Recommend
                  </button>
                  <button 
                    onClick={() => onViewDetails(item)}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-600/70 rounded-lg text-sm font-semibold hover:bg-gray-600 transition"
                  >
                    <MessageCircle size={16} /> Details
                  </button>
                </div>
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                {item.artist && <p className="text-xs text-gray-400">{item.artist}</p>}
                <div className="flex justify-between mt-2 text-xs">
                  <span className="flex items-center gap-0.5"><span className="text-red-500">🔥</span> {item.stats.highly}</span>
                  <span className="flex items-center gap-0.5"><span className="text-green-500">👍</span> {item.stats.recommended}</span>
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
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">✕</button>
            </div>
            <div className="p-4">
              <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-32 object-cover rounded-lg mb-4" />
              <p className="text-center text-gray-400 mb-4">How do you recommend this?</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => submitRecommendation('highly')} className="flex flex-col items-center p-4 bg-red-600/20 hover:bg-red-600/30 rounded-xl transition border-2 border-red-600/50">
                  <span className="text-4xl mb-2">🔥</span>
                  <span className="text-sm font-semibold">HIGHLY</span>
                </button>
                <button onClick={() => submitRecommendation('recommended')} className="flex flex-col items-center p-4 bg-green-600/20 hover:bg-green-600/30 rounded-xl transition border-2 border-green-600/50">
                  <span className="text-4xl mb-2">👍</span>
                  <span className="text-sm font-semibold">RECOMMENDED</span>
                </button>
                <button onClick={() => submitRecommendation('not')} className="flex flex-col items-center p-4 bg-gray-600/20 hover:bg-gray-600/30 rounded-xl transition border-2 border-gray-600/50">
                  <span className="text-4xl mb-2">👎</span>
                  <span className="text-sm font-semibold">NOT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
