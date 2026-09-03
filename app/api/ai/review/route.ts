// app/api/ai/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/services/ai/provider';

export async function POST(request: NextRequest) {
  try {
    const { title, description, year, genre } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const aiProvider = getAIProvider();

    // Generate a review
    const prompt = `Write a concise, engaging review for the movie "${title}" (${year || 'N/A'}, ${genre || 'Various'}).
    
Movie Description: ${description || 'No description available'}

Provide a BADMOUTH AI review that includes:
1. A brief, spoiler-free review (2-3 sentences)
2. A rating from 1-10

Format your response as JSON:
{
  "review": "Your review text here...",
  "rating": 8.5
}

Make the review honest, insightful, and engaging. The rating should reflect the movie's quality based on its genre and audience reception.`;

    const result = await aiProvider.generateRecommendations({
      userId: 'ai-review-bot',
      userTasteProfile: {},
      watchHistory: [],
      limit: 1,
    });

    // Since we're using generateRecommendations, we need to adapt it
    // Let's use the model directly or a different approach
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
    
    const result2 = await model.generateContent(prompt);
    const response = await result2.response;
    const text = response.text();

    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        review: parsed.review || text,
        rating: parsed.rating || 7.0,
      });
    }

    return NextResponse.json({
      review: text,
      rating: 7.0,
    });
  } catch (error: any) {
    console.error('AI Review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate review' },
      { status: 500 }
    );
  }
}
