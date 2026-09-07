// app/api/tmdb/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Genre mapping
const GENRE_TO_ID: Record<string, number> = {
  'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
  'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
  'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
  'Mystery': 9648, 'Romance': 10749, 'Sci-Fi': 878, 'TV Movie': 10770,
  'Thriller': 53, 'War': 10752, 'Western': 37
};

// Mood to genre mapping
const MOOD_TO_GENRES: Record<string, number[]> = {
  'action-packed': [28, 53, 878],
  'feel-good': [35, 10751, 10749],
  'mind-bending': [878, 53, 9648],
  'comedy': [35],
  'dark': [18, 80, 53],
  'romantic': [10749, 18],
  'scary': [27, 53],
  'epic': [12, 28, 878],
  'quirky': [35, 80, 18],
  'musical': [10402, 10749],
  'thoughtful': [18, 99, 36],
  'family': [10751, 16, 12],
};

// Platform provider IDs
const PLATFORM_IDS: Record<string, number> = {
  'netflix': 8,
  'prime': 9,
  'disney': 337,
  'hbo': 384,
  'apple': 350,
  'hulu': 15,
  'peacock': 386,
  'paramount': 531,
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const genre = searchParams.get('genre');
    const mood = searchParams.get('mood');
    const year = searchParams.get('year');
    const platform = searchParams.get('platform');
    const preset = searchParams.get('preset');
    const query = searchParams.get('query');

    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;

    // Handle presets
    if (preset === 'trending') {
      url += '&sort_by=popularity.desc';
    } else if (preset === 'top-rated') {
      url += '&sort_by=vote_average.desc&vote_count.gte=100';
    } else if (preset === '2026') {
      url += '&sort_by=popularity.desc&primary_release_year=2026';
    }

    // Genre filter
    if (genre && genre !== 'all' && GENRE_TO_ID[genre]) {
      url += `&with_genres=${GENRE_TO_ID[genre]}`;
    }

    // Mood filter
    if (mood && mood !== 'all' && MOOD_TO_GENRES[mood]) {
      const moodGenres = MOOD_TO_GENRES[mood].join(',');
      url += `&with_genres=${moodGenres}`;
    }

    // Year filter
    if (year && year !== 'all' && preset !== '2026') {
      url += `&primary_release_year=${year}`;
    }

    // Platform filter
    if (platform && platform !== 'all' && PLATFORM_IDS[platform]) {
      const providerId = PLATFORM_IDS[platform];
      url += `&with_watch_providers=${providerId}&watch_region=US`;
    }

    // Search
    if (query) {
      url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&query=${encodeURIComponent(query)}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch movies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in TMDB discover route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
