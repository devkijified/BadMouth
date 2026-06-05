'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  image: string
  type: 'movie' | 'music'
  artist?: string
  year?: number
  stats: {
    highly: number  // 🔥
    recommended: number  // 👍
    not: number  // 👎
  }
}

interface ContentRowProps {
  title: string
  items: ContentItem[]
  type: 'movie' | 'music'
}

export default function ContentRow({ title, items, type }: ContentRowProps) {
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

  const handleRecommendClick = (item: ContentItem) => {
    setSelectedItem(item)
    setUserRecommendation(null)
    setShowModal(true)
  }

  const submitRecommendation = (tier: string) => {
    console.log('User recommended', selectedItem?.title, 'as:', tier)
    setShowModal(false)
    // Here you would save to Supabase
  }

  const getTotalVotes = (stats: ContentItem['stats']) => {
    return stats.highly + stats.recommended + stats.not
  }

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0
    return Math.round((count / total) * 100)
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
          {items.map((item) => {
            const totalVotes = getTotalVotes(item.stats)
            const highlyPercent = getPercentage(item.stats.highly, totalVotes)
            const recPercent = getPercentage(item.stats.recommended, totalVotes)
            const notPercent = getPercentage(item.stats.not, totalVotes)

            return (
              <div key={item.id} className="flex-shrink-0 w-[180px] md:w-[220px] group/item">
                <div className="relative rounded-lg overflow-hidden bg-gray-800">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-[240px] md:h-[280px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition flex flex-col justify-end p-3 gap-2">
                    <button 
                      onClick={() => handleRecommendClick(item)}
                      className="flex items-center justify-center gap-2 p-2 bg-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
                    >
                      👍 Recommend
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                  {item.artist && <p className="text-xs text-gray-400">{item.artist}</p>}
                  
                  {/* Recommendation Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex h-1.5 rounded-full overflow-hidden">
                      {highlyPercent > 0 && (
                        <div className="bg-red-600" style={{ width: `${highlyPercent}%` }} />
                      )}
                      {recPercent > 0 && (
                        <div className="bg-green-600" style={{ width: `${recPercent}%` }} />
                      )}
                      {notPercent > 0 && (
                        <div className="bg-gray-600" style={{ width: `${notPercent}%` }} />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>🔥</span>
                        <span>{item.stats.highly}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👍</span>
                        <span>{item.stats.recommended}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👎</span>
                        <span>{item.stats.not}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
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
          <div className="bg-gray-900 rounded-xl max-w-md w-full animate-fadeIn">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-xl font-semibold">Recommend {selectedItem.title}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                ✕
              </button>
            </div>
            <div className="p-4">
              <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-40 object-cover rounded-lg mb-4" />
              
              <p className="text-center text-gray-400 mb-4">How do you recommend this?</p>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => submitRecommendation('highly')}
                  className="flex flex-col items-center p-4 bg-red-600/20 hover:bg-red-600/30 rounded-xl transition border-2 border-red-600/50"
                >
                  <span className="text-4xl mb-2">🔥</span>
                  <span className="text-sm font-semibold">HIGHLY</span>
                  <span className="text-xs text-gray-400">Must-watch</span>
                </button>
                
                <button
                  onClick={() => submitRecommendation('recommended')}
                  className="flex flex-col items-center p-4 bg-green-600/20 hover:bg-green-600/30 rounded-xl transition border-2 border-green-600/50"
                >
                  <span className="text-4xl mb-2">👍</span>
                  <span className="text-sm font-semibold">RECOMMENDED</span>
                  <span className="text-xs text-gray-400">Good, worth it</span>
                </button>
                
                <button
                  onClick={() => submitRecommendation('not')}
                  className="flex flex-col items-center p-4 bg-gray-600/20 hover:bg-gray-600/30 rounded-xl transition border-2 border-gray-600/50"
                >
                  <span className="text-4xl mb-2">👎</span>
                  <span className="text-sm font-semibold">NOT</span>
                  <span className="text-xs text-gray-400">Skip it</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
