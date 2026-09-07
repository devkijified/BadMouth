// app/api/ai/similar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TMDB_API_KEY = process.env.TMDB_API_KEY; // ✅ Use server-side
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { title, genre, year } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // First, search TMDB for similar movies by genre
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

    // Rest of your code...
    // (AI ranking with Gemini)
  } catch (error: any) {
    console.error('Similar movies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
