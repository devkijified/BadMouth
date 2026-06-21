import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the search query from the URL
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    console.log('Searching Deezer for:', query)
    
    // Try multiple search approaches
    const searchQueries = [
      query.trim(), // Original query
      query.trim().replace(/\s+/g, ' '), // Normalized spaces
      query.trim().replace(/['"]/g, ''), // Remove quotes
    ]
    
    let data = null
    let lastError = null
    
    // Try each search query until one works
    for (const searchQuery of searchQueries) {
      try {
        const encodedQuery = encodeURIComponent(searchQuery)
        const deezerUrl = `https://api.deezer.com/search?q=${encodedQuery}&limit=30`
        
        console.log('Trying Deezer URL:', deezerUrl)
        
        const response = await fetch(deezerUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; BADMOUTH/1.0)'
          },
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.data && result.data.length > 0) {
            data = result
            console.log('Found results with query:', searchQuery)
            break
          }
        }
      } catch (err) {
        lastError = err
        console.log('Failed with query:', searchQuery, err)
        continue
      }
    }
    
    // If no results found with regular search, try advanced search
    if (!data || !data.data || data.data.length === 0) {
      console.log('Trying advanced search...')
      
      // Try searching by artist and track separately
      const parts = query.trim().split(/\s+by\s+|\s+-\s+|\s+&amp;\s+|\s+&\s+/i)
      let artistQuery = ''
      let trackQuery = ''
      
      if (parts.length > 1) {
        // Query might be "Track by Artist" format
        trackQuery = parts[0].trim()
        artistQuery = parts.slice(1).join(' ').trim()
      } else {
        // Try to detect if it's an artist name
        const words = query.trim().split(' ')
        if (words.length > 2) {
          // Could be an artist name with multiple words
          artistQuery = query.trim()
        } else {
          trackQuery = query.trim()
        }
      }
      
      // Search by artist
      if (artistQuery) {
        try {
          const artistUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistQuery)}&limit=5`
          const artistResponse = await fetch(artistUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; BADMOUTH/1.0)'
            },
          })
          
          if (artistResponse.ok) {
            const artistData = await artistResponse.json()
            if (artistData.data && artistData.data.length > 0) {
              // Get tracks by the first artist
              const artistId = artistData.data[0].id
              const trackUrl = `https://api.deezer.com/artist/${artistId}/top?limit=20`
              const trackResponse = await fetch(trackUrl, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (compatible; BADMOUTH/1.0)'
                },
              })
              
              if (trackResponse.ok) {
                const trackData = await trackResponse.json()
                if (trackData.data && trackData.data.length > 0) {
                  // Filter tracks by title if trackQuery exists
                  let filteredTracks = trackData.data
                  if (trackQuery) {
                    const trackLower = trackQuery.toLowerCase()
                    filteredTracks = trackData.data.filter((track: any) => 
                      track.title.toLowerCase().includes(trackLower)
                    )
                  }
                  
                  if (filteredTracks.length > 0) {
                    data = { data: filteredTracks }
                    console.log('Found results via artist search')
                  }
                }
              }
            }
          }
        } catch (err) {
          console.log('Artist search failed:', err)
        }
      }
      
      // If still no results, try searching by track only with a broader query
      if (!data || !data.data || data.data.length === 0) {
        try {
          const broadQuery = query.trim().replace(/\s+/g, ' ')
          const broadUrl = `https://api.deezer.com/search/track?q=${encodeURIComponent(broadQuery)}&limit=30`
          const broadResponse = await fetch(broadUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; BADMOUTH/1.0)'
            },
          })
          
          if (broadResponse.ok) {
            const broadData = await broadResponse.json()
            if (broadData.data && broadData.data.length > 0) {
              data = broadData
              console.log('Found results via broad track search')
            }
          }
        } catch (err) {
          console.log('Broad track search failed:', err)
        }
      }
    }
    
    // Return results or empty array
    if (data && data.data && data.data.length > 0) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json({ data: [] })
    }
    
  } catch (error) {
    console.error('Deezer proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from Deezer', data: [] },
      { status: 500 }
    )
  }
}
