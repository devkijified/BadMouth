'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Film, Music, Layers, Shield, X } from 'lucide-react'
import { ContentItem, Category } from '@/types/content'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'categories' | 'content'>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

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
    category_ids: [] as string[]
  })

  useEffect(() => {
    if (!authLoading) {
      checkAdminAndLoadData()
    }
  }, [authLoading, user])

  const checkAdminAndLoadData = async () => {
    // First check by email (most reliable)
    if (user?.email === 'kijified@gmail.com') {
      setIsAdmin(true)
      await loadCategories()
      await loadContent()
      setLoading(false)
      return
    }
    
    // Fallback: check role in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()
    
    if (profile?.role === 'admin') {
      setIsAdmin(true)
      await loadCategories()
      await loadContent()
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order')
    setCategories(data || [])
  }

  const loadContent = async () => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
    setContent(data || [])
  }

  const saveCategory = async () => {
    if (editingItem) {
      await supabase
        .from('categories')
        .update(categoryForm)
        .eq('id', editingItem.id)
    } else {
      await supabase
        .from('categories')
        .insert([categoryForm])
    }
    setShowCategoryModal(false)
    setEditingItem(null)
    setCategoryForm({ name: '', description: '', type: 'movie', is_active: true, display_order: 0 })
    loadCategories()
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Delete this category? This will also remove content from this category.')) {
      await supabase.from('categories').delete().eq('id', id)
      loadCategories()
    }
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
    } else {
      const { data } = await supabase.from('content').insert([dataToSave]).select()
      contentId = data?.[0]?.id
    }
    
    if (contentId && contentForm.category_ids.length) {
      await supabase.from('content_categories').delete().eq('content_id', contentId)
      const links = contentForm.category_ids.map(catId => ({
        content_id: contentId,
        category_id: catId
      }))
      await supabase.from('content_categories').insert(links)
    }
    
    setShowContentModal(false)
    setEditingItem(null)
    setContentForm({
      title: '', description: '', long_description: '', image_url: '', backdrop_url: '',
      type: 'movie', year: new Date().getFullYear(), director: '', artist: '', actors: '',
      platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', category_ids: []
    })
    loadContent()
  }

  const deleteContent = async (id: string) => {
    if (confirm('Delete this content?')) {
      await supabase.from('content').delete().eq('id', id)
      loadContent()
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
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

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => { setActiveTab('categories'); setShowCategoryModal(true); setEditingItem(null); setCategoryForm({ name: '', description: '', type: 'movie', is_active: true, display_order: 0 }) }} 
              className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition"
            >
              <Plus size={16} /> Add Category
            </button>
            <button 
              onClick={() => { setActiveTab('content'); setShowContentModal(true); setEditingItem(null); setContentForm({ ...contentForm, category_ids: [] }) }} 
              className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={16} /> Add Content
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button 
            onClick={() => setActiveTab('categories')} 
            className={`px-4 py-2 transition ${activeTab === 'categories' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}
          >
            <Layers size={16} className="inline mr-1" /> Categories
          </button>
          <button 
            onClick={() => setActiveTab('content')} 
            className={`px-4 py-2 transition ${activeTab === 'content' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}
          >
            <Film size={16} className="inline mr-1" /> Content
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                    <p className="text-xs text-gray-400">{cat.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingItem(cat); setCategoryForm(cat); setShowCategoryModal(true); }} 
                      className="p-1 hover:bg-gray-700 rounded transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => deleteCategory(cat.id)} 
                      className="p-1 hover:bg-gray-700 rounded text-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{cat.description}</p>
                <p className="text-xs text-gray-500 mt-2">Order: {cat.display_order}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">{item.type} • {item.year}</p>
                  <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => { 
                        setEditingItem(item)
                        setContentForm({ 
                          title: item.title,
                          description: item.description || '',
                          long_description: item.long_description || '',
                          image_url: item.image_url,
                          backdrop_url: item.backdrop_url || '',
                          type: item.type,
                          year: item.year,
                          director: item.director || '',
                          artist: item.artist || '',
                          actors: item.actors?.join(', ') || '',
                          platforms: item.platforms?.join(', ') || '',
                          trailer_url: item.trailer_url || '',
                          runtime: item.runtime || '',
                          duration: item.duration || '',
                          genre: item.genre || '',
                          category_ids: []
                        })
                        setShowContentModal(true)
                      }} 
                      className="flex-1 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600 transition"
                    >
                      <Edit size={14} className="inline mr-1" /> Edit
                    </button>
                    <button 
                      onClick={() => deleteContent(item.id)} 
                      className="flex-1 py-1 bg-red-600/20 text-red-500 rounded text-sm hover:bg-red-600/30 transition"
                    >
                      <Trash2 size={14} className="inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit' : 'New'} Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-800 rounded"><X size={20} /></button>
            </div>
            <input 
              type="text" 
              placeholder="Name" 
              value={categoryForm.name} 
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" 
            />
            <input 
              type="text" 
              placeholder="Description" 
              value={categoryForm.description} 
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" 
            />
            <select 
              value={categoryForm.type} 
              onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value as 'movie' | 'music' })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500"
            >
              <option value="movie">Movies</option>
              <option value="music">Music</option>
            </select>
            <input 
              type="number" 
              placeholder="Display Order" 
              value={categoryForm.display_order} 
              onChange={e => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })} 
              className="w-full mb-4 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" 
            />
            <div className="flex gap-2">
              <button onClick={saveCategory} className="flex-1 py-2 bg-teal-600 rounded hover:bg-teal-700 transition">Save</button>
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit' : 'New'} Content</h2>
              <button onClick={() => setShowContentModal(false)} className="p-1 hover:bg-gray-800 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" />
              <textarea placeholder="Description" value={contentForm.description} onChange={e => setContentForm({ ...contentForm, description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" rows={2} />
              <textarea placeholder="Long Description" value={contentForm.long_description} onChange={e => setContentForm({ ...contentForm, long_description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500" rows={3} />
              <input type="text" placeholder="Image URL" value={contentForm.image_url} onChange={e => setContentForm({ ...contentForm, image_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Backdrop URL (optional)" value={contentForm.backdrop_url} onChange={e => setContentForm({ ...contentForm, backdrop_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              
              <select value={contentForm.type} onChange={e => setContentForm({ ...contentForm, type: e.target.value as 'movie' | 'music' })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                <option value="movie">Movie</option>
                <option value="music">Music</option>
              </select>
              
              <input type="number" placeholder="Year" value={contentForm.year} onChange={e => setContentForm({ ...contentForm, year: parseInt(e.target.value) })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              
              {contentForm.type === 'movie' ? (
                <>
                  <input type="text" placeholder="Director" value={contentForm.director} onChange={e => setContentForm({ ...contentForm, director: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Cast (comma separated)" value={contentForm.actors} onChange={e => setContentForm({ ...contentForm, actors: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Runtime" value={contentForm.runtime} onChange={e => setContentForm({ ...contentForm, runtime: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              ) : (
                <>
                  <input type="text" placeholder="Artist" value={contentForm.artist} onChange={e => setContentForm({ ...contentForm, artist: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Duration" value={contentForm.duration} onChange={e => setContentForm({ ...contentForm, duration: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              )}
              
              <input type="text" placeholder="Platforms (comma separated)" value={contentForm.platforms} onChange={e => setContentForm({ ...contentForm, platforms: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Trailer/Video URL" value={contentForm.trailer_url} onChange={e => setContentForm({ ...contentForm, trailer_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Genre" value={contentForm.genre} onChange={e => setContentForm({ ...contentForm, genre: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Categories</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.filter(c => c.type === contentForm.type).map(cat => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={contentForm.category_ids.includes(cat.id)} 
                        onChange={e => {
                          if (e.target.checked) setContentForm({ ...contentForm, category_ids: [...contentForm.category_ids, cat.id] })
                          else setContentForm({ ...contentForm, category_ids: contentForm.category_ids.filter(id => id !== cat.id) })
                        }} 
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveContent} className="flex-1 py-2 bg-teal-600 rounded hover:bg-teal-700 transition">Save</button>
              <button onClick={() => setShowContentModal(false)} className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
