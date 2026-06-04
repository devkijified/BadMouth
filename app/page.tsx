'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const { user, signInWithGoogle } = useAuth()
  const [selectedMood, setSelectedMood] = useState('')

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
            BADMOUTH
          </h1>
          <p className="text-gray-400 mb-8">Your AI-powered movie & music recommendation engine</p>
          <button
            onClick={signInWithGoogle}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg transition transform hover:scale-105"
          >
            Get Started with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center">Welcome to BADMOUTH</h1>
        <p className="text-center text-gray-400 mt-2">Select a mood to get recommendations</p>
      </div>
    </div>
  )
}
