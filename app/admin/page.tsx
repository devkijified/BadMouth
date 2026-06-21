'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  Plus, Edit, Trash2, Film, Music, Layers, Shield, X, 
  Users, TrendingUp, Settings, Heart, Star, Search as SearchIcon,
  Loader2, Tv, AlertTriangle, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

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
  is_tv_show?: boolean
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'categories' | 'content' | 'users' | 'analytics' | 'settings'>('users')
  const [lastActivity, setLastActivity] = useState(Date.now())
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null)
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)
  const sessionRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  
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
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'movie' | 'music'>('all')
  
  // Deezer search states
  const [deezerSearchResults, setDeezerSearchResults] = useState<any[]>([])
  const [showDeezerSearch, setShowDeezerSearch] = useState(false)
  const [deezerSearchQuery, setDeezerSearchQuery] = useState('')
  const [searchingDeezer, setSearchingDeezer] = useState(false)
  
  // TMDB search states
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([])
  const [showTmdbSearch, setShowTmdbSearch] = useState(false)
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('')
  const [searchingTmdb, setSearchingTmdb] = useState(false)
  const [tmdbSearchType, setTmdbSearchType] = useState<'movie' | 'tv'>('movie')
  
  const TMDB_API_KEY = 'e40a2dd7da8c15d302e6790211dd958f'

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'movie' as 'movie' | 'music',
    is_active: true,
    display_order: 0
  })

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
    is_tv_show: false,
    category_ids: [] as string[]
  })

  // Reset inactivity timer on user interaction
  const resetInactivityTimer = () => {
    setLastActivity(Date.now())
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    // Set inactivity timeout to 30 minutes (1800000 ms)
    inactivityTimer.current = setTimeout(() => {
      console.log('Inactivity detected, refreshing session...')
      refreshSession()
    }, 1800000) // 30 minutes
  }

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.log('Session refresh failed, redirecting to login')
        toast.error('Session expired. Please login again.')
        router.push('/auth')
      } else {
        console.log('Session refreshed successfully')
        toast.success('Session refreshed')
      }
    } catch (error) {
      console.error('Session refresh error:', error)
    }
  }

  // Set up activity listeners
  useEffect(() => {
    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove']
    const handleActivity = () => resetInactivityTimer()
    
    activities.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initial timer setup
    resetInactivityTimer()

    // Set up periodic data refresh (every 30 seconds)
    refreshInterval.current = setInterval(() => {
      if (isAdmin && document.visibilityState === 'visible') {
        console.log('Auto-refreshing data...')
        loadUsers()
        loadContent()
        loadCategories()
        loadRecommendations()
      }
    }, 30000) // 30 seconds

    // Set up session refresh (every 5 minutes)
    sessionRefreshInterval.current = setInterval(() => {
      if (isAdmin && document.visibilityState === 'visible') {
        console.log('Auto-refreshing session...')
        supabase.auth.refreshSession().catch(console.error)
      }
    }, 300000) // 5 minutes

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing data...')
        resetInactivityTimer()
        if (isAdmin) {
          loadUsers()
          loadContent()
          loadCategories()
          loadRecommendations()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      activities.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAdmin])

  useEffect(() => {
    console.log('=== ADMIN PAGE LOADED ===')
    console.log('Auth loading:', authLoading)
    console.log('User:', user?.email)
    
    if (!authLoading) {
      if (user) {
        checkAdminAndLoadData()
      } else {
        console.log('No user, redirecting to auth')
        setLoading(false)
        router.push('/auth')
      }
    }
  }, [authLoading, user])

  const checkAdminAndLoadData = async () => {
    try {
      console.log('Checking admin status for:', user?.email)
      
      // Check role in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()
      
      console.log('Profile data:', profile)
      console.log('Profile error:', error)
      
      if (profile?.role === 'admin') {
        console.log('✅ Admin role detected in profiles table')
        setIsAdmin(true)
        await loadAllData()
        setupRealtimeSubscriptions()
      } else {
        console.log('❌ Not admin. Role:', profile?.role)
        toast.error('You do not have admin access')
        router.push('/')
      }
    } catch (error) {
      console.error('Admin check error:', error)
      toast.error('Failed to verify admin status')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    console.log('Loading all data...')
    try {
      await loadCategories()
      await loadContent()
      await loadUsers()
      await loadRecommendations()
      console.log('✅ All data loaded successfully')
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load some data')
    }
  }

  const setupRealtimeSubscriptions = () => {
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          console.log('Profiles changed, reloading...')
          loadUsers()
        }
      )
      .subscribe()

    const recsSubscription = supabase
      .channel('recommendations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recommendations' }, 
        () => {
          console.log('Recommendations changed, reloading...')
          loadRecommendations()
          loadUsers()
        }
      )
      .subscribe()

    const watchlistSubscription = supabase
      .channel('watchlist-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'watchlist' }, 
        () => {
          console.log('Watchlist changed, reloading...')
          loadUsers()
        }
      )
      .subscribe()

    const contentSubscription = supabase
      .channel('content-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content' }, 
        () => {
          console.log('Content changed, reloading...')
          loadContent()
        }
      )
      .subscribe()

    return () => {
      profilesSubscription.unsubscribe()
      recsSubscription.unsubscribe()
      watchlistSubscription.unsubscribe()
      contentSubscription.unsubscribe()
    }
  }

  const loadCategories = async () => {
    try {
      console.log('Loading categories...')
      let query = supabase.from('categories').select('*').order('display_order')
      if (categoryTypeFilter !== 'all') {
        query = query.eq('type', categoryTypeFilter)
      }
      const { data, error } = await query
      if (error) throw error
      setCategories(data || [])
      console.log('Categories loaded:', data?.length)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    }
  }

  const loadContent = async () => {
    try {
      console.log('Loading content...')
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setContent(data || [])
      console.log('Content loaded:', data?.length)
    } catch (error) {
      console.error('Error loading content:', error)
      toast.error('Failed to load content')
    }
  }

  const loadUsers = async () => {
    try {
      console.log('Loading users from profiles...')
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        throw profilesError
      }

      console.log('Profiles data:', profiles)

      if (!profiles || profiles.length === 0) {
        setUsers([])
        return
      }

      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const watchlistResult = await supabase
              .from('watchlist')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)
            
            const recsResult = await supabase
              .from('recommendations')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)

            return {
              ...profile,
              watchlist_count: watchlistResult.count || 0,
              recommendations_count: recsResult.count || 0
            }
          } catch (err) {
            console.error('Error getting stats for user:', profile.id, err)
            return {
              ...profile,
              watchlist_count: 0,
              recommendations_count: 0
            }
          }
        })
      )

      setUsers(usersWithStats)
      console.log('Users loaded:', usersWithStats.length)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    }
  }

  const loadRecommendations = async () => {
    try {
      console.log('Loading recommendations...')
      const { data, error } = await supabase
        .from('recommendations')
        .select('*, profiles(username), content(title)')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Recommendations error:', error)
        const { data: simpleData, error: simpleError } = await supabase
          .from('recommendations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (simpleError) throw simpleError
        setRecommendations(simpleData || [])
        return
      }
      
      setRecommendations(data || [])
      console.log('Recommendations loaded:', data?.length)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      setRecommendations([])
    }
  }

  // Delete all content
  const deleteAllContent = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL content. This action cannot be undone. Are you absolutely sure?')) return
    
    try {
      await supabase.from('recommendations').delete().neq('id', '')
      await supabase.from('content').delete().neq('id', '')
      toast.success('All content deleted successfully!')
      loadContent()
      loadRecommendations()
    } catch (error) {
      console.error('Error deleting content:', error)
      toast.error('Failed to delete all content')
    }
  }

  // Delete all users (except admin)
  const deleteAllUsers = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL users except you. This action cannot be undone. Are you absolutely sure?')) return
    
    try {
      await supabase.from('profiles').delete().neq('id', user?.id)
      toast.success('All users deleted successfully!')
      loadUsers()
    } catch (error) {
      console.error('Error deleting users:', error)
      toast.error('Failed to delete users')
    }
  }

  // Make user admin
  const makeUserAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const action = newRole === 'admin' ? 'make admin' : 'remove admin'
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User role updated to ${newRole}`)
      loadUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  // Search functions
  const searchDeezerForMusic = async () => {
    if (!deezerSearchQuery.trim()) {
      toast.error('Please enter a song or artist name')
      return
    }
    setSearchingDeezer(true)
    try {
      const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(deezerSearchQuery)}&limit=20`)
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        setDeezerSearchResults(data.data)
        toast.success(`Found ${data.data.length} results on Deezer`)
      } else {
        setDeezerSearchResults([])
        toast.error('No results found')
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
      long_description: `"${track.title}" by ${track.artist.name} from the album "${track.album.title}".`,
      image_url: track.album.cover_xl,
      backdrop_url: track.album.cover_xl,
      type: 'music',
      year: track.release_date ? new Date(track.release_date).getFullYear() : new Date().getFullYear(),
      duration: formatDuration(track.duration),
      genre: track.artist.name.split(' ')[0],
      platforms: 'Spotify, Apple Music, Deezer, YouTube Music',
      trailer_url: track.preview,
      stats_highly: Math.floor(Math.random() * 1000) + 500,
      stats_recommended: Math.floor(Math.random() * 500) + 200,
      stats_not: 0,
      is_tv_show: false,
      category_ids: []
    })
    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
    toast.success(`Imported "${track.title}" from Deezer!`)
  }

  const searchTmdb = async () => {
    if (!tmdbSearchQuery.trim()) {
      toast.error('Please enter a title to search')
      return
    }
    
    setSearchingTmdb(true)
    try {
      const url = tmdbSearchType === 'movie'
        ? `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(tmdbSearchQuery)}&language=en-US&page=1`
        : `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(tmdbSearchQuery)}&language=en-US&page=1`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const enrichedResults = await Promise.all(
          data.results.slice(0, 10).map(async (result: any) => {
            const detailUrl = tmdbSearchType === 'movie'
              ? `https://api.themoviedb.org/3/movie/${result.id}?api_key=${TMDB_API_KEY}&language=en-US`
              : `https://api.themoviedb.org/3/tv/${result.id}?api_key=${TMDB_API_KEY}&language=en-US`
            const detailResponse = await fetch(detailUrl)
            const details = await detailResponse.json()
            return { ...result, ...details }
          })
        )
        setTmdbSearchResults(enrichedResults)
        toast.success(`Found ${enrichedResults.length} results on TMDB`)
      } else {
        setTmdbSearchResults([])
        toast.error('No results found')
      }
    } catch (error) {
      console.error('TMDB search error:', error)
      toast.error('Failed to search TMDB')
    } finally {
      setSearchingTmdb(false)
    }
  }

  const fetchTrailerFromTmdb = async (id: number, type: 'movie' | 'tv'): Promise<string | null> => {
    try {
      const url = `https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`
      const response = await fetch(url)
      const data = await response.json()
      const trailer = data.results?.find((video: any) => video.type === 'Trailer' && video.site === 'YouTube')
      return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null
    } catch (error) {
      return null
    }
  }

  const fetchWatchProviders = async (id: number, type: 'movie' | 'tv'): Promise<string[]> => {
    try {
      const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`
      const response = await fetch(url)
      const data = await response.json()
      const usProviders = data.results?.US?.flatrate || []
      const providerMap: Record<number, string> = {
        8: 'Netflix', 9: 'Prime Video', 337: 'Disney+', 384: 'Max', 15: 'Hulu', 2: 'Apple TV+', 20: 'Paramount+'
      }
      const providerNames = usProviders.map((provider: any) => providerMap[provider.provider_id]).filter(Boolean)
      return providerNames.length > 0 ? providerNames : ['Prime Video', 'Netflix', 'Apple TV+']
    } catch (error) {
      return ['Prime Video', 'Netflix', 'Apple TV+']
    }
  }

  const importFromTmdb = async (item: any, type: 'movie' | 'tv') => {
    setSearchingTmdb(true)
    try {
      const trailerUrl = await fetchTrailerFromTmdb(item.id, type)
      const platforms = await fetchWatchProviders(item.id, type)
      
      let director = ''
      let cast: string[] = []
      let title = ''
      let year = new Date().getFullYear()
      let genre = type === 'movie' ? 'Movie' : 'TV Series'
      let runtime = ''
      let isTVShow = type === 'tv'
      
      if (type === 'movie') {
        title = item.title || item.original_title || ''
        year = item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear()
        director = item.credits?.crew?.find((person: any) => person.job === 'Director')?.name || ''
        cast = item.credits?.cast?.slice(0, 5).map((actor: any) => actor.name) || []
        runtime = item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}min` : ''
        genre = item.genres?.[0]?.name || 'Movie'
      } else {
        title = item.name || item.original_name || ''
        year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : new Date().getFullYear()
        director = item.created_by?.map((creator: any) => creator.name).join(', ') || ''
        cast = item.credits?.cast?.slice(0, 5).map((actor: any) => actor.name) || []
        runtime = item.episode_run_time?.[0] ? `${item.episode_run_time[0]} min per episode` : 'TV Series'
        genre = item.genres?.[0]?.name || 'TV Series'
      }
      
      const posterUrl = item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
        : `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=400&name=${encodeURIComponent(title)}`
      
      const backdropUrl = item.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` 
        : posterUrl
      
      setContentForm({
        ...contentForm,
        title: title,
        description: item.overview || `${title} is a great ${type === 'movie' ? 'movie' : 'TV series'}.`,
        long_description: item.overview || '',
        image_url: posterUrl,
        backdrop_url: backdropUrl,
        type: 'movie',
        year: year,
        director: director,
        actors: cast.join(', '),
        platforms: platforms.join(', '),
        trailer_url: trailerUrl || '',
        runtime: runtime,
        genre: genre,
        stats_highly: Math.floor(Math.random() * 1000) + 500,
        stats_recommended: Math.floor(Math.random() * 500) + 200,
        stats_not: 0,
        is_tv_show: isTVShow,
        category_ids: []
      })
      setShowTmdbSearch(false)
      setTmdbSearchQuery('')
      setTmdbSearchResults([])
      toast.success(`Imported "${title}" as ${isTVShow ? 'TV Show' : 'Movie'}!`)
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import details')
    } finally {
      setSearchingTmdb(false)
    }
  }

  const saveCategory = async () => {
    try {
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
    } catch (error) {
      console.error('Save category error:', error)
      toast.error('Failed to save category')
    }
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      try {
        await supabase.from('categories').delete().eq('id', id)
        loadCategories()
        toast.success('Category deleted')
      } catch (error) {
        console.error('Delete category error:', error)
        toast.error('Failed to delete category')
      }
    }
  }

  const closeContentModal = () => {
    setShowContentModal(false)
    setEditingItem(null)
    setContentForm({
      title: '', description: '', long_description: '', image_url: '', backdrop_url: '',
      type: 'movie', year: new Date().getFullYear(), director: '', artist: '', actors: '',
      platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', 
      stats_highly: 0, stats_recommended: 0, stats_not: 0, is_tv_show: false, category_ids: []
    })
    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
    setShowTmdbSearch(false)
    setTmdbSearchQuery('')
    setTmdbSearchResults([])
  }

  const saveContent = async () => {
    try {
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
        is_tv_show: contentForm.is_tv_show || false,
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
        dataToSave.is_tv_show = false
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
    } catch (error) {
      console.error('Save content error:', error)
      toast.error('Failed to save content')
    }
  }

  const deleteContent = async (id: string) => {
    if (confirm('Delete this content?')) {
      try {
        await supabase.from('content').delete().eq('id', id)
        loadContent()
        toast.success('Content deleted')
      } catch (error) {
        console.error('Delete content error:', error)
        toast.error('Failed to delete content')
      }
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User role updated to ${newRole}`)
      loadUsers()
    } catch (error) {
      console.error('Update role error:', error)
      toast.error('Failed to update user role')
    }
  }

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = contentTypeFilter === 'all' || item.type === contentTypeFilter
    return matchesSearch && matchesType
  })

  const filteredCategories = categories.filter(cat => {
    if (categoryTypeFilter === 'all') return true
    return cat.type === categoryTypeFilter
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
      </div>
    )
  }

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">You do not have admin privileges</p>
          <p className="text-sm text-gray-500 mb-6">Your email: {user?.email || 'Not logged in'}</p>
          <button 
            onClick={() => router.push('/')} 
            className="px-4 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 transition"
          >
            Go Home
          </button>
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
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                BADMOUTH Admin
              </Link>
              <span className="text-xs bg-teal-600 px-2 py-1 rounded-full">Admin Panel</span>
              <span className="text-xs text-green-500 hidden md:inline">
                ● Session active
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { 
                  resetInactivityTimer()
                  loadUsers()
                  loadContent()
                  loadCategories()
                  loadRecommendations()
                  toast.success('Data refreshed')
                }} 
                className="text-gray-400 hover:text-white transition" 
                title="Refresh all data"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={refreshSession}
                className="text-gray-400 hover:text-white transition text-xs"
                title="Refresh session"
              >
                🔄 Session
              </button>
              <Link href="/" className="text-gray-400 hover:text-white transition">← Back to Site</Link>
            </div>
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
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Film size={20} /> Movies & TV</div>
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
            <div className="flex items-center gap-2 text-teal-500 mb-2"><Star size={20} /> Content</div>
            <p className="text-2xl font-bold">{totalContent}</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={deleteAllContent} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm font-semibold">
              Delete All Content
            </button>
            <button onClick={deleteAllUsers} className="px-4 py-2 bg-red-600/70 hover:bg-red-700 rounded-lg transition text-sm font-semibold">
              Delete All Users
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">⚠️ These actions cannot be undone</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 transition ${activeTab === 'users' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}>
            <Users size={16} className="inline mr-1" /> Users
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 transition ${activeTab === 'analytics' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}>
            <TrendingUp size={16} className="inline mr-1" /> Analytics
          </button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 transition ${activeTab === 'categories' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}>
            <Layers size={16} className="inline mr-1" /> Categories
          </button>
          <button onClick={() => setActiveTab('content')} className={`px-4 py-2 transition ${activeTab === 'content' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}>
            <Film size={16} className="inline mr-1" /> Content
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 transition ${activeTab === 'settings' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-400'}`}>
            <Settings size={16} className="inline mr-1" /> Settings
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Watchlist</th>
                    <th className="px-4 py-3 text-left">Recs</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">No users found</td>
                    </tr>
                  ) : (
                    users.map(userItem => (
                      <tr key={userItem.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img 
                              src={userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.username}`} 
                              className="w-8 h-8 rounded-full" 
                              alt=""
                            />
                            <span className="text-sm">{userItem.id?.slice(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{userItem.username || 'No username'}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{userItem.email || 'No email'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${userItem.role === 'admin' ? 'bg-purple-600/20 text-purple-400' : 'bg-gray-600/20 text-gray-400'}`}>
                            {userItem.role === 'admin' ? '👑 Admin' : '👤 User'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-teal-400">❤️ {userItem.watchlist_count || 0}</span></td>
                        <td className="px-4 py-3"><span className="text-blue-400">👍 {userItem.recommendations_count || 0}</span></td>
                        <td className="px-4 py-3 text-sm">{userItem.created_at ? new Date(userItem.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => makeUserAdmin(userItem.id, userItem.role || 'user')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              userItem.role === 'admin' 
                                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                                : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                            }`}
                          >
                            {userItem.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Recent Recommendations</h2>
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recommendations yet</p>
              ) : (
                recommendations.slice(0, 20).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium">{rec.profiles?.username || 'Anonymous'}</p>
                      <p className="text-sm text-gray-400">Recommended: {rec.content?.title || 'Unknown'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${rec.recommendation_tier === 'highly' ? 'bg-teal-600/20 text-teal-400' : rec.recommendation_tier === 'recommended' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'}`}>
                      {rec.recommendation_tier === 'highly' ? '🔥 HIGHLY' : rec.recommendation_tier === 'recommended' ? '👍 RECOMMENDED' : '👎 NOT'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex gap-2">
                <button onClick={() => setCategoryTypeFilter('all')} className={`px-3 py-1 rounded-lg text-sm ${categoryTypeFilter === 'all' ? 'bg-teal-600' : 'bg-gray-700'}`}>All</button>
                <button onClick={() => setCategoryTypeFilter('movie')} className={`px-3 py-1 rounded-lg text-sm ${categoryTypeFilter === 'movie' ? 'bg-teal-600' : 'bg-gray-700'}`}>Movies</button>
                <button onClick={() => setCategoryTypeFilter('music')} className={`px-3 py-1 rounded-lg text-sm ${categoryTypeFilter === 'music' ? 'bg-teal-600' : 'bg-gray-700'}`}>Music</button>
              </div>
              <button onClick={() => { setShowCategoryModal(true); setEditingItem(null); setCategoryForm({ name: '', description: '', type: categoryTypeFilter === 'all' ? 'movie' : categoryTypeFilter, is_active: true, display_order: 0 }) }} className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Category</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.length === 0 ? (
                <p className="text-center text-gray-500 col-span-3 py-8">No categories found</p>
              ) : (
                filteredCategories.map(cat => (
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
                ))
              )}
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold">Content Management</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500" />
                </div>
                <select value={contentTypeFilter} onChange={(e) => setContentTypeFilter(e.target.value as any)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                  <option value="all">All Types</option>
                  <option value="movie">Movies & TV</option>
                  <option value="music">Music</option>
                </select>
                <button onClick={() => { setShowContentModal(true); setEditingItem(null); setContentForm({ title: '', description: '', long_description: '', image_url: '', backdrop_url: '', type: 'movie', year: new Date().getFullYear(), director: '', artist: '', actors: '', platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', stats_highly: 0, stats_recommended: 0, stats_not: 0, is_tv_show: false, category_ids: [] }); }} className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Content</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.length === 0 ? (
                <p className="text-center text-gray-500 col-span-3 py-8">No content found</p>
              ) : (
                filteredContent.map(item => (
                  <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 relative">
                    {item.is_tv_show && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Tv size={10} /> TV Series</div>
                      </div>
                    )}
                    <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                    <div className="p-4">
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">{item.is_tv_show ? '📺 TV Show' : (item.type === 'movie' ? '🎬 Movie' : '🎵 Music')} • {item.year}</p>
                      <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between mt-3">
                        <span className="text-xs flex gap-2"><span className="text-teal-400">🔥 {item.stats_highly}</span><span className="text-blue-400">👍 {item.stats_recommended}</span><span className="text-gray-400">👎 {item.stats_not}</span></span>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingItem(item); setContentForm({ ...item, long_description: item.long_description || '', backdrop_url: item.backdrop_url || '', director: item.director || '', artist: item.artist || '', actors: item.actors?.join(', ') || '', platforms: item.platforms?.join(', ') || '', trailer_url: item.trailer_url || '', runtime: item.runtime || '', duration: item.duration || '', is_tv_show: item.is_tv_show || false, category_ids: [] }); setShowContentModal(true); }} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                          <button onClick={() => deleteContent(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">System Settings</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">Session Management</h3><p className="text-sm text-gray-400">Session stays active for 30 minutes of inactivity. Auto-refreshes data every 30 seconds.</p></div>
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">Admin Management</h3><p className="text-sm text-gray-400">Admins are managed through the profiles table. Only users with role="admin" can access this panel.</p></div>
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">Real-time Updates</h3><p className="text-sm text-gray-400">User stats, watchlist counts, and recommendations update automatically in real-time.</p></div>
              <div className="p-4 bg-gray-700/50 rounded-lg"><h3 className="font-semibold mb-2">TV Shows vs Movies</h3><p className="text-sm text-gray-400">TV shows are automatically marked with a TV badge when imported from TMDB.</p></div>
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
            <select value={categoryForm.type} onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value as 'movie' | 'music' })} className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded"><option value="movie">Movies & TV Shows</option><option value="music">Music</option></select>
            <input type="number" placeholder="Display Order" value={categoryForm.display_order} onChange={e => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })} className="w-full mb-4 p-2 bg-gray-800 border border-gray-700 rounded" />
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
              
              <select value={contentForm.type} onChange={e => setContentForm({ ...contentForm, type: e.target.value as 'movie' | 'music' })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                <option value="movie">Movie / TV Show</option>
                <option value="music">Music</option>
              </select>
              
              <input type="number" placeholder="Year" value={contentForm.year} onChange={e => setContentForm({ ...contentForm, year: parseInt(e.target.value) })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              
              {contentForm.type === 'movie' ? (
                <>
                  <div className="mb-2 p-3 bg-gray-800/50 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={contentForm.is_tv_show} onChange={(e) => setContentForm({ ...contentForm, is_tv_show: e.target.checked })} className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-teal-500" />
                      <div><span className="text-sm text-gray-300 font-medium">This is a TV Show</span>{contentForm.is_tv_show && <p className="text-xs text-purple-400 mt-1">📺 TV Show badge will appear</p>}</div>
                    </label>
                  </div>

                  <div className="mb-2">
                    <button type="button" onClick={() => setShowTmdbSearch(!showTmdbSearch)} className="text-sm text-teal-400 hover:text-teal-300 mb-2">+ Search on TMDB</button>
                    {showTmdbSearch && (
                      <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg mb-3">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Search for a movie or TV show..." value={tmdbSearchQuery} onChange={(e) => setTmdbSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchTmdb()} className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-sm" />
                          <div className="flex gap-1">
                            <button onClick={() => { setTmdbSearchType('movie'); searchTmdb(); }} className={`px-3 py-2 rounded ${tmdbSearchType === 'movie' ? 'bg-teal-600' : 'bg-gray-700'}`}><Film size={16} /></button>
                            <button onClick={() => { setTmdbSearchType('tv'); searchTmdb(); }} className={`px-3 py-2 rounded ${tmdbSearchType === 'tv' ? 'bg-teal-600' : 'bg-gray-700'}`}><Tv size={16} /></button>
                          </div>
                        </div>
                        {searchingTmdb && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>}
                        {tmdbSearchResults.length > 0 && !searchingTmdb && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tmdbSearchResults.map((result) => (
                              <div key={result.id} onClick={() => importFromTmdb(result, tmdbSearchType)} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                <img src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/api/placeholder/92/138'} className="w-12 h-16 rounded object-cover" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{tmdbSearchType === 'movie' ? result.title : result.name}</p>
                                  <p className="text-xs text-gray-400">{tmdbSearchType === 'movie' ? result.release_date?.split('-')[0] : result.first_air_date?.split('-')[0]}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-600/20 text-purple-400">{tmdbSearchType === 'movie' ? '🎬 Movie' : '📺 TV Series'}</span>
                                </div>
                                <button className="text-teal-400 text-sm">Import →</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <input type="text" placeholder="Director / Creator" value={contentForm.director} onChange={e => setContentForm({ ...contentForm, director: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Cast (comma separated)" value={contentForm.actors} onChange={e => setContentForm({ ...contentForm, actors: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Runtime" value={contentForm.runtime} onChange={e => setContentForm({ ...contentForm, runtime: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <button type="button" onClick={() => setShowDeezerSearch(!showDeezerSearch)} className="text-sm text-teal-400 hover:text-teal-300 mb-2">+ Search on Deezer</button>
                    {showDeezerSearch && (
                      <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg mb-3">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Search for a song or artist..." value={deezerSearchQuery} onChange={(e) => setDeezerSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchDeezerForMusic()} className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-sm" />
                          <button onClick={searchDeezerForMusic} disabled={searchingDeezer} className="px-4 py-2 bg-teal-600 rounded">{searchingDeezer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</button>
                        </div>
                        {deezerSearchResults.length > 0 && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {deezerSearchResults.map((track) => (
                              <div key={track.id} onClick={() => importFromDeezer(track)} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                <img src={track.album.cover_small} className="w-12 h-12 rounded" />
                                <div><p className="font-medium text-sm">{track.title}</p><p className="text-xs text-gray-400">{track.artist.name}</p></div>
                                <button className="text-teal-400 text-sm ml-auto">Import →</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder="Artist" value={contentForm.artist} onChange={e => setContentForm({ ...contentForm, artist: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <input type="text" placeholder="Duration" value={contentForm.duration} onChange={e => setContentForm({ ...contentForm, duration: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                </>
              )}
              
              <input type="text" placeholder="Platforms (comma separated)" value={contentForm.platforms} onChange={e => setContentForm({ ...contentForm, platforms: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <input type="text" placeholder="Trailer URL" value={contentForm.trailer_url} onChange={e => setContentForm({ ...contentForm, trailer_url: e.target.value })} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
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
            <div className="flex gap-2 mt-6">
              <button onClick={saveContent} className="flex-1 py-2 bg-teal-600 rounded">Save</button>
              <button onClick={closeContentModal} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
