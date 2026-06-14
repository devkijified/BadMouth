'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
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
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingUser, setPendingUser] = useState<any>(null)

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

  // Generate random verification code
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Send email via Resend
  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html, from: 'BADMOUTH <onboarding@resend.dev>' })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false }
    }
  }

  // Send verification email
  const sendVerificationEmail = async (email: string, code: string, username: string) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #14b8a6, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 36px; font-weight: bold; text-align: center; padding: 20px; background: #e0e0e0; border-radius: 10px; letter-spacing: 5px; font-family: monospace; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Welcome to BADMOUTH!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>Thank you for joining BADMOUTH! Please verify your email address using the code below:</p>
            <div class="code">${code}</div>
            <p>Enter this code in the app to complete your registration.</p>
            <p>This code will expire in 10 minutes.</p>
            <p>Happy exploring!</p>
            <p>- The BADMOUTH Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 BADMOUTH. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    return sendEmail(email, 'Verify Your BADMOUTH Account', html)
  }

  // Send password reset email
  const sendPasswordResetEmail = async (email: string, resetToken: string, username: string) => {
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #14b8a6, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>We received a request to reset your password for your BADMOUTH account.</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
            <div class="warning">
              <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
            <p>- The BADMOUTH Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 BADMOUTH. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    return sendEmail(email, 'Reset Your BADMOUTH Password', html)
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
        setUsername(finalUsername)
      }

      // Generate verification code
      const code = generateVerificationCode()
      
      // Store registration data temporarily
      localStorage.setItem('pendingRegistration', JSON.stringify({
        email,
        password,
        username: finalUsername,
        code,
        expires: Date.now() + 10 * 60 * 1000
      }))

      // Send verification email
      await sendVerificationEmail(email, code, finalUsername)
      
      toast.success('Verification code sent! Please check your email.')
      setPendingUser({ email, password, username: finalUsername })
      setVerificationCode('')
      setShowVerification(true)
    } else {
      // LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else if (data.user) {
        toast.success('Welcome back!')
        router.push('/')
      }
    }
    
    setIsLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    const pending = localStorage.getItem('pendingRegistration')
    if (!pending) {
      toast.error('Registration session expired. Please try again.')
      setShowVerification(false)
      return
    }

    const { email, password, username, code, expires } = JSON.parse(pending)

    if (Date.now() > expires) {
      toast.error('Verification code expired. Please register again.')
      localStorage.removeItem('pendingRegistration')
      setShowVerification(false)
      return
    }

    if (verificationCode !== code) {
      toast.error('Invalid verification code')
      return
    }

    setIsLoading(true)

    // Create account in Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      }
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    if (data.user) {
      // Profile will be created automatically by trigger
      localStorage.removeItem('pendingRegistration')
      toast.success('Account created successfully! You can now sign in.')
      setShowVerification(false)
      setIsLogin(true)
      setEmail(email)
      setPassword('')
      setUsername('')
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
      // Check if user exists in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('email', resetEmail)
        .single()

      if (profileError || !profile) {
        toast.error('No account found with this email address')
        setIsResetting(false)
        return
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      const resetExpires = new Date(Date.now() + 3600000).toISOString()
      
      // Store reset token
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ reset_token: resetToken, reset_expires: resetExpires })
        .eq('email', resetEmail)

      if (updateError) {
        console.error('Error saving reset token:', updateError)
        toast.error('Failed to process reset request')
        setIsResetting(false)
        return
      }

      // Send reset email
      await sendPasswordResetEmail(resetEmail, resetToken, profile.username)
      
      toast.success('Password reset link sent! Check your email.')
      setShowResetPassword(false)
      setResetEmail('')
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Failed to send reset email. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  // Verification Modal
  if (showVerification) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-teal-600 to-blue-600 rounded-full flex items-center justify-center">
                <Mail className="text-white" size={28} />
              </div>
              <h2 className="text-2xl font-bold">Verify Your Email</h2>
              <p className="text-gray-400 text-sm mt-2">
                We've sent a verification code to<br />
                <span className="text-teal-400">{pendingUser?.email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter 6-digit verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-teal-500 text-center text-2xl tracking-widest"
                maxLength={6}
              />
              
              <button
                onClick={handleVerifyCode}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle size={18} />}
                {isLoading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              
              <button
                onClick={() => {
                  setShowVerification(false)
                  localStorage.removeItem('pendingRegistration')
                }}
                className="w-full py-2 text-gray-400 hover:text-white transition"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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
