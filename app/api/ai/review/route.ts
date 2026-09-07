// app/api/ai/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  try {
    const { title, description, year, genre, rating } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json({
        review: `"${title}" is a ${year || 'recent'} ${genre || 'film'} that offers an engaging experience for fans of the genre.`,
        rating: rating || 7.0
      });
    }

    const genAI = new GoogleGenAI({ 
      apiKey: GEMINI_API_KEY 
    });

    const prompt = `
You are BADMOUTH AI, a sharp but fair movie critic.

Write a concise review in two short paragraphs.

Rules:
- Be direct, entertaining, and specific.
- Discuss story, acting, pacing, direction, and overall enjoyment.
- Do not invent actors, plot details, or facts.
- Do not use Markdown headings.
- Do not include a numerical rating.

Movie title: ${title}
Year: ${year || 'Unknown'}
Genre: ${genre || 'Unknown'}
Existing rating: ${rating ?? 'N/A'}
Description: ${description || 'No description available'}
`;

    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200,
      },
    });

    const review = response.text?.trim() || `"${title}" is a compelling ${genre || 'film'} that offers an engaging experience.`;

    return NextResponse.json({
      review,
      rating: rating || 7.0,
    });

  } catch (error: any) {
    console.error('AI Review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate review' },
      { status: 500 }
    );
  }
}
