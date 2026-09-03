import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();

    if (!title) {
      return NextResponse.json(
        { error: 'Movie title is required' },
        { status: 400 }
      );
    }

    const aiProvider = getAIProvider();

    const result = await aiProvider.generateReview({
      title,
      description: body.description || body.long_description || '',
      year: body.year || '',
      genre: body.genre || '',
      rating: body.rating ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI review API error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI review failed',
      },
      { status: 500 }
    );
  }
}
