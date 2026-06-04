import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, mood, userId } = await req.json()
    
    // Mock recommendations for now
    const recommendations = [
      {
        id: '1',
        title: 'Sample Movie',
        description: 'This is a sample recommendation',
        image: '/api/placeholder/400/300',
        platforms: ['Netflix', 'Prime'],
        genres: ['Action', 'Drama'],
        matchScore: 0.95,
        reason: `Based on your ${mood} mood`
      }
    ]
    
    return NextResponse.json({ recommendations })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}
