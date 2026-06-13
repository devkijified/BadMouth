'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Loader2, Pencil } from 'lucide-react'
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
  const [existingId, setExistingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && item) {
      checkExistingRecommendation()
    }
  }, [isOpen, item])

  const checkExistingRecommendation = async () => {
    if (!item) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    const { data } = await supabase
      .from('recommendations')
      .select('id, recommendation_tier, comment')
      .eq('user_id', session.user.id)
      .eq('content_id', item.id)
      .maybeSingle()
    
    if (data) {
      setHasExisting(true)
      setExistingTier(data.recommendation_tier)
      setExistingId(data.id)
      setSelectedTier(data.recommendation_tier)
      setComment(data.comment || '')
    } else {
      setHasExisting(false)
      setExistingTier(null)
      setExistingId(null)
      setSelectedTier(null)
      setComment('')
    }
  }

  const submitRecommendation = async () => {
    if (!selectedTier) {
      toast.error('Please select a recommendation tier')
      return
    }
    
    if (!item) return
    
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in to recommend')
      setLoading(false)
      return
    }
    
    try {
      if (existingId) {
        // Update existing recommendation
        const { error } = await supabase
          .from('recommendations')
          .update({
            recommendation_tier: selectedTier,
            comment: comment || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId)
        
        if (error) throw error
        toast.success(`✅ Updated your recommendation for "${item.title}"!`)
      } else {
        // Insert new recommendation
        const { error } = await supabase
          .from('recommendations')
          .insert({
            user_id: session.user.id,
            content_id: item.id,
            content_type: item.type,
            recommendation_tier: selectedTier,
            comment: comment || null
          })
        
        if (error) throw error
        toast.success(`✅ Thanks for recommending "${item.title}"!`)
      }
      
      // Update content stats
      await updateContentStats(item.id, selectedTier, existingTier)
      
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

  const updateContentStats = async (contentId: string, newTier: string, oldTier: string | null) => {
    // Get current stats
    const { data: content } = await supabase
      .from('content')
      .select('stats_highly, stats_recommended, stats_not')
      .eq('id', contentId)
      .single()
    
    if (!content) return
    
    let newStats = { ...content }
    
    // Remove old tier vote if exists
    if (oldTier) {
      if (oldTier === 'highly') newStats.stats_highly = Math.max(0, (newStats.stats_highly || 0) - 1)
      else if (oldTier === 'recommended') newStats.stats_recommended = Math.max(0, (newStats.stats_recommended || 0) - 1)
      else if (oldTier === 'not') newStats.stats_not = Math.max(0, (newStats.stats_not || 0) - 1)
    }
    
    // Add new tier vote
    if (newTier === 'highly') newStats.stats_highly = (newStats.stats_highly || 0) + 1
    else if (newTier === 'recommended') newStats.stats_recommended = (newStats.stats_recommended || 0) + 1
    else if (newTier === 'not') newStats.stats_not = (newStats.stats_not || 0) + 1
    
    // Update content stats
    await supabase
      .from('content')
      .update({
        stats_highly: newStats.stats_highly,
        stats_recommended: newStats.stats_recommended,
        stats_not: newStats.stats_not
      })
      .eq('id', contentId)
    
    // Update rating scale
    const total = newStats.stats_highly + newStats.stats_recommended + newStats.stats_not
    const ratingScale = total > 0 
      ? Number(((newStats.stats_highly * 10 + newStats.stats_recommended * 7) / total).toFixed(1))
      : 0
    
    await supabase
      .from('content')
      .update({ rating_scale: ratingScale })
      .eq('id', contentId)
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-semibold">
              {hasExisting ? 'Update Your Recommendation' : `Recommend ${item.title}`}
            </h3>
            {hasExisting && (
              <p className="text-xs text-teal-400 mt-1 flex items-center gap-1">
                <Pencil size={10} /> Update your previous recommendation
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
                  : 'bg-teal-600/20 border-teal-600/50 hover:bg-teal-600/30'
              }`}
            >
              <span className="text-4xl mb-2">🔥</span>
              <span className="text-sm font-semibold">HIGHLY</span>
            </button>
            <button 
              onClick={() => setSelectedTier('recommended')} 
              className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${
                selectedTier === 'recommended' 
                  ? 'bg-blue-600 border-blue-500 shadow-lg scale-105' 
                  : 'bg-blue-600/20 border-blue-600/50 hover:bg-blue-600/30'
              }`}
            >
              <span className="text-4xl mb-2">👍</span>
              <span className="text-sm font-semibold">RECOMMENDED</span>
            </button>
            <button 
              onClick={() => setSelectedTier('not')} 
              className={`flex flex-col items-center p-4 rounded-xl transition border-2 ${
                selectedTier === 'not' 
                  ? 'bg-gray-600 border-gray-500 shadow-lg scale-105' 
                  : 'bg-gray-600/20 border-gray-600/50 hover:bg-gray-600/30'
              }`}
            >
              <span className="text-4xl mb-2">👎</span>
              <span className="text-sm font-semibold">NOT</span>
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
        </div>
      </div>
    </div>
  )
}
