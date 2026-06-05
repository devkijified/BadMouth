'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export const useRecommendations = () => {
  const [loading, setLoading] = useState(false)

  // Save a recommendation to Supabase
  const saveRecommendation = async (
    userId: string,
    contentId: string,
    contentType: 'movie' | 'music',
    tier: 'highly' | 'recommended' | 'not',
    comment: string = ''
  ) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          recommendation_tier: tier,
          comment
        })
      
      if (error) throw error
      toast.success(`Thanks for recommending! 👍`)
      return { success: true }
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error('Failed to save recommendation')
      return { success: false }
    }
  }

  // Load recommendations from Supabase
  const loadRecommendations = async (contentType?: 'movie' | 'music') => {
    try {
      let query = supabase
        .from('recommendations')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (contentType) {
        query = query.eq('content_type', contentType)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Load error:', error)
      return []
    }
  }

  // Save watchlist item
  const addToWatchlistDB = async (userId: string, contentId: string, contentType: 'movie' | 'music') => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .upsert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          added_at: new Date().toISOString()
        })
      
      if (error) throw error
      return { success: true }
    } catch (error: any) {
      console.error('Watchlist error:', error)
      return { success: false }
    }
  }

  // Load user's watchlist
  const loadWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('content_id, content_type')
        .eq('user_id', userId)
      
      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Load watchlist error:', error)
      return []
    }
  }

  return { 
    loading, 
    saveRecommendation, 
    loadRecommendations, 
    addToWatchlistDB,
    loadWatchlist 
  }
}
