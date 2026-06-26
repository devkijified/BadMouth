'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  Plus, Edit, Trash2, Film, Music, Layers, Shield, X, 
  Users, TrendingUp, Settings, Heart, Star, Search as SearchIcon,
  Loader2, Tv, AlertTriangle, RefreshCw, Check, Trash
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
  rating: number
  rating_count: number
  is_tv_show?: boolean
  created_at?: string
  updated_at?: string
}

// Genre mapping for TMDB genre IDs
const genreMap: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

// Category names for imports
const IMPORT_CATEGORIES = [
  '🔥 Trending Now',
  'Watch in a Weekend',
  'Sci-Fi Adventures',
  'Made in Nollywood',
  'YouTube Special',
  'Netflix & Chill',
  'Prime Video Only',
  'Only On Apple TV',
  'TV Shows You Shouldn\'t miss',
  '😢 Waterworks Guaranteed',
  '🤯 Mind-Benders',
  '🇳🇬 Nollywood Chaos',
  '🗣️ Movie Night Arguments',
  '🎯 Underrated Gems',
  '🏆 Award Winners',
  '🎥 Cinema Classics',
  '🌍 World Cinema',
  '🏁 Instant Hook',
  '🍿 Feel-Good Movies',
  '😱 Edge of Your Seat',
  '😂 Laugh Out Loud'
]

