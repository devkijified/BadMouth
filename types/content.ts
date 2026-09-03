// types/content.ts

export interface ContentItem {
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

export interface Category {
  id: string
  name: string
  description: string
  type: 'movie' | 'music' | 'experience'  // ← NEW: experience type
  is_active: boolean
  display_order: number
  icon?: string
  created_at?: string
}

// ✅ NEW: Experience/Mood Categories
export interface ExperienceCategory {
  id: string
  name: string
  pitch: string
  icon: string
  color: string
  tags: string[] // Genre tags for filtering TMDB
  keywords: string[] // For search/description matching
}
