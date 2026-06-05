'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

export default function AuthPage() {
  const { signUp, signIn } = useAuth()
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    let result
    if (isLogin) {
      result = await signIn(email, password)
    } else {
      result = await signUp(email, password, username)
    }
    
    setIsLoading(false)
    if (result.success) {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            BADMOUTH
          </h1>
          <p className="text-gray-400 text-sm mt-2">Your AI-powered recommendation engine</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${isLogin ? 'bg-gradient-to-r from-green-600 to-teal-600' : 'bg-gray-700 text-gray-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${!isLogin ? 'bg-gradient-to-r from-green-600 to-teal-600' : 'bg-gray-700 text-gray-400'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-green-500"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-green-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-green-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
