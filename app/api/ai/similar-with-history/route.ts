// app/api/ai/similar-with-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { GoogleGenAI } from '@google/genai';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    console.log('🎯 Fetching "Because you liked..." recommendations for user:', userId);

    // 1. Get user's watch history (movies they selected during onboarding)
    const { data: watchHistory, error: watchError } = await supabase
      .from('user_watch_history')
      .select('*')
      .eq('user_id', userId)
      .eq('watch_status', 'watched')
      .order('watched_date', { ascending: false })
      .limit(10);

    if (watchError) {
      console.error('Error fetching watch history:', watchError);
      return NextResponse.json({ error: 'Failed to fetch watch history' }, { status: 500 });
    }

    if (!watchHistory || watchHistory.length === 0) {
      console.log('ℹ️ No watch history found');
      return NextResponse.json({ 
        success: true, 
        recommendations: [],
        source: 'no-history'
      });
    }

    console.log(`📺 Found ${watchHistory.length} watched movies`);

    // 2. Get TMDB details for each watched movie
    const watchedMovies = await Promise.all(
      watchHistory.map(async (item) => {
        try {
          const response = await fetch(
            `${TMDB_BASE_URL}/movie/${item.content_id}?api_key=${TMDB_API_KEY}&language=en-US`
          );
          if (!response.ok) return null;
          const data = await response.json();
          return {
            id: data.id,
            title: data.title,
            genres: data.genres?.map((g: any) => g.name) || [],
            overview: data.overview,
            release_date: data.release_date,
            vote_average: data.vote_average,
            poster_path: data.poster_path,
          };
        } catch (error) {
          console.error('Error fetching movie details:', error);
          return null;
        }
      })
    );

    const validWatchedMovies = watchedMovies.filter(m => m !== null);
    console.log(`🎬 Found ${validWatchedMovies.length} valid watched movies`);

    // 3. Get similar movies using Gemini
    let similarRecommendations = [];
    let source = 'none';

    if (GEMINI_API_KEY && validWatchedMovies.length > 0) {
      try {
        const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        // Build the prompt with watched movies
        const watchedList = validWatchedMovies.slice(0, 5).map((m: any) => 
          `- ${m.title} (${m.genres.join(', ')})`
        ).join('\n');

        const prompt = `
You are a movie recommendation expert. Based on these movies the user liked:

${watchedList}

Find 10 similar movies they would enjoy. For each movie, provide:
- TMDB ID (if you know it, otherwise provide title)
- Title
- Why they would like it (2-3 sentences)

Return as JSON:
{
  "recommendations": [
    {
      "tmdbId": 12345,
      "title": "Movie Title",
      "reason": "Because you liked The Lincoln Lawyer, you'll enjoy this legal thriller with similar courtroom drama."
    }
  ]
}

Make each recommendation's reason personal and specific, referencing the movie they liked.
`;

        const response = await genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          },
        });

        const text = response.text?.trim() || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.recommendations && parsed.recommendations.length > 0) {
            similarRecommendations = parsed.recommendations;
            source = 'gemini-similar';
            console.log(`✅ Gemini returned ${similarRecommendations.length} similar recommendations`);
          }
        }
      } catch (error) {
        console.error('Gemini similar error:', error);
      }
    }

    // 4. Fallback: Use TMDB similar endpoint for each watched movie
    if (similarRecommendations.length === 0 && validWatchedMovies.length > 0) {
      console.log('⚠️ Gemini fallback: Using TMDB similar movies...');
      const fallbackRecs: any[] = [];
      const seenTitles = new Set<string>();

      for (const movie of validWatchedMovies.slice(0, 3)) {
        try {
          const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movie.id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`
          );
          if (!response.ok) continue;
          const data = await response.json();
          const similar = data.results?.slice(0, 4) || [];
          
          for (const sim of similar) {
            if (!seenTitles.has(sim.title)) {
              seenTitles.add(sim.title);
              fallbackRecs.push({
                tmdbId: sim.id,
                title: sim.title,
                reason: `Because you liked "${movie.title}", you might enjoy this similar film.`
              });
            }
          }
        } catch (error) {
          console.error('Error fetching similar movies:', error);
        }
      }

      similarRecommendations = fallbackRecs.slice(0, 10);
      source = 'tmdb-similar';
      console.log(`✅ TMDB similar returned ${similarRecommendations.length} recommendations`);
    }

    // 5. Fetch full details for each recommendation
    const merged = await Promise.all(
      similarRecommendations.map(async (rec: any) => {
        try {
          const id = rec.tmdbId;
          if (!id) return null;
          
          const response = await fetch(
            `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
          );
          if (!response.ok) return null;
          const data = await response.json();
          
          return {
            ...rec,
            content: {
              id: data.id.toString(),
              title: data.title,
              description: data.overview || '',
              image_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
              backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
              type: 'movie' as const,
              year: data.release_date ? new Date(data.release_date).getFullYear() : 0,
              genre: data.genres?.map((g: any) => g.name).join(', ') || '',
              rating: data.vote_average || 0,
              rating_count: data.vote_count || 0,
            }
          };
        } catch (error) {
          console.error('Error fetching TMDB data:', error);
          return null;
        }
      })
    );

    const finalRecommendations = merged.filter(rec => rec !== null);
    console.log(`✅ Returning ${finalRecommendations.length} "Because you liked..." recommendations`);

    return NextResponse.json({ 
      success: true, 
      recommendations: finalRecommendations,
      source: source
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
