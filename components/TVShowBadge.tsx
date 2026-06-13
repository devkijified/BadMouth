'use client'

import { Tv, Calendar, Clock, Layers } from 'lucide-react'

interface TVShowBadgeProps {
  seasons?: number
  episodes?: number
  status?: string
  year?: number
}

export default function TVShowBadge({ seasons, episodes, status, year }: TVShowBadgeProps) {
  return (
    <div className="absolute top-2 left-2 flex gap-1">
      <div className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
        <Tv size={10} /> TV Series
      </div>
      {seasons && (
        <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Layers size={10} /> {seasons} Season{seasons !== 1 ? 's' : ''}
        </div>
      )}
      {episodes && (
        <div className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Clock size={10} /> {episodes} Episodes
        </div>
      )}
      {status === 'Returning Series' && (
        <div className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
          Returning
        </div>
      )}
    </div>
  )
}
