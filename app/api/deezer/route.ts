import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get the search query from the URL
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    console.log('Searching Deezer for:', query)
    
    // Fetch from Deezer API server-side (no CORS issues)
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query.trim())}&limit=30`
    
    const response = await fetch(deezerUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('Deezer API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Deezer API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Return the data to the client
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Deezer proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from Deezer' },
      { status: 500 }
    )
  }
}
