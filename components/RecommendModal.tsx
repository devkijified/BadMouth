'use client'

import { useState, useEffect } from 'react'
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
  const [existingRating, setExistingRating] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && item && userId) {
      checkExistingRating()
    }
  }, [isOpen, item, userId])

  const checkExistingRating = async () => {
    if (!item || !userId) return
    
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('rating, comment')
        .eq('user_id', userId)
        .eq('content_id', item.id)  // content_id is TEXT, item.id is string
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing rating:', error)
        return
      }

      if (data) {
        setExistingRating(data.rating)
        setRating(data.rating)
        setComment(data.comment || '')
      } else {
        setExistingRating(null)
        setRating(0)
        setComment('')
      }
    } catch (error) {
      console.error('Error checking existing rating:', error)
    }
  }

  if (!isOpen || !item) return null

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsLoading(true)

    try {
      // Check if user already rated this
      const { data: existing, error: checkError } = await supabase
        .from('recommendations')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', item.id)  // content_id is TEXT
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Check error:', checkError)
        throw new Error(checkError.message)
      }

      let error

      if (existing) {
        // Update existing rating
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
        // Insert new rating
        const { error: insertError } = await supabase
          .from('recommendations')
          .insert({
            user_id: userId,
            content_id: item.id,  // content_id is TEXT
            content_type: item.type,
            rating: rating,
            comment: comment || null
          })
        error = insertError
      }

      if (error) {
        console.error('Save error:', error)
        throw new Error(error.message)
      }

      // Update content rating
      const { data: allRatings, error: ratingsError } = await supabase
        .from('recommendations')
        .select('rating')
        .eq('content_id', item.id)  // content_id is TEXT

      if (ratingsError) {
        console.error('Ratings fetch error:', ratingsError)
      } else if (allRatings && allRatings.length > 0) {
        const totalRatings = allRatings.length
        const avgRating = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
        
        const { error: updateContentError } = await supabase
          .from('content')
          .update({
            rating: Math.round(avgRating * 10) / 10,
            rating_count: totalRatings
          })
          .eq('id', item.id)  // item.id is string (UUID)
          .select()

        if (updateContentError) {
          console.error('Content update error:', updateContentError)
        }
      }

      toast.success(`Rated "${item.title}" ${rating}/10!`)
      onSuccess()
      onClose()
      setRating(0)
      setComment('')
      setExistingRating(null)
    } catch (error: any) {
      console.error('Error saving rating:', error)
      toast.error(error.message || 'Failed to save rating. Please try again.')
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80">
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
              {existingRating ? 'Update your rating' : 'Rate this'} (1-10)
            </label>
            <div className="flex justify-center gap-1 flex-wrap">
              {renderStars()}
            </div>
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-teal-400">
                {hoverRating || rating || '?'}
              </span>
              <span className="text-gray-400"> / 10</span>
              {existingRating && (
                <p className="text-xs text-gray-500 mt-1">Current rating: {existingRating}/10</p>
              )}
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
            {isLoading ? 'Saving...' : existingRating ? `Update ${rating}/10 Rating` : `Submit ${rating}/10 Rating`}
          </button>
        </div>
      </div>
    </div>
  )
}
