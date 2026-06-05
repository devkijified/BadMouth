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
}

export interface Category {
  id: string
  name: string
  description: string
  type: 'movie' | 'music'
  is_active: boolean
  display_order: number
}
