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
  rating_scale?: number
  is_tv_show?: boolean
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: string
  name: string
  description: string
  type: 'movie' | 'music'
  is_active: boolean
  display_order: number
  created_at?: string
}

export interface Recommendation {
  id: string
  user_id: string
  content_id: string
  content_type: 'movie' | 'music'
  recommendation_tier: 'highly' | 'recommended' | 'not'
  comment?: string
  created_at?: string
  profiles?: {
    username: string
    avatar_url: string
  }
  content?: ContentItem
}

export interface WatchlistItem {
  id: string
  user_id: string
  content_id: string
  content_type: 'movie' | 'music'
  created_at?: string
  content?: ContentItem
}
