// app/api/ai/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { title, description, year, genre, rating } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json({
        review: `"${title}" is a ${year || 'recent'} ${genre || 'film'} that has received mixed to positive reviews. With a ${rating || 'decent'} rating, it offers an engaging experience for fans of the genre.`,
        rating: rating || 7.0
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite-preview-02-05' 
    });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          review: parsed.review || text,
          rating: parsed.rating || 7.0,
        });
      } catch (e) {
        // If JSON parsing fails, return the raw text
      }
    }

    return NextResponse.json({
      review: text || `"${title}" is a compelling ${genre || 'film'} that offers an engaging experience.`,
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
