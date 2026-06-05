'use client'

import { useState } from 'react'
import { ThumbsUp, MessageCircle, User } from 'lucide-react'

interface Recommendation {
  id: string
  username: string
  avatar: string
  title: string
  type: 'movie' | 'music'
  reason: string
  likes: number
  comments: number
}

const sampleRecommendations: Recommendation[] = [
  {
    id: '1',
    username: 'movie_lover',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=movie_lover',
    title: 'The Dark Knight',
    type: 'movie',
    reason: 'Best Batman movie ever! The acting, the story, everything is perfect.',
    likes: 234,
    comments: 45
  },
  {
    id: '2',
    username: 'music_fan',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=music_fan',
    title: 'Blinding Lights',
    type: 'music',
    reason: 'This song gives me so much energy! Perfect for workouts.',
    likes: 189,
    comments: 23
  }
]

export default function SocialRecommendations() {
  const [recommendations] = useState(sampleRecommendations)

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4">
        <MessageCircle size={20} className="text-purple-500" />
        <h2 className="text-xl md:text-2xl font-semibold">Community Recommendations</h2>
      </div>

      <div className="space-y-3 px-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex gap-3">
              <img src={rec.avatar} alt={rec.username} className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{rec.username}</span>
                  <span className="text-xs text-gray-500">recommends</span>
                  <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded-full">
                    {rec.type}
                  </span>
                </div>
                <h3 className="font-bold mb-1">{rec.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{rec.reason}</p>
                <div className="flex gap-4">
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                    <ThumbsUp size={14} /> {rec.likes}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                    <MessageCircle size={14} /> {rec.comments}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
