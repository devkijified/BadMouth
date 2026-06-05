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

  const searchDeezerForMusic = async () => {
    if (!deezerSearchQuery.trim()) {
      toast.error('Please enter a song or artist name')
      return
    }
    setSearchingDeezer(true)
    try {
      const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(deezerSearchQuery)}&limit=15`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        setDeezerSearchResults(data.data)
        toast.success(`Found ${data.data.length} results`)
      } else {
        setDeezerSearchResults([])
        toast.error('No results found. Try different search terms.')
      }
    } catch (error) {
      console.error('Deezer search error:', error)
      toast.error('Failed to search Deezer. Check console for details.')
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
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Users size={20} /> Users</div><p className="text-2xl font-bold">{totalUsers}</p></div>
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Film size={20} /> Movies</div><p className="text-2xl font-bold">{totalMovies}</p></div>
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Music size={20} /> Music</div><p className="text-2xl font-bold">{totalMusic}</p></div>
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Layers size={20} /> Categories</div><p className="text-2xl font-bold">{totalCategories}</p></div>
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Heart size={20} /> Recs</div><p className="text-2xl font-bold">{totalRecommendations}</p></div>
          <div className="bg-gray-800 rounded-xl p-4"><div className="flex items-center gap-2 text-teal-500 mb-2"><Star size={20} /> Content</div><p className="text-2xl font-bold">{totalContent}</p></div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800">
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 transition ${activeTab === 'analytics' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}><TrendingUp size={16} className="inline mr-1" /> Analytics</button>
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 transition ${activeTab === 'users' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}><Users size={16} className="inline mr-1" /> Users</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 transition ${activeTab === 'categories' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}><Layers size={16} className="inline mr-1" /> Categories</button>
          <button onClick={() => setActiveTab('content')} className={`px-4 py-2 transition ${activeTab === 'content' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}><Film size={16} className="inline mr-1" /> Content</button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 transition ${activeTab === 'settings' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}><Settings size={16} className="inline mr-1" /> Settings</button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Recent Recommendations</h2>
            <div className="space-y-3">
              {recommendations.slice(0, 10).map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div><p className="font-medium">{rec.profiles?.username || 'Anonymous'}</p><p className="text-sm text-gray-400">Recommended: {rec.content?.title || 'Unknown'}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs ${rec.recommendation_tier === 'highly' ? 'bg-teal-600/20 text-teal-400' : rec.recommendation_tier === 'recommended' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {rec.recommendation_tier === 'highly' ? '🔥 HIGHLY' : rec.recommendation_tier === 'recommended' ? '👍 RECOMMENDED' : '👎 NOT'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700"><tr><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Username</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Joined</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
                <tbody>
                  {users.map(userItem => (
                    <tr key={userItem.id} className="border-b border-gray-700">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><img src={userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.username}`} className="w-8 h-8 rounded-full" /><span className="text-sm">{userItem.id?.slice(0, 8)}...</span></div></td>
                      <td className="px-4 py-3">{userItem.username || 'No username'}</td>
                      <td className="px-4 py-3"><select value={userItem.role || 'user'} onChange={(e) => updateUserRole(userItem.id, e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></td>
                      <td className="px-4 py-3 text-sm">{new Date(userItem.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><button onClick={() => updateUserRole(userItem.id, userItem.role === 'admin' ? 'user' : 'admin')} className="text-teal-500 hover:text-teal-400 text-sm">Toggle Admin</button></td>
                    </table>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Categories</h2><button onClick={() => { setShowCategoryModal(true); setEditingItem(null); setCategoryForm({ name: '', description: '', type: 'movie', is_active: true, display_order: 0 }) }} className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Category</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-lg">{cat.name}</h3><p className="text-xs text-gray-400">{cat.type}</p></div><div className="flex gap-2"><button onClick={() => { setEditingItem(cat); setCategoryForm(cat); setShowCategoryModal(true); }} className="p-1 hover:bg-gray-700 rounded"><Edit size={16} /></button><button onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-gray-700 rounded text-red-500"><Trash2 size={16} /></button></div></div>
                  <p className="text-sm text-gray-300">{cat.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Order: {cat.display_order}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold">Content Management</h2>
              <div className="flex gap-2">
                <div className="relative"><SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500" /></div>
                <select value={contentTypeFilter} onChange={(e) => setContentTypeFilter(e.target.value as any)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"><option value="all">All Types</option><option value="movie">Movies</option><option value="music">Music</option></select>
                <button onClick={() => { setShowContentModal(true); setEditingItem(null); setContentForm({ 
                  title: '', description: '', long_description: '', image_url: '', backdrop_url: '', 
                  type: 'movie', year: new Date().getFullYear(), director: '', artist: '', actors: '', 
                  platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', 
                  stats_highly: 0, stats_recommended: 0, stats_not: 0, category_ids: [] 
                }); }} className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Content</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.map(item => (
                <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                  <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-xs text-gray-400 mb-2">{item.type} • {item.year}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between mt-3">
                      <span className="text-xs flex gap-2"><span className="text-teal-400">🔥 {item.stats_highly}</span><span className="text-blue-400">👍 {item.stats_recommended}</span><span className="text-gray-400">👎 {item.stats_not}</span></span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem(item); setContentForm({ ...item, long_description: item.long_description || '', backdrop_url: item.backdrop_url || '', director: item.director || '', artist: item.artist || '', actors: item.actors?.join(', ') || '', platforms: item.platforms?.join(', ') || '', trailer_url: item.trailer_url || '', runtime: item.runtime || '', duration: item.duration || '', category_ids: [] }); setShowContentModal(true); }} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                        <button onClick={() => deleteContent(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">System Settings</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">About Display Order</h3><p className="text-sm text-gray-400">The "Order" field in categories determines how they appear on the main page. Lower numbers appear first (higher priority).</p></div>
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">Deezer API Integration</h3><p className="text-sm text-gray-400">When adding music, use the "Search on Deezer" button to automatically fetch song details, album art, and preview URLs.</p></div>
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">Recommendation Tiers</h3><p className="text-sm text-gray-400">🔥 HIGHLY RECOMMENDED - Best content that users love. 👍 RECOMMENDED - Good content worth watching. 👎 NOT RECOMMENDED - Content users suggest to skip.</p></div>
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editingItem ? 'Edit' : 'New'} Category</h2><button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-800 rounded"><X size={20} /></button></div>
            <input type="text" placeholder="Name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" />
            <input type="text" placeholder="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" />
            <select value={categoryForm.type} onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value as 'movie' | 'music' })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded"><option value="movie">Movies</option><option value="music">Music</option></select>
            <input type="number" placeholder="Display Order (lower = higher priority)" value={categoryForm.display_order} onChange={e => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })} className="w-full mb-4 p-2 bg-gray-800 border border-gray-700 rounded" />
            <div className="flex gap-2"><button onClick={saveCategory} className="flex-1 py-2 bg-teal-600 rounded">Save</button><button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button></div>
          </div>
        </div>
      )}

      {/* Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editingItem ? 'Edit' : 'New'} Content</h2><button onClick={closeContentModal} className="p-1 hover:bg-gray-800 rounded"><X size={20} /></button></div>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <textarea placeholder="Description" value={contentForm.description} onChange={e => setContentForm({ ...contentForm, description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" rows={2} />
              <textarea placeholder="Long Description" value={contentForm.long_description} onChange={e => setContentForm({ ...contentForm, long_description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" rows={3} />
              <input type="text" placeholder="Image URL" value={contentForm.image_url} onChange={e => setContentForm({ ...contentForm, image_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Backdrop URL" value={contentForm.backdrop_url} onChange={e => setContentForm({ ...contentForm, backdrop_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <select value={contentForm.type} onChange={e => setContentForm({ ...contentForm, type: e.target.value as 'movie' | 'music' })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded"><option value="movie">Movie</option><option value="music">Music</option></select>
              <input type="number" placeholder="Year" value={contentForm.year} onChange={e => setContentForm({ ...contentForm, year: parseInt(e.target.value) })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              {contentForm.type === 'movie' ? (
                <>
                  <input type="text" placeholder="Director" value={contentForm.director} onChange={e => setContentForm({ ...contentForm, director: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Cast (comma separated)" value={contentForm.actors} onChange={e => setContentForm({ ...contentForm, actors: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Runtime (e.g., 2h 30min)" value={contentForm.runtime} onChange={e => setContentForm({ ...contentForm, runtime: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <button type="button" onClick={() => setShowDeezerSearch(!showDeezerSearch)} className="text-sm text-teal-400 hover:text-teal-300 mb-2 flex items-center gap-1">{showDeezerSearch ? '− Hide Deezer Search' : '+ Search on Deezer'}</button>
                    {showDeezerSearch && (
                      <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg mb-3">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Search for a song on Deezer..." value={deezerSearchQuery} onChange={(e) => setDeezerSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchDeezerForMusic()} className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500 text-sm" />
                          <button onClick={searchDeezerForMusic} disabled={searchingDeezer} className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-700 transition disabled:opacity-50">{searchingDeezer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</button>
                        </div>
                        {deezerSearchResults.length > 0 && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {deezerSearchResults.map((track) => (
                              <div key={track.id} onClick={() => importFromDeezer(track)} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                                <img src={track.album.cover_small} alt={track.title} className="w-12 h-12 rounded" />
                                <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{track.title}</p><p className="text-xs text-gray-400 truncate">{track.artist.name}</p></div>
                                <button className="text-teal-400 text-sm whitespace-nowrap">Import →</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder="Artist" value={contentForm.artist} onChange={e => setContentForm({ ...contentForm, artist: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Duration (e.g., 3:45)" value={contentForm.duration} onChange={e => setContentForm({ ...contentForm, duration: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              )}
              <input type="text" placeholder="Platforms (comma separated)" value={contentForm.platforms} onChange={e => setContentForm({ ...contentForm, platforms: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Trailer/Video URL" value={contentForm.trailer_url} onChange={e => setContentForm({ ...contentForm, trailer_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Genre" value={contentForm.genre} onChange={e => setContentForm({ ...contentForm, genre: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="🔥 Highly" value={contentForm.stats_highly} onChange={e => setContentForm({ ...contentForm, stats_highly: parseInt(e.target.value) })} className="p-2 bg-gray-800 border border-gray-700 rounded" />
                <input type="number" placeholder="👍 Recommended" value={contentForm.stats_recommended} onChange={e => setContentForm({ ...contentForm, stats_recommended: parseInt(e.target.value) })} className="p-2 bg-gray-800 border border-gray-700 rounded" />
                <input type="number" placeholder="👎 Not" value={contentForm.stats_not} onChange={e => setContentForm({ ...contentForm, stats_not: parseInt(e.target.value) })} className="p-2 bg-gray-800 border border-gray-700 rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Assign to Categories</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.filter(c => c.type === contentForm.type).map(cat => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={contentForm.category_ids.includes(cat.id)} onChange={e => { if (e.target.checked) setContentForm({ ...contentForm, category_ids: [...contentForm.category_ids, cat.id] }); else setContentForm({ ...contentForm, category_ids: contentForm.category_ids.filter(id => id !== cat.id) }) }} />
                      {cat.name} (Order: {cat.display_order})
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={saveContent} className="flex-1 py-2 bg-teal-600 rounded">Save</button><button onClick={closeContentModal} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