// BADMOUTH-style critic descriptions
const generateBadmouthDescription = (title: string, year: number, genre: string, director: string, cast: string[], plot: string): string => {
  
  const intros = [
    `"${title}" hits you like a freight train — and I mean that in the best possible way.`,
    `There's something about "${title}" that feels dangerous, like it knows it's too good for you.`,
    `You know that feeling when a film just clicks? That's "${title}" from start to finish.`,
    `"${title}" doesn't just tell a story — it grabs you by the collar and makes you pay attention.`,
    `This is the kind of film that makes you want to text your friends at 2am: "You HAVE to see this."`,
    `"${title}" is what happens when a director decides to go for broke — and it works spectacularly.`,
    `Some films are made to be watched. "${title}" is made to be experienced.`,
    `Let's be honest — "${title}" is the reason we still go to the movies.`,
    `"${title}" walks a tightrope between brilliance and madness, and it never once looks down.`,
    `This is cinema as a contact sport — raw, unflinching, and utterly unforgettable.`,
  ]
  
  const middles = [
    `The script crackles with the kind of dialogue that makes you wish you'd written it yourself.`,
    `What makes it work is the way it refuses to be boxed in — it's messy, unpredictable, and that's exactly why it's brilliant.`,
    `${cast.slice(0, 2).join(' and ')} deliver career-best work, and the supporting cast? Chef's kiss.`,
    `It's the kind of film that lingers — you'll be thinking about it for days, maybe weeks.`,
    `The direction is precise, the pacing is relentless, and the emotional payoff? Absolutely devastating in the best way.`,
    `There's a scene in this film that will stop you dead in your tracks — you'll know it when you see it.`,
    `It balances tension and humor with the kind of confidence that only comes from a filmmaker who knows exactly what they're doing.`,
    `Every frame feels deliberate, every line of dialogue lands, and every performance elevates the material.`,
    `What sets it apart is how it trusts its audience — it doesn't overexplain, it just lets you feel.`,
    `It's bold, it's uncompromising, and it's exactly what ${genre} cinema needed right now.`,
  ]
  
  const closings = [
    `BADMOUTH says: don't just watch this — devour it.`,
    `If this film doesn't make it onto your year-end list, you're not paying attention. BADMOUTH approves.`,
    `This is the kind of film that reminds you why you fell in love with movies. BADMOUTH says: go. Now.`,
    `A genuine knockout. BADMOUTH gives it the highest possible recommendation.`,
    `This is cinema at its most vital. BADMOUTH says: drop everything and watch it.`,
    `Absolutely essential. BADMOUTH can't recommend it enough — seriously, what are you waiting for?`,
    `One of the year's undeniable best. BADMOUTH doesn't say that lightly.`,
    `If you only watch one ${genre} film this year, make it "${title}". BADMOUTH guarantees it.`,
    `This one's special. BADMOUTH says: watch it with someone you love, then talk about it for hours.`,
    `A film that earns every bit of praise. BADMOUTH is giving it a standing ovation.`,
  ]
  
  const randomIntro = intros[Math.floor(Math.random() * intros.length)]
  const randomMiddle = middles[Math.floor(Math.random() * middles.length)]
  const randomClosing = closings[Math.floor(Math.random() * closings.length)]
  
  return `${randomIntro} ${randomMiddle} ${randomClosing}`
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminChecked, setAdminChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'content' | 'users' | 'analytics' | 'settings'>('users')
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  
  // Count states
  const [totalMovies, setTotalMovies] = useState(0)
  const [totalMusic, setTotalMusic] = useState(0)
  const [totalContentCount, setTotalContentCount] = useState(0)
  
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
  
  // Import states
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importPage, setImportPage] = useState(1)
  const [importTotalPages, setImportTotalPages] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [importCategoryId, setImportCategoryId] = useState<string>('')
  const [allImportCategories, setAllImportCategories] = useState<any[]>([])
  const [importSource, setImportSource] = useState<'netflix' | 'prime'>('netflix')
  
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
    rating: 5.0,
    rating_count: 0,
    is_tv_show: false,
    category_ids: [] as string[]
  })

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth')
      return
    }

    if (adminChecked && isAdmin) {
      loadAllData()
      return
    }

    checkAdminStatus()
  }, [authLoading, user])

  const checkAdminStatus = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()
      
      if (profile?.role === 'admin') {
        setIsAdmin(true)
        setAdminChecked(true)
        setIsMasterAdmin(user?.email === 'kijified@gmail.com')
        await loadAllData()
        setupRealtimeSubscriptions()
        loadImportCategories()
      } else {
        setIsAdmin(false)
        setAdminChecked(true)
        toast.error('You do not have admin access')
        router.push('/')
      }
    } catch (error) {
      console.error('Admin check error:', error)
      setIsAdmin(false)
      setAdminChecked(true)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadImportCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .in('name', IMPORT_CATEGORIES)
      .eq('type', 'movie')
    
    if (data) {
      setAllImportCategories(data)
      const netflixChill = data.find(c => c.name === 'Netflix & Chill')
      if (netflixChill) {
        setImportCategoryId(netflixChill.id)
      }
    }
  }

  const loadAllData = async () => {
    try {
      await loadCategories()
      await loadContent()
      await loadUsers()
      await loadRecommendations()
      await loadContentCounts()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadUsers())
      .subscribe()

    supabase
      .channel('recommendations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recommendations' }, () => {
        loadRecommendations()
        loadUsers()
      })
      .subscribe()

    supabase
      .channel('watchlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => loadUsers())
      .subscribe()

    supabase
      .channel('content-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content' }, () => {
        loadContent()
        loadContentCounts()
      })
      .subscribe()
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
      
      if (error) {
        console.error('Categories load error:', error)
        return
      }
      
      console.log('Categories loaded:', data?.length || 0)
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadContent = async () => {
    try {
      console.log('Loading content...')
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Content load error:', error)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('content')
          .select('*')
        
        if (fallbackError) {
          console.error('Fallback content load error:', fallbackError)
          setContent([])
          return
        }
        
        console.log('Fallback content loaded:', fallbackData?.length || 0)
        setContent(fallbackData || [])
        return
      }

      console.log('Content loaded successfully:', data?.length || 0)
      setContent(data || [])
      
    } catch (error) {
      console.error('Error loading content:', error)
      setContent([])
    }
  }

  const loadContentCounts = async () => {
    try {
      console.log('Loading content counts...')
      
      const { count: movies, error: movieError } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'movie')

      if (movieError) {
        console.error('Movie count error:', movieError)
      } else {
        console.log('Movies count:', movies)
        setTotalMovies(movies || 0)
      }

      const { count: music, error: musicError } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'music')

      if (musicError) {
        console.error('Music count error:', musicError)
      } else {
        console.log('Music count:', music)
        setTotalMusic(music || 0)
      }

      const total = (movies || 0) + (music || 0)
      setTotalContentCount(total)
      console.log('Total content count:', total)
      
    } catch (error) {
      console.error('Error loading counts:', error)
    }
  }

  const loadUsers = async () => {
    try {
      console.log('Loading users...')
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Users load error:', error)
        setUsers([])
        return
      }

      console.log('Users loaded:', profiles?.length || 0)

      if (!profiles || profiles.length === 0) {
        setUsers([])
        return
      }

      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const [{ count: watchlistCount }, { count: recommendationsCount }] = await Promise.all([
            supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
            supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('user_id', profile.id)
          ])

          return {
            ...profile,
            watchlist_count: watchlistCount || 0,
            recommendations_count: recommendationsCount || 0
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    }
  }

  const loadRecommendations = async () => {
    try {
      console.log('Loading recommendations...')
      const { data, error } = await supabase
        .from('recommendations')
        .select('*, profiles(username), content(title, rating)')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Recommendations load error:', error)
        setRecommendations([])
        return
      }
      
      console.log('Recommendations loaded:', data?.length || 0)
      setRecommendations(data || [])
    } catch (error) {
      console.error('Error loading recommendations:', error)
      setRecommendations([])
    }
  }

  // ============================================
  // DELETE USER FUNCTION
  // ============================================
  const deleteUser = async (userId: string, userEmail: string) => {
    if (!isMasterAdmin) {
      toast.error('Only the master admin can delete users')
      return
    }

    if (!confirm(`⚠️ Are you sure you want to delete user "${userEmail}"?\n\nThis action will permanently delete:\n- Their profile\n- All their recommendations\n- Their watchlist\n\nThis cannot be undone!`)) {
      return
    }

    try {
      // First delete from recommendations
      const { error: recError } = await supabase
        .from('recommendations')
        .delete()
        .eq('user_id', userId)
      
      if (recError) {
        console.error('Error deleting recommendations:', recError)
        throw new Error('Failed to delete user recommendations')
      }

      // Then delete from watchlist
      const { error: watchlistError } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
      
      if (watchlistError) {
        console.error('Error deleting watchlist:', watchlistError)
        throw new Error('Failed to delete user watchlist')
      }

      // Then delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      
      if (profileError) {
        console.error('Error deleting profile:', profileError)
        throw new Error('Failed to delete user profile')
      }

      toast.success(`✅ User "${userEmail}" deleted successfully!`)
      await loadUsers()
      await loadContentCounts()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user')
    }
  }

  // ============================================
  // IMPORT FUNCTIONS
  // ============================================
  
  const getSavedPage = (): number => {
    const key = `import_page_${importSource}`
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(key)
      if (saved) {
        return parseInt(saved, 10)
      }
    }
    return 1
  }

  const savePage = (page: number) => {
    const key = `import_page_${importSource}`
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, page.toString())
    }
  }

  const getProviderId = (source: 'netflix' | 'prime'): number => {
    return source === 'netflix' ? 8 : 9
  }

  const getPlatformName = (source: 'netflix' | 'prime'): string => {
    return source === 'netflix' ? 'Netflix' : 'Prime Video'
  }

  const getCategoryName = (source: 'netflix' | 'prime'): string => {
    return source === 'netflix' ? 'Netflix & Chill' : 'Prime Video Only'
  }

  const fetchImportMovies = async (page: number = 1) => {
    setImportLoading(true)
    setImportProgress(0)
    
    const providerId = getProviderId(importSource)
    const platform = getPlatformName(importSource)
    
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&page=${page}&sort_by=popularity.desc`
      )
      const data = await response.json()
      
      if (data.results) {
        const enrichedResults = await Promise.all(
          data.results.slice(0, 20).map(async (movie: any) => {
            try {
              const detailResponse = await fetch(
                `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`
              )
              const details = await detailResponse.json()
              
              let trailerUrl = ''
              const trailer = details.videos?.results?.find(
                (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
              )
              if (trailer) {
                trailerUrl = `https://www.youtube.com/embed/${trailer.key}`
              }
              
              return {
                ...movie,
                director: details.credits?.crew?.find((person: any) => person.job === 'Director')?.name || '',
                cast: details.credits?.cast?.slice(0, 8).map((actor: any) => actor.name) || [],
                runtime: details.runtime || '',
                genres: details.genres || [],
                trailer_url: trailerUrl,
                overview: details.overview || movie.overview || ''
              }
            } catch (err) {
              console.error('Error fetching details for movie:', movie.id, err)
              return movie
            }
          })
        )
        
        setImportData(enrichedResults)
        setImportTotalPages(data.total_pages)
        setImportTotal(data.total_results)
        setImportPage(page)
        savePage(page)
        toast.success(`Loaded ${enrichedResults.length} movies from ${platform} (Page ${page}/${data.total_pages})`)
      }
    } catch (error) {
      console.error('Error fetching movies:', error)
      toast.error(`Failed to fetch ${platform} movies`)
    } finally {
      setImportLoading(false)
    }
  }

  const getCategoryId = (name: string): string | null => {
    const cat = allImportCategories.find(c => c.name === name)
    return cat ? cat.id : null
  }

  const autoAssignCategories = (movie: any, source: 'netflix' | 'prime'): string[] => {
    const categories = new Set<string>()
    
    const platformCategory = getCategoryName(source)
    const platformCatId = getCategoryId(platformCategory)
    if (platformCatId) categories.add(platformCatId)
    
    if (movie.vote_average > 7.5) {
      const trending = getCategoryId('🔥 Trending Now')
      if (trending) categories.add(trending)
    }
    
    if (movie.vote_average > 8) {
      const award = getCategoryId('🏆 Award Winners')
      if (award) categories.add(award)
    }
    
    if (movie.vote_average > 7 && movie.vote_count < 500) {
      const underrated = getCategoryId('🎯 Underrated Gems')
      if (underrated) categories.add(underrated)
    }
    
    if (movie.genres) {
      const genreNames = movie.genres.map((g: any) => g.name)
      
      if (genreNames.some((g: string) => ['Comedy', 'Romance'].includes(g))) {
        const feelGood = getCategoryId('🍿 Feel-Good Movies')
        if (feelGood) categories.add(feelGood)
      }
      
      if (genreNames.some((g: string) => ['Thriller', 'Horror', 'Mystery'].includes(g))) {
        const edge = getCategoryId('😱 Edge of Your Seat')
        if (edge) categories.add(edge)
      }
      
      if (genreNames.some((g: string) => ['Comedy', 'Satire'].includes(g))) {
        const laugh = getCategoryId('😂 Laugh Out Loud')
        if (laugh) categories.add(laugh)
      }
      
      if (genreNames.some((g: string) => ['Science Fiction', 'Mystery'].includes(g))) {
        const mind = getCategoryId('🤯 Mind-Benders')
        if (mind) categories.add(mind)
      }
      
      if (genreNames.some((g: string) => ['Drama', 'Romance'].includes(g)) && movie.vote_average > 7) {
        const cry = getCategoryId('😢 Waterworks Guaranteed')
        if (cry) categories.add(cry)
      }
      
      if (genreNames.some((g: string) => ['Action', 'Crime'].includes(g)) && movie.vote_average > 7) {
        const gems = getCategoryId('🎯 Underrated Gems')
        if (gems) categories.add(gems)
      }
    }
    
    const year = new Date(movie.release_date).getFullYear()
    if (year < 2000 && movie.vote_average > 7) {
      const classics = getCategoryId('🎥 Cinema Classics')
      if (classics) categories.add(classics)
    }
    
    if (movie.original_language && movie.original_language !== 'en') {
      const world = getCategoryId('🌍 World Cinema')
      if (world) categories.add(world)
    }
    
    if (movie.popularity > 50) {
      const hook = getCategoryId('🏁 Instant Hook')
      if (hook) categories.add(hook)
    }
    
    if (movie.origin_country && movie.origin_country.some((c: string) => ['NG', 'ZA', 'GH'].includes(c))) {
      const afrobeats = getCategoryId('🌍 Afrobeats Takeover')
      if (afrobeats) categories.add(afrobeats)
    }
    
    if (year >= 2000 && year <= 2010 && movie.vote_average > 6.5) {
      const throwback = getCategoryId('📅 Throwback Thursday')
      if (throwback) categories.add(throwback)
    }
    
    return Array.from(categories)
  }

  const importSelectedMovies = async () => {
    const moviesToImport = importData.filter(movie => 
      selectedMovies.has(movie.id.toString())
    )
    
    if (moviesToImport.length === 0) {
      toast.error('No movies selected')
      return
    }

    const platform = getPlatformName(importSource)
    if (!confirm(`Import ${moviesToImport.length} movies from ${platform} with auto-categorization?`)) {
      return
    }

    setImportLoading(true)
    let imported = 0
    let skipped = 0
    let errors = 0
    let totalProcessed = 0

    const batchSize = 5
    const batches = []
    for (let i = 0; i < moviesToImport.length; i += batchSize) {
      batches.push(moviesToImport.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      await Promise.all(batch.map(async (movie) => {
        try {
          totalProcessed++
          
          const { data: existing } = await supabase
            .from('content')
            .select('id')
            .eq('title', movie.title)
            .eq('year', new Date(movie.release_date).getFullYear())
            .maybeSingle()

          if (existing) {
            skipped++
            return
          }

          let genreNames = ''
          if (movie.genres && movie.genres.length > 0) {
            genreNames = movie.genres.map((g: any) => g.name).join(', ')
          } else if (movie.genre_ids) {
            genreNames = movie.genre_ids.map((id: number) => genreMap[id] || '').filter(Boolean).join(', ')
          }
          if (!genreNames) {
            genreNames = 'Movie'
          }

          const year = new Date(movie.release_date).getFullYear()
          const cast = movie.cast || []
          const description = generateBadmouthDescription(
            movie.title, 
            year, 
            genreNames, 
            movie.director || '', 
            cast,
            movie.overview || ''
          )
          const longDescription = description

          const actors = cast
          const director = movie.director || ''
          
          let runtime = ''
          if (movie.runtime) {
            const hours = Math.floor(movie.runtime / 60)
            const minutes = movie.runtime % 60
            runtime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
          }

          const trailerUrl = movie.trailer_url || ''

          const contentData = {
            title: movie.title,
            description: description,
            long_description: longDescription,
            image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '',
            type: 'movie',
            year: year,
            director: director,
            actors: actors,
            platforms: [platform],
            trailer_url: trailerUrl,
            runtime: runtime,
            genre: genreNames,
            rating: parseFloat(movie.vote_average?.toFixed(1) || '5.0'),
            rating_count: movie.vote_count || 0,
            is_tv_show: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: inserted, error: insertError } = await supabase
            .from('content')
            .insert([contentData])
            .select()

          if (insertError) {
            console.error('Insert error for movie:', movie.title, insertError)
            errors++
            return
          }

          if (inserted && inserted[0]) {
            const assignedCategories = autoAssignCategories(movie, importSource)
            
            if (assignedCategories.length > 0) {
              const links = assignedCategories.map(catId => ({
                content_id: inserted[0].id,
                category_id: catId
              }))
              await supabase
                .from('content_categories')
                .insert(links)
            }
          }

          imported++
          setImportProgress(totalProcessed)
        } catch (error) {
          console.error('Import error for movie:', movie.title, error)
          errors++
        }
      }))
      
      setImportProgress(totalProcessed)
    }

    toast.success(`✅ Imported ${imported} movies from ${platform}, ⏭️ ${skipped} skipped, ❌ ${errors} errors`)
    setShowImportModal(false)
    setSelectedMovies(new Set())
    setSelectAll(false)
    await loadContent()
    await loadContentCounts()
  }

  useEffect(() => {
    if (selectAll) {
      const allIds = new Set(importData.map(m => m.id.toString()))
      setSelectedMovies(allIds)
    } else {
      setSelectedMovies(new Set())
    }
  }, [selectAll, importData])

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedMovies)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedMovies(newSelection)
  }

  // ============================================
  // DEEZER SEARCH
  // ============================================
  const searchDeezer = async () => {
    if (!deezerSearchQuery.trim()) {
      toast.error('Please enter a song or artist name')
      return
    }

    setSearchingDeezer(true)
    setDeezerSearchResults([])
    
    try {
      const query = encodeURIComponent(deezerSearchQuery.trim())
      const url = `/api/deezer?q=${query}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.data && data.data.length > 0) {
        setDeezerSearchResults(data.data)
        toast.success(`Found ${data.data.length} results on Deezer`)
      } else {
        setDeezerSearchResults([])
        toast.error('No results found. Try different search terms.')
      }
    } catch (error) {
      console.error('Deezer search error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to search Deezer. Please try again.')
      setDeezerSearchResults([])
    } finally {
      setSearchingDeezer(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const importFromDeezer = (track: any) => {
    let title = track.title || 'Unknown Track'
    let artist = track.artist?.name || 'Unknown Artist'
    let imageUrl = track.album?.cover_xl || track.album?.cover_big || ''
    let year = track.release_date ? new Date(track.release_date).getFullYear() : new Date().getFullYear()
    let duration = formatDuration(track.duration)
    let genre = track.artist?.name?.split(' ')[0] || 'Music'
    
    if (track.artist?.name) {
      const artistName = track.artist.name.toLowerCase()
      if (artistName.includes('rock')) genre = 'Rock'
      else if (artistName.includes('pop')) genre = 'Pop'
      else if (artistName.includes('hip hop') || artistName.includes('rap')) genre = 'Hip Hop'
      else if (artistName.includes('jazz')) genre = 'Jazz'
      else if (artistName.includes('classical')) genre = 'Classical'
      else if (artistName.includes('electronic') || artistName.includes('edm')) genre = 'Electronic'
      else genre = artistName.split(' ')[0]
    }

    setContentForm({
      ...contentForm,
      title: title,
      artist: artist,
      description: `"${title}" by ${artist}`,
      long_description: `"${title}" by ${artist}. ${track.album?.title ? `From the album "${track.album.title}".` : ''} ${track.rank ? `Deezer rank: ${track.rank.toLocaleString()}.` : ''}`,
      image_url: imageUrl,
      backdrop_url: imageUrl || '',
      type: 'music',
      year: year,
      duration: duration,
      genre: genre,
      platforms: 'Spotify, Apple Music, Deezer, YouTube Music',
      trailer_url: '',
      rating: 5.0,
      rating_count: 0,
      is_tv_show: false,
      category_ids: []
    })

    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
    toast.success(`Imported "${title}" from Deezer!`)
  }

  // ============================================
  // TMDB SEARCH
  // ============================================
  const searchTmdb = async () => {
    if (!tmdbSearchQuery.trim()) {
      toast.error('Please enter a title to search')
      return
    }
    
    setSearchingTmdb(true)
    setTmdbSearchResults([])
    
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
              ? `https://api.themoviedb.org/3/movie/${result.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
              : `https://api.themoviedb.org/3/tv/${result.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
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
        rating: 5.0,
        rating_count: 0,
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
      rating: 5.0, rating_count: 0, is_tv_show: false, category_ids: []
    })
    setShowDeezerSearch(false)
    setDeezerSearchQuery('')
    setDeezerSearchResults([])
    setShowTmdbSearch(false)
    setTmdbSearchQuery('')
    setTmdbSearchResults([])
  }

  const loadContentCategories = async (contentId: string) => {
    try {
      const { data } = await supabase
        .from('content_categories')
        .select('category_id')
        .eq('content_id', contentId)
      
      if (data) {
        const categoryIds = data.map(item => item.category_id)
        setContentForm(prev => ({
          ...prev,
          category_ids: categoryIds
        }))
      }
    } catch (error) {
      console.error('Error loading content categories:', error)
    }
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
        rating: contentForm.rating || 5.0,
        rating_count: 0,
        is_tv_show: contentForm.is_tv_show || false,
        updated_at: new Date().toISOString()
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
        const { error } = await supabase
          .from('content')
          .update(dataToSave)
          .eq('id', editingItem.id)
        
        if (error) throw error
        contentId = editingItem.id
        toast.success('Content updated!')
      } else {
        dataToSave.created_at = new Date().toISOString()
        const { data, error } = await supabase
          .from('content')
          .insert([dataToSave])
          .select()
        
        if (error) throw error
        contentId = data?.[0]?.id
        toast.success('Content added!')
      }
      
      if (contentId) {
        await supabase
          .from('content_categories')
          .delete()
          .eq('content_id', contentId)
        
        if (contentForm.category_ids.length > 0) {
          const links = contentForm.category_ids.map(catId => ({
            content_id: contentId,
            category_id: catId
          }))
          await supabase
            .from('content_categories')
            .insert(links)
        }
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

  if (!isAdmin && adminChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">You do not have admin privileges</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-teal-600 rounded-lg">Go Home</button>
        </div>
      </div>
    )
  }

  const totalUsers = users.length
  const totalCategoriesCount = categories.length
  const totalRecommendationsCount = recommendations.length

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
              <span className="text-xs text-green-500 hidden md:inline">● Active</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { 
                  loadUsers()
                  loadContent()
                  loadCategories()
                  loadRecommendations()
                  loadContentCounts()
                  toast.success('Data refreshed!')
                }} 
                className="text-gray-400 hover:text-white transition"
              >
                <RefreshCw size={18} />
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
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Users size={20} /> Users
            </div>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Film size={20} /> Movies & TV
              <button 
                onClick={loadContentCounts} 
                className="ml-auto text-gray-400 hover:text-white text-xs"
                title="Refresh count"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-2xl font-bold">{totalMovies.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Music size={20} /> Music
            </div>
            <p className="text-2xl font-bold">{totalMusic.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Layers size={20} /> Categories
            </div>
            <p className="text-2xl font-bold">{totalCategoriesCount}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Heart size={20} /> Recs
            </div>
            <p className="text-2xl font-bold">{totalRecommendationsCount}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-teal-500 mb-2">
              <Star size={20} /> Total Content
            </div>
            <p className="text-2xl font-bold">{totalContentCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Danger Zone - Only for master admin */}
        {isMasterAdmin && (
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
        )}

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

        {/* Users Tab - WITH DELETE BUTTON */}
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
                          <div className="flex items-center gap-2">
                            {isMasterAdmin && (
                              <>
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
                                {/* Delete User Button - Only for master admin */}
                                {userItem.email !== 'kijified@gmail.com' && (
                                  <button 
                                    onClick={() => deleteUser(userItem.id, userItem.email || userItem.username)}
                                    className="px-3 py-1 rounded-lg text-xs font-medium transition bg-red-600/20 text-red-400 hover:bg-red-600/30 flex items-center gap-1"
                                    title="Delete user"
                                  >
                                    <Trash size={12} /> Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
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
                      <p className="text-xs text-yellow-400">⭐ {rec.content?.rating || 0}/10</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-600/20 text-yellow-400">
                      ⭐ {rec.rating || 0}/10
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
              <button 
                onClick={() => { 
                  setShowCategoryModal(true); 
                  setEditingItem(null); 
                  setCategoryForm({ 
                    name: '', 
                    description: '', 
                    type: categoryTypeFilter === 'all' ? 'movie' : categoryTypeFilter, 
                    is_active: true, 
                    display_order: 0 
                  }) 
                }} 
                className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.length === 0 ? (
                <p className="text-center text-gray-500 col-span-3 py-8">No categories found</p>
              ) : (
                filteredCategories.map(cat => (
                  <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{cat.name}</h3>
                        <p className="text-xs text-gray-400">{cat.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            setEditingItem(cat); 
                            setCategoryForm(cat); 
                            setShowCategoryModal(true); 
                          }} 
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => deleteCategory(cat.id)} 
                          className="p-1 hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
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
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search content..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-teal-500" 
                  />
                </div>
                <select 
                  value={contentTypeFilter} 
                  onChange={(e) => setContentTypeFilter(e.target.value as any)} 
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies & TV</option>
                  <option value="music">Music</option>
                </select>
                <button 
                  onClick={() => { 
                    setShowContentModal(true); 
                    setEditingItem(null); 
                    setContentForm({ 
                      title: '', description: '', long_description: '', image_url: '', backdrop_url: '',
                      type: 'movie', year: new Date().getFullYear(), director: '', artist: '', actors: '',
                      platforms: '', trailer_url: '', runtime: '', duration: '', genre: '', 
                      rating: 5.0, rating_count: 0, is_tv_show: false, category_ids: []
                    }); 
                  }} 
                  className="px-4 py-2 bg-teal-600 rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} /> Add Content
                </button>
                
                {/* Netflix Import Button */}
                <button 
                  onClick={() => {
                    setImportSource('netflix')
                    setShowImportModal(true)
                    const savedPage = getSavedPage()
                    fetchImportMovies(savedPage)
                  }} 
                  className="px-4 py-2 bg-red-600 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
                >
                  <Tv size={16} /> Import Netflix
                </button>
                
                {/* Prime Video Import Button */}
                <button 
                  onClick={() => {
                    setImportSource('prime')
                    setShowImportModal(true)
                    const savedPage = getSavedPage()
                    fetchImportMovies(savedPage)
                  }} 
                  className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <Tv size={16} /> Import Prime Video
                </button>
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
                        <div className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tv size={10} /> TV Series
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-10 bg-black/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-[10px] font-bold">{item.rating?.toFixed(1) || 5.0}</span>
                    </div>
                    <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                    <div className="p-4">
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">
                        {item.is_tv_show ? '📺 TV Show' : (item.type === 'movie' ? '🎬 Movie' : '🎵 Music')} • {item.year}
                      </p>
                      <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between mt-3">
                        <span className="text-xs flex gap-2">
                          <span className="text-yellow-400">⭐ {item.rating?.toFixed(1) || 5.0}</span>
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { 
                              setEditingItem(item); 
                              setContentForm({ 
                                ...item, 
                                long_description: item.long_description || '', 
                                backdrop_url: item.backdrop_url || '', 
                                director: item.director || '', 
                                artist: item.artist || '', 
                                actors: item.actors?.join(', ') || '', 
                                platforms: item.platforms?.join(', ') || '', 
                                trailer_url: item.trailer_url || '', 
                                runtime: item.runtime || '', 
                                duration: item.duration || '', 
                                rating: item.rating || 5.0,
                                rating_count: 0,
                                is_tv_show: item.is_tv_show || false, 
                                category_ids: [] 
                              }); 
                              loadContentCategories(item.id);
                              setShowContentModal(true); 
                            }} 
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => deleteContent(item.id)} 
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
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
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">Content Ordering</h3>
                <p className="text-sm text-gray-400">Content is ordered by most recently updated/created.</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">User Management</h3>
                <p className="text-sm text-gray-400">Only the master admin can delete users. User deletion also removes their recommendations and watchlist.</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">Netflix & Prime Imports</h3>
                <p className="text-sm text-gray-400">Movies are auto-categorized based on genre, rating, year, and more. Netflix movies get "Netflix & Chill", Prime movies get "Prime Video Only".</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">BADMOUTH Descriptions</h3>
                <p className="text-sm text-gray-400">All imported content uses unique, punchy critic-style descriptions.</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">Master Admin</h3>
                <p className="text-sm text-gray-400">Only the master admin (kijified@gmail.com) can see the Danger Zone, manage user roles, and delete users.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit' : 'New'} Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-800 rounded">
                <X size={20} />
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Name" 
              value={categoryForm.name} 
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" 
            />
            <input 
              type="text" 
              placeholder="Description" 
              value={categoryForm.description} 
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded" 
            />
            <select 
              value={categoryForm.type} 
              onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value as 'movie' | 'music' })} 
              className="w-full mb-3 p-2 bg-gray-800 border border-gray-700 rounded"
            >
              <option value="movie">Movies & TV Shows</option>
              <option value="music">Music</option>
            </select>
            <input 
              type="number" 
              placeholder="Display Order" 
              value={categoryForm.display_order} 
              onChange={e => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })} 
              className="w-full mb-4 p-2 bg-gray-800 border border-gray-700 rounded" 
            />
            <div className="flex gap-2">
              <button onClick={saveCategory} className="flex-1 py-2 bg-teal-600 rounded">Save</button>
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 bg-gray-700 rounded">Cancel</button>
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
              <button onClick={closeContentModal} className="p-1 hover:bg-gray-800 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Title" 
                value={contentForm.title} 
                onChange={e => setContentForm({ ...contentForm, title: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              <textarea 
                placeholder="Description" 
                value={contentForm.description} 
                onChange={e => setContentForm({ ...contentForm, description: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                rows={2} 
              />
              <textarea 
                placeholder="Long Description" 
                value={contentForm.long_description} 
                onChange={e => setContentForm({ ...contentForm, long_description: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                rows={3} 
              />
              <input 
                type="text" 
                placeholder="Image URL" 
                value={contentForm.image_url} 
                onChange={e => setContentForm({ ...contentForm, image_url: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              <input 
                type="text" 
                placeholder="Backdrop URL" 
                value={contentForm.backdrop_url} 
                onChange={e => setContentForm({ ...contentForm, backdrop_url: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              
              <select 
                value={contentForm.type} 
                onChange={e => setContentForm({ ...contentForm, type: e.target.value as 'movie' | 'music' })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
              >
                <option value="movie">Movie / TV Show</option>
                <option value="music">Music</option>
              </select>
              
              <input 
                type="number" 
                placeholder="Year" 
                value={contentForm.year} 
                onChange={e => setContentForm({ ...contentForm, year: parseInt(e.target.value) })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              
              {contentForm.type === 'movie' ? (
                <>
                  <div className="mb-2 p-3 bg-gray-800/50 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={contentForm.is_tv_show} 
                        onChange={(e) => setContentForm({ ...contentForm, is_tv_show: e.target.checked })} 
                        className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-teal-500" 
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">This is a TV Show</span>
                        {contentForm.is_tv_show && (
                          <p className="text-xs text-purple-400 mt-1">📺 TV Show badge will appear</p>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="mb-2">
                    <button 
                      type="button" 
                      onClick={() => setShowTmdbSearch(!showTmdbSearch)} 
                      className="text-sm text-teal-400 hover:text-teal-300 mb-2"
                    >
                      {showTmdbSearch ? '− Hide TMDB Search' : '+ Search on TMDB (Movies & TV Shows)'}
                    </button>
                    
                    {showTmdbSearch && (
                      <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg mb-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Search for a movie or TV show..." 
                            value={tmdbSearchQuery} 
                            onChange={(e) => setTmdbSearchQuery(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && searchTmdb()} 
                            className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-sm" 
                          />
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setTmdbSearchType('movie'); searchTmdb(); }} 
                              className={`px-3 py-2 rounded ${tmdbSearchType === 'movie' ? 'bg-teal-600' : 'bg-gray-700'}`}
                            >
                              <Film size={16} />
                            </button>
                            <button 
                              onClick={() => { setTmdbSearchType('tv'); searchTmdb(); }} 
                              className={`px-3 py-2 rounded ${tmdbSearchType === 'tv' ? 'bg-teal-600' : 'bg-gray-700'}`}
                            >
                              <Tv size={16} />
                            </button>
                          </div>
                        </div>
                        {searchingTmdb && (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                          </div>
                        )}
                        {tmdbSearchResults.length > 0 && !searchingTmdb && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tmdbSearchResults.map((result) => (
                              <div 
                                key={result.id} 
                                onClick={() => importFromTmdb(result, tmdbSearchType)} 
                                className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                              >
                                <img 
                                  src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/api/placeholder/92/138'} 
                                  className="w-12 h-16 rounded object-cover" 
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{tmdbSearchType === 'movie' ? result.title : result.name}</p>
                                  <p className="text-xs text-gray-400">{tmdbSearchType === 'movie' ? result.release_date?.split('-')[0] : result.first_air_date?.split('-')[0]}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-600/20 text-purple-400">
                                    {tmdbSearchType === 'movie' ? '🎬 Movie' : '📺 TV Series'}
                                  </span>
                                </div>
                                <button className="text-teal-400 text-sm">Import →</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Director / Creator" 
                    value={contentForm.director} 
                    onChange={e => setContentForm({ ...contentForm, director: e.target.value })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                  />
                  <input 
                    type="text" 
                    placeholder="Cast (comma separated)" 
                    value={contentForm.actors} 
                    onChange={e => setContentForm({ ...contentForm, actors: e.target.value })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                  />
                  <input 
                    type="text" 
                    placeholder="Runtime" 
                    value={contentForm.runtime} 
                    onChange={e => setContentForm({ ...contentForm, runtime: e.target.value })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                  />
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <button 
                      type="button" 
                      onClick={() => setShowDeezerSearch(!showDeezerSearch)} 
                      className="text-sm text-teal-400 hover:text-teal-300 mb-2 flex items-center gap-1"
                    >
                      {showDeezerSearch ? '− Hide Deezer Search' : '🔍 + Search on Deezer (Music)'}
                    </button>
                    
                    {showDeezerSearch && (
                      <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg mb-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Search for a song or artist..." 
                            value={deezerSearchQuery} 
                            onChange={(e) => setDeezerSearchQuery(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && searchDeezer()} 
                            className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-teal-500 text-sm" 
                          />
                          <button 
                            onClick={searchDeezer} 
                            disabled={searchingDeezer} 
                            className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {searchingDeezer ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon size={16} />}
                            {searchingDeezer ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                        
                        {searchingDeezer && (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                            <span className="ml-2 text-gray-400">Searching Deezer...</span>
                          </div>
                        )}
                        
                        {deezerSearchResults.length > 0 && !searchingDeezer && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {deezerSearchResults.map((item, index) => (
                              <div 
                                key={item.id || index} 
                                onClick={() => importFromDeezer(item)} 
                                className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition group"
                              >
                                <img 
                                  src={item.album?.cover_small || ''} 
                                  alt={item.title} 
                                  className="w-12 h-12 rounded object-cover" 
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.title || 'Unknown'}</p>
                                  <p className="text-xs text-gray-400 truncate">{item.artist?.name || 'Unknown Artist'}</p>
                                  {item.release_date && (
                                    <p className="text-[10px] text-gray-500">{new Date(item.release_date).getFullYear()}</p>
                                  )}
                                </div>
                                <button className="text-teal-400 text-sm opacity-0 group-hover:opacity-100 transition">Import →</button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {deezerSearchResults.length === 0 && !searchingDeezer && showDeezerSearch && (
                          <div className="text-center py-4 text-gray-500">
                            <Music size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Search for tracks on Deezer</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Artist" 
                    value={contentForm.artist} 
                    onChange={e => setContentForm({ ...contentForm, artist: e.target.value })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                  />
                  <input 
                    type="text" 
                    placeholder="Duration (e.g., 3:45)" 
                    value={contentForm.duration} 
                    onChange={e => setContentForm({ ...contentForm, duration: e.target.value })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                  />
                </>
              )}
              
              <input 
                type="text" 
                placeholder="Platforms (comma separated)" 
                value={contentForm.platforms} 
                onChange={e => setContentForm({ ...contentForm, platforms: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              <input 
                type="text" 
                placeholder="Trailer URL" 
                value={contentForm.trailer_url} 
                onChange={e => setContentForm({ ...contentForm, trailer_url: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              <input 
                type="text" 
                placeholder="Genre" 
                value={contentForm.genre} 
                onChange={e => setContentForm({ ...contentForm, genre: e.target.value })} 
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Rating (1-10)</label>
                  <input 
                    type="number" 
                    placeholder="Rating (1-10)" 
                    value={contentForm.rating || 5.0} 
                    onChange={e => setContentForm({ ...contentForm, rating: parseFloat(e.target.value) || 5.0 })} 
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded" 
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Assign to Categories</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.filter(c => c.type === contentForm.type).map(cat => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={contentForm.category_ids.includes(cat.id)} 
                        onChange={e => { 
                          if (e.target.checked) {
                            setContentForm({ ...contentForm, category_ids: [...contentForm.category_ids, cat.id] })
                          } else {
                            setContentForm({ ...contentForm, category_ids: contentForm.category_ids.filter(id => id !== cat.id) })
                          }
                        }} 
                      />
                      {cat.name} (Order: {cat.display_order})
                    </label>
                  ))}
                </div>
                {editingItem && contentForm.category_ids.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No categories assigned. Select categories above.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveContent} className="flex-1 py-2 bg-teal-600 rounded hover:bg-teal-700 transition">Save</button>
              <button onClick={closeContentModal} className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - Netflix & Prime Video */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-7xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-900 z-10 pb-4 border-b border-gray-700">
              <div>
                <div className="flex items-center gap-3">
                  <Tv size={24} className={importSource === 'netflix' ? 'text-red-600' : 'text-blue-600'} />
                  <h2 className="text-xl font-bold">
                    {importSource === 'netflix' ? 'Import Netflix Movies' : 'Import Prime Video Movies'}
                  </h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {importTotal > 0 ? `${importTotal} movies available on ${importSource === 'netflix' ? 'Netflix' : 'Prime Video'}` : 'Loading...'}
                </p>
                {importData.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Showing page {importPage} of {importTotalPages} • {importData.length} movies on this page
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💾 Last page: {getSavedPage()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-teal-600/20 text-teal-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} /> Auto-Categorization ON
                  </span>
                  <span className="text-xs text-gray-500">
                    Movies will be auto-assigned to {importSource === 'netflix' ? 'Netflix & Chill' : 'Prime Video Only'} and other relevant categories
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)} 
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => setSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-teal-500"
                  />
                  <span className="text-sm text-gray-300">Select All on This Page</span>
                </label>
                <span className="text-sm text-gray-500">
                  {selectedMovies.size} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, importPage - 1)
                    fetchImportMovies(newPage)
                  }}
                  disabled={importPage <= 1 || importLoading}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400 self-center">
                  Page {importPage} of {importTotalPages}
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(importTotalPages, importPage + 1)
                    fetchImportMovies(newPage)
                  }}
                  disabled={importPage >= importTotalPages || importLoading}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    const savedPage = getSavedPage()
                    fetchImportMovies(savedPage)
                  }}
                  disabled={importLoading}
                  className="px-3 py-1 bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50 text-sm"
                >
                  ↺ Go to Saved Page
                </button>
              </div>
              <button
                onClick={importSelectedMovies}
                disabled={selectedMovies.size === 0 || importLoading}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {importLoading && importProgress > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv size={16} />}
                {importLoading && importProgress > 0 
                  ? `Importing... (${importProgress})` 
                  : `Import ${selectedMovies.size} Movies`
                }
              </button>
            </div>

            {/* Auto-Categorization Info */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400">
                🎯 <span className="font-semibold text-gray-300">Auto-Categorization Rules:</span>
                <br />
                • <span className="text-teal-400">{importSource === 'netflix' ? 'Netflix & Chill' : 'Prime Video Only'}</span> — Always assigned to every movie
                <br />
                • <span className="text-yellow-400">🔥 Trending Now</span> — Rating &gt; 7.5
                <br />
                • <span className="text-yellow-400">🏆 Award Winners</span> — Rating &gt; 8.0
                <br />
                • <span className="text-blue-400">🍿 Feel-Good Movies</span> — Comedy, Romance
                <br />
                • <span className="text-red-400">😱 Edge of Your Seat</span> — Thriller, Horror, Mystery
                <br />
                • <span className="text-purple-400">🤯 Mind-Benders</span> — Sci-Fi, Mystery
                <br />
                • <span className="text-pink-400">😢 Waterworks Guaranteed</span> — Drama, Romance (Rating &gt; 7)
                <br />
                • <span className="text-orange-400">🎯 Underrated Gems</span> — Rating &gt; 7, Vote Count &lt; 500
                <br />
                • <span className="text-indigo-400">🎥 Cinema Classics</span> — Year &lt; 2000, Rating &gt; 7
                <br />
                • <span className="text-green-400">🌍 World Cinema</span> — Non-English films
                <br />
                • <span className="text-cyan-400">🏁 Instant Hook</span> — Popularity &gt; 50
              </p>
            </div>

            {/* Progress */}
            {importLoading && importProgress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Importing...</span>
                  <span>{importProgress} processed</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (importProgress / Math.max(1, selectedMovies.size)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Movie Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {importData.map((movie) => {
                const isSelected = selectedMovies.has(movie.id.toString())
                const genreNames = movie.genres?.map((g: any) => g.name).join(', ') || 
                  movie.genre_ids?.map((id: number) => genreMap[id] || '').filter(Boolean).join(', ') || 'Movie'
                
                const assignedCategories = autoAssignCategories(movie, importSource)
                const categoryNames = assignedCategories
                  .map(id => allImportCategories.find(c => c.id === id)?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')
                
                return (
                  <div 
                    key={movie.id} 
                    className={`bg-gray-800 rounded-lg overflow-hidden border-2 transition cursor-pointer hover:scale-105 ${
                      isSelected 
                        ? 'border-teal-500' 
                        : 'border-transparent hover:border-gray-600'
                    }`}
                    onClick={() => toggleSelection(movie.id.toString())}
                  >
                    <img 
                      src={movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '/placeholder-poster.jpg'}
                      alt={movie.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=' + encodeURIComponent(movie.title)
                      }}
                    />
                    <div className="p-2">
                      <h3 className="font-semibold text-xs truncate">{movie.title}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-yellow-400">⭐ {movie.vote_average?.toFixed(1) || 'N/A'}</span>
                        <span className="text-[10px] text-gray-500">{new Date(movie.release_date).getFullYear()}</span>
                      </div>
                      {categoryNames && (
                        <p className="text-[8px] text-gray-500 truncate mt-0.5">
                          📂 {categoryNames}
                          {assignedCategories.length > 3 && ` +${assignedCategories.length - 3}`}
                        </p>
                      )}
                      <div className="mt-1">
                        {isSelected ? (
                          <span className="text-teal-400 text-[10px] flex items-center gap-0.5">
                            ✓ Selected for import
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Click to select</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {importData.length === 0 && !importLoading && (
              <div className="text-center py-12 text-gray-500">
                <Tv size={48} className="mx-auto mb-4 opacity-50" />
                <p>No movies found. Try refreshing.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
