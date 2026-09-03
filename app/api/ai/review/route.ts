// app/api/ai/review/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Try the primary model first, fall back to a stable one if it's unavailable —
// preview model names get deprecated/renamed without notice.
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-1.5-flash'];

export async function POST(request: NextRequest) {
  try {
    const { title, description, year, genre } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const prompt = `Write a concise, engaging review for the movie "${title}" (${year || 'N/A'}, ${genre || 'Various'}).

Movie Description: ${description || 'No description available'}

Provide a BADMOUTH AI review that includes:
1. A brief, spoiler-free review (2-3 sentences)
2. A rating from 1-10

Respond with ONLY raw JSON, no markdown code fences, no preamble:
{
  "review": "Your review text here...",
  "rating": 8.5
}

Make the review honest, insightful, and engaging. The rating should reflect the movie's quality based on its genre and audience reception.`;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    let text: string | null = null;
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        text = result.response.text();
        break;
      } catch (err) {
        console.warn(`Gemini model "${modelName}" failed, trying next:`, err);
        lastError = err;
      }
    }

    if (!text) {
      throw lastError || new Error('All Gemini model attempts failed');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          review: parsed.review || text,
          rating: typeof parsed.rating === 'number' ? parsed.rating : 7.0,
        });
      } catch (parseErr) {
        console.warn('Failed to parse Gemini JSON, falling back to raw text:', parseErr);
      }
    }

    return NextResponse.json({ review: text, rating: 7.0 });
  } catch (error: any) {
    console.error('AI Review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate review' },
      { status: 500 }
    );
  }
}
