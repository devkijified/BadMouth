'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  Plus, Edit, Trash2, Film, Music, Layers, Shield, X, 
  Users, TrendingUp, Settings, Heart, Star, Search as SearchIcon,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Import the server action we created
import { searchDeezerServer } from '@/app/actions/deezer'

// Define types locally to avoid import issues
interface Category {
  id: string
  name: string
  description: string
  type: 'movie' | 'music'
  is_active: boolean
  display_order: number
}

interface ContentItem {
  id: string
  title: string
  description: string
  long_description: string | null
  image_url: string
  backdrop_url: string | null
  type: 'movie' | 'music'
  year: number
  director: string | null
  artist: string | null
  actors: string[] | null
  platforms: string[]
  trailer_url: string | null
  runtime: string | null
  duration: string | null
  genre: string
  stats_highly: number
  stats_recommended: number
  stats_not: number
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'categories' | 'content' | 'users' | 'analytics' | 'settings'>('categories')
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Search/filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'movie' | 'music'>('all')
  
  // Deezer search states
  const [deezerSearchResults, setDeezerSearchResults] = useState<any[]>([])
  const [showDeezerSearch, setShowDeezerSearch] = useState(false)
  const [deezerSearchQuery, setDeezerSearchQuery] = useState('')
  const [searchingDeezer, setSearchingDeezer] = useState(false)

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'movie' as 'movie' | 'music',
    is_active: true,
    display_order: 0
  })

  // Content form state
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    long_description: '',
    image_url: '',
    backdrop_url: '',
    type: 'movie' as 'movie' | 'music',
    year: new Date().getFullYear(),
    director: '',
    artist: '',
    actors: '',
    platforms: '',
    trailer_url: '',
    runtime: '',
    duration: '',
    genre: '',
    stats_highly: 0,
    stats_recommended: 0,
    stats_not: 0,
    category_ids: [] as string[]
  })

  useEffect(() => {
    if (!authLoading) {
      checkAdminAndLoadData()
    }
  }, [authLoading, user])

  const checkAdminAndLoadData = async () => {
    if (user?.email === 'kijified@gmail.com') {
      setIsAdmin(true)
      await Promise.all([
        loadCategories(),
        loadContent(),
        loadUsers(),
        loadRecommendations()
      ])
      setLoading(false)
      return
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()
    
    if (profile?.role === 'admin') {
      setIsAdmin(true)
      await Promise.all([
        loadCategories(),
        loadContent(),
        loadUsers(),
        loadRecommendations()
      ])
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('display_order')
    setCategories(data || [])
  }

  const loadContent = async () => {
    const { data } = await supabase.from('content').select('*').order('created_at', { ascending: false })
    setContent(data || [])
  }

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*')
    setUsers(profiles || [])
  }

  const loadRecommendations = async () => {
    const { data } = await supabase
      .from('recommendations')
      .select('*, profiles(username), content(title)')
      .order('created_at', { ascending: false })
      .limit(50)
    setRecommendations(data || [])
  }

  // --- UPDATED DEEZER FETCH LOGIC ---
  const searchDeezerForMusic = async () => {
    if (!deezerSearchQuery.trim()) {
      toast.error('Please enter a song or artist name')
      return
    }

    setSearchingDeezer(true)
    try {
      const result = await searchDeezerServer(deezerSearchQuery)
      
      if (result.success && result.data && result.data.length > 0) {
        setDeezerSearchResults(result.data)
        toast.success(`Found ${result.data.length} results`)
      } else {
        setDeezerSearchResults([])
        toast.error('No results found. Try different search terms.')
      }
    } catch (error) {
      console.error('Deezer search error:', error)
      toast.error('Failed to search Deezer')
    } finally {
      setSearchingDeezer(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const importFromDeezer = (track: any) => {
    setContentForm({
      ...contentForm,
      title: track.title,
      artist: track.artist.name,
      description: `By ${track.artist.name} - ${track.album.title}`,
      long_description: `"${track.title}" by ${track.artist.name} from the album "${track.album.title}". ${track.rank ? `Popularity rank: ${track.rank.toLocaleString()}.` : ''}`,
      image_url: track.album.cover_xl,
      backdrop_url: track.album.cover_xl,
      type: 'music',
      year: track.release_date ? new Date(track.release_date).getFullYear() : new Date().getFullYear(),
      duration: formatDuration(track.duration),
      genre: track.artist.name.split(' ')[0],
      platforms: 'Spotify, Apple Music, Deezer',
      trailer_url: track.preview,
      stats_highly: track.rank ? Math.floor(track.rank / 10000) : 0,
      stats_recommended: track.rank ? Math.floor(track.rank / 20000) : 0,
      stats_not: 0,
      category_ids: []
    })
    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
    toast.success(`Imported "${track.title}" from Deezer!`)
  }

  const saveCategory = async () => {
    if (editingItem) {
      await supabase.from('categories').update(categoryForm).eq('id', editingItem.id)
    } else {
      await supabase.from('categories').insert([categoryForm])
    }
    setShowCategoryModal(false)
    setEditingItem(null)
    setCategoryForm({ name: '', description: '', type: 'movie', is_active: true, display_order: 0 })
    loadCategories()
    toast.success('Category saved!')
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      await supabase.from('categories').delete().eq('id', id)
      loadCategories()
      toast.success('Category deleted')
    }
  }

  const closeContentModal = () => {
    setShowContentModal(false)
    setEditingItem(null)
    setContentForm({
      title: '',
      description: '',
      long_description: '',
      image_url: '',
      backdrop_url: '',
      type: 'movie',
      year: new Date().getFullYear(),
      director: '',
      artist: '',
      actors: '',
      platforms: '',
      trailer_url: '',
      runtime: '',
      duration: '',
      genre: '',
      stats_highly: 0,
      stats_recommended: 0,
      stats_not: 0,
      category_ids: []
    })
    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
  }

  const saveContent = async () => {
    const dataToSave: any = {
      title: contentForm.title,
      description: contentForm.description,
      long_description: contentForm.long_description || null,
      image_url: contentForm.image_url,
      backdrop_url: contentForm.backdrop_url || null,
      type: contentForm.type,
      year: contentForm.year,
      platforms: contentForm.platforms.split(',').map(p => p.trim()),
      trailer_url: contentForm.trailer_url || null,
      genre: contentForm.genre,
      stats_highly: contentForm.stats_highly,
      stats_recommended: contentForm.stats_recommended,
      stats_not: contentForm.stats_not,
    }
    
    if (contentForm.type === 'movie') {
      dataToSave.director = contentForm.director || null
      dataToSave.actors = contentForm.actors.split(',').map(a => a.trim()).filter(a => a)
      dataToSave.runtime = contentForm.runtime || null
      dataToSave.artist = null
      dataToSave.duration = null
    } else {
      dataToSave.artist = contentForm.artist || null
      dataToSave.duration = contentForm.duration || null
      dataToSave.director = null
      dataToSave.actors = null
      dataToSave.runtime = null
    }
    
    let contentId = editingItem?.id
    if (editingItem) {
      await supabase.from('content').update(dataToSave).eq('id', editingItem.id)
      toast.success('Content updated!')
    } else {
      const { data } = await supabase.from('content').insert([dataToSave]).select()
      contentId = data?.[0]?.id
      toast.success('Content added!')
    }
    
    if (contentId && contentForm.category_ids.length) {
      await supabase.from('content_categories').delete().eq('content_id', contentId)
      const links = contentForm.category_ids.map(catId => ({
        content_id: contentId,
        category_id: catId
      }))
      await supabase.from('content_categories').insert(links)
    }
    
    closeContentModal()
    loadContent()
  }

  const deleteContent = async (id: string) => {
    if (confirm('Delete this content?')) {
      await supabase.from('content').delete().eq('id', id)
      loadContent()
      toast.success('Content deleted')
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    loadUsers()
    toast.success('User role updated')
  }

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = contentTypeFilter === 'all' || item.type === contentTypeFilter
    return matchesSearch && matchesType
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin privileges required</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-teal-600 rounded-lg">Go Home</button>
        </div>
      </div>
    )
  }

  const totalUsers = users.length
  const totalContent = content.length
  const totalMovies = content.filter(c => c.type === 'movie').length
  const totalMusic = content.filter(c => c.type === 'music').length
  const totalRecommendations = recommendations.length
  const totalCategories = categories.length

  return (
    <div className="min-h-screen bg-black">
      {/* Admin Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH Admin
              </Link>
              <span className="text-xs bg-teal-600 px-2 py-1 rounded-full">Admin Panel</span>
            </div>
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back to Site
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Users size={20} /> Users</div>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Film size={20} /> Movies</div>
            <p className="text-2xl font-bold">{totalMovies}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Music size={20} /> Music</div>
            <p className="text-2xl font-bold">{totalMusic}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Layers size={20} /> Categories</div>
            <p className="text-2xl font-bold">{totalCategories}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Heart size={20} /> Recs</div>
            <p className="text-2xl font-bold">{totalRecommendations}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center ga
