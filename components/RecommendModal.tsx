'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Star } from 'lucide-react'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface RecommendModalProps {
  isOpen: boolean
  onClose: () => void
  item: ContentItem | null
  userId: string
  onSuccess: () => void
}

export default function RecommendModal({ 
  isOpen, 
  onClose, 
  item, 
  userId, 
  onSuccess 
}: RecommendModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  if (!isOpen || !item) return null

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsLoading(true)

    try {
      // Check if user already recommended this
      const { data: existing } = await supabase
        .from('recommendations')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', item.id)
        .single()

      let error

      if (existing) {
        // Update existing recommendation
        const { error: updateError } = await supabase
          .from('recommendations')
          .update({ 
            rating: rating,
            comment: comment || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        error = updateError
      } else {
        // Insert new recommendation
        const { error: insertError } = await supabase
          .from('recommendations')
          .insert({
            user_id: userId,
            content_id: item.id,
            content_type: item.type,
            rating: rating,
            comment: comment || null
          })
        error = insertError
      }

      if (error) throw error

      // Update content rating
      // First get current ratings
      const { data: currentRatings } = await supabase
        .from('recommendations')
        .select('rating')
        .eq('content_id', item.id)

      if (currentRatings) {
        const totalRatings = currentRatings.length
        const avgRating = currentRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        
        await supabase
          .from('content')
          .update({
            rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            rating_count: totalRatings
          })
          .eq('id', item.id)
      }

      toast.success(`Rated "${item.title}" ${rating}/10!`)
      onSuccess()
      onClose()
      setRating(0)
      setComment('')
    } catch (error) {
      console.error('Error saving recommendation:', error)
      toast.error('Failed to save rating')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = () => {
    const stars = []
    const displayRating = hoverRating || rating
    
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setRating(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            size={32}
            className={`${
              i <= displayRating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-600'
            } transition-colors`}
          />
        </button>
      )
    }
    return stars
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <img 
              src={item.image_url} 
              alt={item.title} 
              className="w-12 h-12 rounded object-cover" 
            />
            <div>
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-xs text-gray-400">
                {item.artist || item.director || 'Unknown'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Rate this {item.type === 'movie' ? 'movie' : 'song'} (1-10)
            </label>
            <div className="flex justify-center gap-1 flex-wrap">
              {renderStars()}
            </div>
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-teal-400">
                {hoverRating || rating || '?'}
              </span>
              <span className="text-gray-400"> / 10</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you think? (optional)"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || rating === 0}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : `Submit ${rating}/10 Rating`}
          </button>
        </div>
      </div>
    </div>
  )
}
