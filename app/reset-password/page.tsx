'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
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
  const [username, setUsername] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      console.log('Validating token:', token)
      
      if (!token) {
        toast.error('Invalid reset link')
        router.push('/auth')
        return
      }

      // Check if token exists in profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, username, reset_expires')
        .eq('reset_token', token)
        .single()

      console.log('Profile found:', profile)
      console.log('Error:', error)

      if (error || !profile) {
        toast.error('Invalid or expired reset link')
        router.push('/auth')
        return
      }

      // Check if expired
      if (new Date(profile.reset_expires) < new Date()) {
        toast.error('Reset link has expired. Please request a new one.')
        router.push('/auth')
        return
      }

      setUserEmail(profile.email)
      setUsername(profile.username)
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
      console.log('Updating password for user:', userEmail)
      
      // First, sign in the user (they have a valid reset token)
      // Then update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Update error:', updateError)
        toast.error('Failed to update password. Please request a new reset link.')
        return
      }
      
      // Clear reset token
      await supabase
        .from('profiles')
        .update({ reset_token: null, reset_expires: null })
        .eq('email', userEmail)
      
      toast.success(`Password updated successfully! Please sign in.`)
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
              Hello {username}, enter your new password below
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

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle size={18} />}
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
