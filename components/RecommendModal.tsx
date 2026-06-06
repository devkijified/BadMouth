'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { ContentItem } from '@/types/content'
import toast from 'react-hot-toast'

interface RecommendModalProps {
  isOpen: boolean
  onClose: () => void
  item: ContentItem | null
  userId?: string
  onSuccess: () => void
}

export default function RecommendModal({ isOpen, onClose, item, onSuccess }: RecommendModalProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [existingTier, setExistingTier] = useState<string | null>(null)
  const [existingComment, setExistingComment] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)

  // Check if user already recommended this content
  useEffect(() => {
    if (isOpen && item) {
      checkExistingRecommendation()
    }
  }, [isOpen, item])

  const checkExistingRecommendation = async () => {
    try {
      const response = await fetch(`/api/recommendations/check?content_id=${item?.id}`)
      const data = await response.json()
      if (data.exists) {
        setHasExisting(true)
        setExistingTier(data.recommendation_tier)
        setExistingComment(data.comment || '')
        setExistingId(data.id)
        // Pre-fill form with existing values
        setSelectedTier(data.recommendation_tier)
        setComment(data.comment || '')
      } else {
        setHasExisting(false)
        setExistingTier(null)
        setExistingComment('')
        setSelectedTier(null)
        setComment('')
      }
    } catch (error) {
      console.error('Error checking existing:', error)
    }
  }

  const submitRecommendation = async () => {
    if (!selectedTier) {
      toast.error('Please select a recommendation tier')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: item?.id,
          content_type: item?.type,
          recommendation_tier: selectedTier,
          comment: comment || null,
          existing_id: existingId || null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }
      
      if (hasExisting) {
        toast.success(`✅ Updated your recommendation for "${item?.title}"!`)
      } else {
        toast.success(`✅ Thanks for recommending "${item?.title}"!`)
      }
      onSuccess()
      onClose()
      setSelectedTier(null)
      setComment('')
      setHasExisting(false)
      setExistingTier(null)
      setExistingId(null)
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to save recommendation')
    }
    
    setLoading(false)
  }

  if (!isOpen || !item) return null

  const tierIcons = {
    highly: { icon: '🔥', label: 'HIGHLY RECOMMENDED', color: 'teal' },
    recommended: { icon: '👍', label: 'RECOMMENDED', color: 'blue' },
    not: { icon: '👎', label: 'NOT RECOMMENDED', color: 'gray' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-semibold">
              {hasExisting ? 'Update Your Recommendation' : `Recommend ${item.title}`}
            </h3>
            {hasExisting && (
              <p className="text-xs text-teal-400 mt-1">
                You previously recommended this as {tierIcons[existingTier as keyof typeof tierIcons]?.icon} {tierIcons[existingTier as keyof typeof tierIcons]?.label}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4">
          <img 
            src={item.image_url} 
            alt={item.title} 
            className="w-full h-32 object-cover rounded-lg mb-4" 
            onError={(e) => { 
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(item.title)}` 
            }} 
          />
          <p className="text-center text-gray-400 mb-4">
            {hasExisting ? 'Update your recommendation' : 'How do you recommend this?'}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button 
              onClick={() => setSelectedTier('highly')} 
              className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${
                selectedTier === 'highly' 
                  ? 'bg-teal-600 border-teal-500 shadow-lg scale-105' 
                  : 'bg-teal-600/20 border-teal-600/50 hover:bg-teal-600/30 hover:scale-102'
              }`}
            >
              <span className="text-4xl mb-2">🔥</span>
              <span className="text-sm font-semibold">HIGHLY</span>
              {existingTier === 'highly' && (
                <span className="text-[10px] text-teal-400 mt-1">Your current</span>
              )}
            </button>
            <button 
              onClick={() => setSelectedTier('recommended')} 
              className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${
                selectedTier === 'recommended' 
                  ? 'bg-blue-600 border-blue-500 shadow-lg scale-105' 
                  : 'bg-blue-600/20 border-blue-600/50 hover:bg-blue-600/30 hover:scale-102'
              }`}
            >
              <span className="text-4xl mb-2">👍</span>
              <span className="text-sm font-semibold">RECOMMENDED</span>
              {existingTier === 'recommended' && (
                <span className="text-[10px] text-blue-400 mt-1">Your current</span>
              )}
            </button>
            <button 
              onClick={() => setSelectedTier('not')} 
              className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${
                selectedTier === 'not' 
                  ? 'bg-gray-600 border-gray-500 shadow-lg scale-105' 
                  : 'bg-gray-600/20 border-gray-600/50 hover:bg-gray-600/30 hover:scale-102'
              }`}
            >
              <span className="text-4xl mb-2">👎</span>
              <span className="text-sm font-semibold">NOT</span>
              {existingTier === 'not' && (
                <span className="text-[10px] text-gray-400 mt-1">Your current</span>
              )}
            </button>
          </div>
          <textarea
            placeholder="Why do you recommend this? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500"
            rows={3}
          />
          <button 
            onClick={submitRecommendation} 
            disabled={loading || !selectedTier} 
            className="w-full mt-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Saving...' : (hasExisting ? 'Update Recommendation' : 'Submit Recommendation')}
          </button>
          {hasExisting && (
            <p className="text-center text-xs text-gray-500 mt-3">
              💡 Updating will replace your previous recommendation
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
