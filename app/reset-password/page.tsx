'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      console.log('Token from URL:', token)
      
      if (!token) {
        toast.error('No reset token provided')
        router.push('/auth')
        return
      }

      // Direct query to find user by reset_token
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('reset_token', token)

      console.log('Query result:', { data, error })

      if (error) {
        console.error('Query error:', error)
        toast.error('Database error')
        router.push('/auth')
        return
      }

      if (!data || data.length === 0) {
        console.log('No user found with token:', token)
        toast.error('Invalid reset link')
        router.push('/auth')
        return
      }

      const user = data[0]
      console.log('Found user:', user.email, user.reset_expires)

      // Check expiration
      const expires = new Date(user.reset_expires)
      const now = new Date()
      
      if (expires < now) {
        console.log('Token expired:', expires, 'Now:', now)
        toast.error('Reset link has expired')
        router.push('/auth')
        return
      }

      setUserEmail(user.email)
      setIsValid(true)
    }

    validateToken()
  }, [token, router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    setIsLoading(true)
    
    try {
      // First, sign in the user (they have a valid reset token)
      // Get user data
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single()

      if (!userData) {
        toast.error('User not found')
        return
      }

      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Update error:', updateError)
        toast.error(updateError.message)
        return
      }
      
      // Clear the reset token
      await supabase
        .from('profiles')
        .update({ reset_token: null, reset_expires: null })
        .eq('email', userEmail)
      
      toast.success('Password updated! Please sign in.')
      router.push('/auth')
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              Create New Password
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl font-medium"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
