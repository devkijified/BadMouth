export interface Movie {
  id: string
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  genres: string[]
  rating: number
  userRating?: number
  platforms: string[]
  year: number
  duration: string
}

export interface Music {
  id: string
  title: string
  artist: string
  album: string
  cover_path: string
  genres: string[]
  rating: number
  userRating?: number
  platforms: string[]
  year: number
  duration: string
}

export interface Rating {
  id: string
  userId: string
  username: string
  contentId: string
  contentType: 'movie' | 'music'
  rating: number
  comment: string
  createdAt: string
}

export interface UserRecommendation {
  id: string
  userId: string
  username: string
  contentId: string
  contentType: 'movie' | 'music'
  title: string
  reason: string
  likes: number
  createdAt: string
}
