'use server'

interface DeezerTrack {
  id: number
  title: string
  preview: string
  artist: {
    name: string
  }
  album: {
    title: string
    cover_xl: string
    cover_medium: string
  }
  duration: number
  rank: number
}

interface DeezerResponse {
  data: DeezerTrack[]
  total: number
  next?: string
}

export async function searchDeezerMusic(query: string, limit: number = 20): Promise<DeezerTrack[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    const encodedQuery = encodeURIComponent(query)
    const response = await fetch(`https://api.deezer.com/search?q=${encodedQuery}&limit=${limit}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`)
    }

    const data: DeezerResponse = await response.json()
    
    // Return only the necessary fields
    return data.data.map(track => ({
      id: track.id,
      title: track.title,
      preview: track.preview,
      artist: {
        name: track.artist.name
      },
      album: {
        title: track.album.title,
        cover_xl: track.album.cover_xl,
        cover_medium: track.album.cover_medium
      },
      duration: track.duration,
      rank: track.rank
    }))
  } catch (error) {
    console.error('Deezer search error:', error)
    return []
  }
}

export async function getTrackById(trackId: number): Promise<DeezerTrack | null> {
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`)
    }

    const track: DeezerTrack = await response.json()
    return track
  } catch (error) {
    console.error('Deezer track fetch error:', error)
    return null
  }
}

export async function getArtistTopTracks(artistName: string, limit: number = 5): Promise<DeezerTrack[]> {
  try {
    const encodedArtist = encodeURIComponent(artistName)
    const response = await fetch(`https://api.deezer.com/search?q=artist:"${encodedArtist}"&limit=${limit}`, {
      next: { revalidate: 86400 }
    })

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`)
    }

    const data: DeezerResponse = await response.json()
    return data.data
  } catch (error) {
    console.error('Deezer artist tracks error:', error)
    return []
  }
}
