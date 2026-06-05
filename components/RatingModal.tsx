'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'

interface RatingModalProps {
  item: {
    id: string
    title: string
    image: string
    type: string
  }
  onClose: () => void
  onRate: (rating: number, comment: string) => void
}

export default function RatingModal({ item, onClose, onRate }: RatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 rounded-xl max-w-md w-full animate-fadeIn">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-xl font-semibold">Rate {item.title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <img src={item.image} alt={item.title} className="w-full h-32 object-cover rounded-lg mb-4" />

          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="text-4xl transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`${(hover || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder="Share your thoughts... (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            rows={3}
          />

          <button
            onClick={() => onRate(rating, comment)}
            disabled={rating === 0}
            className="w-full mt-4 py-2 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition"
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  )
}
