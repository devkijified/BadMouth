'use client'

import { useState } from 'react'
import { ThumbsUp, MessageCircle, User, Share2 } from 'lucide-react'

interface Recommendation {
  id: string
  username: string
  avatar: string
  title: string
  type: 'movie' | 'music'
  recommendationTier: 'highly' | 'recommended' | 'not'
  comment: string
  likes: number
  replies: number
  timestamp: string
}

const sampleRecommendations: Recommendation[] = [
  {
    id: '1',
    username: 'movie_lover',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=movie_lover',
    title: 'The Dark Knight',
    type: 'movie',
    recommendationTier: 'highly',
    comment: 'This movie is absolutely incredible! Heath Ledger as Joker is unforgettable. A must-watch for everyone.',
    likes: 234,
    replies: 45,
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    username: 'music_fan',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=music_fan',
    title: 'Blinding Lights',
    type: 'music',
    recommendationTier: 'highly',
    comment: 'This song gives me so much energy! Perfect for workouts or late night drives.',
    likes: 189,
    replies: 23,
    timestamp: '5 hours ago'
  },
  {
    id: '3',
    username: 'critic',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=critic',
    title: 'Some Movie',
    type: 'movie',
    recommendationTier: 'not',
    comment: 'Honestly, this was disappointing. The plot made no sense and the acting was flat.',
    likes: 56,
    replies: 34,
    timestamp: '1 day ago'
  }
]

const tierEmojis = {
  highly: { emoji: '🔥', text: 'HIGHLY RECOMMENDED', color: 'bg-red-600/20 text-red-400 border-red-600/50' },
  recommended: { emoji: '👍', text: 'RECOMMENDED', color: 'bg-green-600/20 text-green-400 border-green-600/50' },
  not: { emoji: '👎', text: 'NOT RECOMMENDED', color: 'bg-gray-600/20 text-gray-400 border-gray-600/50' }
}

export default function SocialRecommendations() {
  const [recommendations] = useState(sampleRecommendations)
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const handleLike = (id: string) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <MessageCircle size={20} className="text-teal-500" />
        <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
        <span className="text-sm text-gray-500">({recommendations.length} new)</span>
      </div>

      <div className="space-y-4 px-4">
        {recommendations.map((rec) => {
          const tier = tierEmojis[rec.recommendationTier]
          return (
            <div key={rec.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-teal-500/50 transition">
              <div className="flex gap-3">
                <img src={rec.avatar} alt={rec.username} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{rec.username}</span>
                    <span className="text-xs text-gray-500">• {rec.timestamp}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full">
                      {rec.type === 'movie' ? '🎬 Movie' : '🎵 Music'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${tier.color}`}>
                      {tier.emoji} {tier.text}
                    </span>
                  </div>
                  <h3 className="font-bold mb-1">{rec.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{rec.comment}</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleLike(rec.id)}
                      className={`flex items-center gap-1 text-xs transition ${liked[rec.id] ? 'text-teal-500' : 'text-gray-400 hover:text-white'}`}
                    >
                      <ThumbsUp size={14} /> {liked[rec.id] ? rec.likes + 1 : rec.likes}
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                      <MessageCircle size={14} /> {rec.replies}
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
