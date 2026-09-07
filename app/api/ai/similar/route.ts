// app/api/ai/similar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { title, genre, year } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not configured');
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // Fetch similar movies from TMDB
    const genreSearch = genre ? genre.split(',').slice(0, 3).join(',') : '';
    const searchUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&page=1&with_genres=${encodeURIComponent(genreSearch)}&vote_count.gte=50`;
    
    const searchResponse = await fetch(searchUrl);
    let movies = [];
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      movies = data.results || [];
    }

    // If no movies found, get trending
    if (movies.length === 0) {
      const trendingResponse = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US`
      );
      if (trendingResponse.ok) {
        const data = await trendingResponse.json();
        movies = data.results || [];
      }
    }

    // Filter out the current movie
    const filteredMovies = movies
      .filter((m: any) => m.title.toLowerCase() !== title.toLowerCase())
      .slice(0, 10);

    if (filteredMovies.length === 0) {
      return NextResponse.json({ 
        success: true, 
        recommendations: [],
        source: 'none'
      });
    }

    let recommendations = filteredMovies;
    let source = 'tmdb';

    // Use Gemini to rank recommendations if available
    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenAI({ 
          apiKey: GEMINI_API_KEY 
        });

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        const movieList = filteredMovies.slice(0, 10).map((m: any, i: number) => 
          `${i+1}. ${m.title} (${m.release_date?.split('-')[0] || 'N/A'}) - ${m.overview?.slice(0, 100) || 'No description'}`
        ).join('\n');

        const prompt = `Based on someone who enjoyed "${title}" (${year || 'N/A'}, ${genre || 'various genres'}), rank these movies from best to worst recommendation. Return ONLY the movie titles in order, separated by newlines.

Movies:
${movieList}`;

        const response = await genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1200,
          },
        });

        const text = response.text?.trim() || '';
        
        // Parse the ranked titles
        const rankedTitles = text.split('\n')
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 0);

        // Reorder movies based on AI ranking
        recommendations = [];
        const movieMap = new Map(filteredMovies.map((m: any) => [m.title, m]));
        
        for (const rankedTitle of rankedTitles) {
          const movie = movieMap.get(rankedTitle);
          if (movie) {
            recommendations.push(movie);
            movieMap.delete(rankedTitle);
          }
        }
        
        // Add remaining movies
        recommendations = [...recommendations, ...Array.from(movieMap.values())];
        source = 'gemini-ranked';
        
      } catch (error) {
        console.error('AI ranking error:', error);
        recommendations = filteredMovies;
        source = 'tmdb-fallback';
      }
    }

    return NextResponse.json({ 
      success: true, 
      recommendations: recommendations.slice(0, 6),
      source
    });

  } catch (error: any) {
    console.error('Similar movies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
