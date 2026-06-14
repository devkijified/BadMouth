'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Format username: remove spaces, replace with underscore
  const formatUsername = (input: string): string => {
    let formatted = input.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    formatted = formatted.toLowerCase()
    return formatted
  }

  // Check if username already exists
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()
    return !!data
  }

  // Generate unique username
  const generateUniqueUsername = async (baseUsername: string): Promise<string> => {
    let uniqueUsername = baseUsername
    let counter = 1
    while (await checkUsernameExists(uniqueUsername)) {
      uniqueUsername = `${baseUsername}${counter}`
      counter++
    }
    return uniqueUsername
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    value = value.replace(/\s+/g, '_')
    value = value.replace(/[^a-zA-Z0-9_]/g, '')
    value = value.toLowerCase()
    setUsername(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!isLogin) {
      // REGISTRATION
      if (!username.trim()) {
        toast.error('Username is required')
        setIsLoading(false)
        return
      }

      if (username.length < 3) {
        toast.error('Username must be at least 3 characters')
        setIsLoading(false)
        return
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setIsLoading(false)
        return
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast.error('Please enter a valid email address')
        setIsLoading(false)
        return
      }

      // Format and check username
      let finalUsername = formatUsername(username)
      const exists = await checkUsernameExists(finalUsername)
      if (exists) {
        finalUsername = await generateUniqueUsername(finalUsername)
        toast.success(`Username "${username}" was taken. Using "${finalUsername}" instead.`)
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: finalUsername },
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Email already registered. Please sign in instead.')
          setIsLogin(true)
        } else {
          toast.error(error.message)
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Check if profile already exists (might have been created by trigger)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          // Create profile in profiles table
          await supabase.from('profiles').insert([{
            id: data.user.id,
            username: finalUsername,
            email: email,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`,
            role: 'user',
            is_active: true
          }])
        }

        toast.success('Account created! Please check your email to verify your account.')
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setUsername('')
      }
    } else {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in. Check your inbox!')
        } else {
          toast.error('Invalid email or password')
        }
      } else {
        toast.success('Welcome back!')
        router.push('/')
      }
    }
    
    setIsLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsResetting(true)
    
    try {
      // First check if user exists in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('email', resetEmail)
        .single()

      if (profileError || !profile) {
        toast.error('No account found with this email address')
        setIsResetting(false)
        return
      }

      // Use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error

      toast.success('Password reset email sent! Check your inbox (including spam folder).')
      setShowResetPassword(false)
      setResetEmail('')
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Failed to send reset email')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            BADMOUTH
          </h1>
          <p className="text-gray-400 text-sm mt-2">Your AI-powered recommendation engine</p>
        </div>

        {/* Reset Password Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Reset Password</h2>
                <button onClick={() => setShowResetPassword(false)} className="p-1 hover:bg-gray-800 rounded">
                  <ArrowLeft size={20} />
                </button>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                  required
                />
                
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send Reset Email'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setIsLogin(true)
                setShowResetPassword(false)
              }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${isLogin ? 'bg-gradient-to-r from-teal-600 to-blue-600' : 'bg-gray-700 text-gray-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false)
                setShowResetPassword(false)
              }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition ${!isLogin ? 'bg-gradient-to-r from-teal-600 to-blue-600' : 'bg-gray-700 text-gray-400'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Username (letters, numbers, _ only)"
                    value={username}
                    onChange={handleUsernameChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Spaces will be replaced with _ • Only letters, numbers, and underscores
                </p>
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-teal-400 hover:text-teal-300 transition text-right block w-full"
              >
                Forgot password?
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
