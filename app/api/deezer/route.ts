import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 })
  }
  
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`)
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Deezer proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch from Deezer' }, { status: 500 })
  }
}
