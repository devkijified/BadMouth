'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRecommendations = async (type: string, mood: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, mood })
      })
      const data = await response.json()
      setRecommendations(data.recommendations)
    } catch (error) {
      toast.error('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  return { recommendations, loading, fetchRecommendations }
}
