'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Shield, Users, Film, Music } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminPage() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState({ totalUsers: 0, totalMovies: 0, totalMusic: 0 })

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()

    if (profile?.role === 'admin') {
      setIsAdmin(true)
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: totalMovies } = await supabase.from('movies').select('*', { count: 'exact', head: true })
      const { count: totalMusic } = await supabase.from('music').select('*', { count: 'exact', head: true })
      setStats({ totalUsers: totalUsers || 0, totalMovies: totalMovies || 0, totalMusic: totalMusic || 0 })
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-400">Admin privileges required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-400">Total Users</p><p className="text-3xl font-bold">{stats.totalUsers}</p></div>
            <Users size={32} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-400">Movies</p><p className="text-3xl font-bold">{stats.totalMovies}</p></div>
            <Film size={32} className="text-red-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-400">Music</p><p className="text-3xl font-bold">{stats.totalMusic}</p></div>
            <Music size={32} className="text-purple-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
