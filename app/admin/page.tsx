'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Film, Music, Layers, Shield } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'content'>('categories')
  const [categories, setCategories] = useState<any[]>([])
  const [content, setContent] = useState<any[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'movie',
    display_order: 0
  })

  // Content form state
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    long_description: '',
    image_url: '',
    backdrop_url: '',
    type: 'movie',
    year: new Date().getFullYear(),
    director: '',
    artist: '',
    cast: '',
    platforms: '',
    trailer_url: '',
    runtime: '',
    duration: '',
    genre: '',
    category_ids: [] as string[]
  })

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
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
    setCategoryForm({ name: '', description: '', type: 'movie', display_order: 0 })
    loadCategories()
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      await supabase.from('categories').delete().eq('id', id)
      loadCategories()
    }
  }

  const saveContent = async () => {
    const dataToSave = {
      ...contentForm,
      cast: contentForm.cast.split(',').map(c => c.trim()),
      platforms: contentForm.platforms.split(',').map(p => p.trim()),
    }
    
    let contentId = editingItem?.id
    if (editingItem) {
      await supabase.from('content').update(dataToSave).eq('id', editingItem.id)
    } else {
      const { data } = await supabase.from('content').insert([dataToSave]).select()
      contentId = data?.[0]?.id
    }
    
    // Link content to categories
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
      type: 'movie', year: new Date().getFullYear(), director: '', artist: '', cast: '',
      platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', category_ids: []
    })
    loadContent()
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div></div>
  if (!isAdmin) return <div className="min-h-screen bg-black flex items-center justify-center"><Shield size={48} className="text-red-500 mb-4" /><p className="text-gray-400">Admin access required</p></div>

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">Admin Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={() => { setActiveTab('categories'); setShowCategoryModal(true); setEditingItem(null); setCategoryForm({ name: '', description: '', type: 'movie', display_order: 0 }) }} className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Category</button>
            <button onClick={() => { setActiveTab('content'); setShowContentModal(true); setEditingItem(null); setContentForm({ ...contentForm, category_ids: [] }) }} className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Content</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 ${activeTab === 'categories' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400'}`}><Layers size={16} className="inline mr-1" /> Categories</button>
          <button onClick={() => setActiveTab('content')} className={`px-4 py-2 ${activeTab === 'content' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400'}`}><Film size={16} className="inline mr-1" /> Content</button>
        </div>

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div><h3 className="font-bold text-lg">{cat.name}</h3><p className="text-xs text-gray-400">{cat.type}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(cat); setCategoryForm(cat); setShowCategoryModal(true); }} className="p-1 hover:bg-gray-700 rounded"><Edit size={16} /></button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-gray-700 rounded text-red-500"><Trash2 size={16} /></button>
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
                    <button onClick={() => { setEditingItem(item); setContentForm({ ...item, cast: item.cast?.join(', '), platforms: item.platforms?.join(', ') }); setShowContentModal(true); }} className="flex-1 py-1 bg-gray-700 rounded text-sm"><Edit size={14} className="inline mr-1" /> Edit</button>
                    <button onClick={async () => { if (confirm('Delete?')) await supabase.from('content').delete().eq('id', item.id); loadContent(); }} className="flex-1 py-1 bg-red-600/20 text-red-500 rounded text-sm"><Trash2 size={14} className="inline mr-1" /> Delete</button>
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
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'New'} Category</h2>
            <input type="text" placeholder="Name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" />
            <input type="text" placeholder="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" />
            <select value={categoryForm.type} onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value as 'movie' | 'music' })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded">
              <option value="movie">Movies</option>
              <option value="music">Music</option>
            </select>
            <input type="number" placeholder="Display Order" value={categoryForm.display_order} onChange={e => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })} className="w-full mb-4 p-2 bg-gray-800 border border-gray-700 rounded" />
            <div className="flex gap-2">
              <button onClick={saveCategory} className="flex-1 py-2 bg-green-600 rounded">Save</button>
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'New'} Content</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <textarea placeholder="Description" value={contentForm.description} onChange={e => setContentForm({ ...contentForm, description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" rows={2} />
              <textarea placeholder="Long Description" value={contentForm.long_description} onChange={e => setContentForm({ ...contentForm, long_description: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" rows={3} />
              <input type="text" placeholder="Image URL" value={contentForm.image_url} onChange={e => setContentForm({ ...contentForm, image_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <select value={contentForm.type} onChange={e => setContentForm({ ...contentForm, type: e.target.value as 'movie' | 'music' })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                <option value="movie">Movie</option>
                <option value="music">Music</option>
              </select>
              <input type="number" placeholder="Year" value={contentForm.year} onChange={e => setContentForm({ ...contentForm, year: parseInt(e.target.value) })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              {contentForm.type === 'movie' ? (
                <>
                  <input type="text" placeholder="Director" value={contentForm.director} onChange={e => setContentForm({ ...contentForm, director: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Cast (comma separated)" value={contentForm.cast} onChange={e => setContentForm({ ...contentForm, cast: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
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
                      <input type="checkbox" checked={contentForm.category_ids.includes(cat.id)} onChange={e => {
                        if (e.target.checked) setContentForm({ ...contentForm, category_ids: [...contentForm.category_ids, cat.id] })
                        else setContentForm({ ...contentForm, category_ids: contentForm.category_ids.filter(id => id !== cat.id) })
                      }} />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveContent} className="flex-1 py-2 bg-green-600 rounded">Save</button>
              <button onClick={() => setShowContentModal(false)} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
