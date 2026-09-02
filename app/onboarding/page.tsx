// app/onboarding/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { 
  ChevronRight, Sparkles, Film, Heart, Clock, 
  Search, Check, Star, ArrowLeft, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Movie {
  id: string;
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  genres?: string[];
  mood?: string[];
}

// Genre mapping
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// Mood mapping based on genres
const getMoodsForGenres = (genreIds: number[]): string[] => {
  const moods: string[] = [];
  const genreNames = genreIds.map(id => GENRE_MAP[id] || '');
  
  if (genreNames.some(g => ['Action', 'Thriller', 'Crime'].includes(g))) {
    moods.push('Action-packed', 'Suspenseful');
  }
  if (genreNames.some(g => ['Comedy', 'Family'].includes(g))) {
    moods.push('Feel-good', 'Funny');
  }
  if (genreNames.some(g => ['Drama', 'Romance'].includes(g))) {
    moods.push('Emotional', 'Heartwarming');
  }
  if (genreNames.some(g => ['Sci-Fi', 'Fantasy', 'Adventure'].includes(g))) {
    moods.push('Mind-bending', 'Epic');
  }
  if (genreNames.some(g => ['Horror', 'Thriller'].includes(g))) {
    moods.push('Dark', 'Suspenseful');
  }
  if (genreNames.some(g => ['Documentary', 'History'].includes(g))) {
    moods.push('Thought-provoking');
  }
  
  return moods.length > 0 ? moods : ['Entertaining'];
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [preferences, setPreferences] = useState({
    languages: ['en'],
    runtimeMin: 90,
    runtimeMax: 150,
  });

  // Fetch popular movies from TMDB
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        setLoadingMovies(true);
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f'}&language=en-US&page=1`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        
        const data = await response.json();
        console.log('🎬 Fetched movies:', data.results?.length || 0);
        
        const movies = (data.results || []).map((movie: any) => ({
          id: movie.id.toString(),
          title: movie.title,
          poster_path: movie.poster_path,
          overview: movie.overview,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genre_ids: movie.genre_ids || [],
          genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id] || 'Unknown'), // ✅ FIX: added type
          mood: getMoodsForGenres(movie.genre_ids || []),
        }));
        
        setPopularMovies(movies);
      } catch (error) {
        console.error('Error fetching popular movies:', error);
        // Fallback to hardcoded movies if API fails
        setPopularMovies(getFallbackMovies());
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchPopularMovies();
  }, []);

  // Fallback movies if TMDB fails
  const getFallbackMovies = (): Movie[] => {
    return [
      { 
        id: '1', 
        title: 'The Shawshank Redemption', 
        poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        overview: 'Two imprisoned men bond over a number of years.',
        release_date: '1994-09-23',
        vote_average: 8.7,
        genre_ids: [18],
        genres: ['Drama'],
        mood: ['Emotional', 'Heartwarming']
      },
      { 
        id: '2', 
        title: 'The Godfather', 
        poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        overview: 'The aging patriarch of an organized crime dynasty...',
        release_date: '1972-03-24',
        vote_average: 8.7,
        genre_ids: [80, 18],
        genres: ['Crime', 'Drama'],
        mood: ['Dark', 'Epic']
      },
      { 
        id: '3', 
        title: 'The Dark Knight', 
        poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        overview: 'When the menace known as the Joker wreaks havoc...',
        release_date: '2008-07-18',
        vote_average: 8.5,
        genre_ids: [28, 80, 18],
        genres: ['Action', 'Crime', 'Drama'],
        mood: ['Action-packed', 'Dark', 'Suspenseful']
      },
      { 
        id: '4', 
        title: 'Inception', 
        poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
        overview: 'A thief who steals corporate secrets through dream-sharing technology...',
        release_date: '2010-07-16',
        vote_average: 8.3,
        genre_ids: [28, 878, 12],
        genres: ['Action', 'Sci-Fi', 'Adventure'],
        mood: ['Mind-bending', 'Epic', 'Suspenseful']
      },
      { 
        id: '5', 
        title: 'Interstellar', 
        poster_path: '/gEU2QniE6E77NI6lCU6M1NbZvWd.jpg',
        overview: 'A team of explorers travel through a wormhole in space...',
        release_date: '2014-11-07',
        vote_average: 8.6,
        genre_ids: [878, 12, 18],
        genres: ['Sci-Fi', 'Adventure', 'Drama'],
        mood: ['Mind-bending', 'Epic', 'Emotional']
      },
      { 
        id: '6', 
        title: 'Forrest Gump', 
        poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
        overview: 'The presidencies of Kennedy and Johnson...',
        release_date: '1994-07-06',
        vote_average: 8.5,
        genre_ids: [35, 18, 10749],
        genres: ['Comedy', 'Drama', 'Romance'],
        mood: ['Heartwarming', 'Feel-good', 'Emotional']
      },
      { 
        id: '7', 
        title: 'The Matrix', 
        poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        overview: 'A computer hacker learns about the true nature of his reality...',
        release_date: '1999-03-31',
        vote_average: 8.5,
        genre_ids: [28, 878],
        genres: ['Action', 'Sci-Fi'],
        mood: ['Mind-bending', 'Action-packed']
      },
      { 
        id: '8', 
        title: 'Fight Club', 
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        overview: 'An insomniac office worker and a devil-may-care soap maker...',
        release_date: '1999-10-15',
        vote_average: 8.4,
        genre_ids: [18],
        genres: ['Drama'],
        mood: ['Dark', 'Mind-bending', 'Thought-provoking']
      },
      { 
        id: '9', 
        title: 'Goodfellas', 
        poster_path: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
        overview: 'The story of Henry Hill and his life in the mob...',
        release_date: '1990-09-19',
        vote_average: 8.5,
        genre_ids: [80, 18],
        genres: ['Crime', 'Drama'],
        mood: ['Dark', 'Suspenseful', 'Action-packed']
      },
      { 
        id: '10', 
        title: 'Pulp Fiction', 
        poster_path: '/d5iIlFn5s0ImszYzBPb8vIfUBHJ.jpg',
        overview: 'The lives of two mob hitmen, a boxer...',
        release_date: '1994-10-14',
        vote_average: 8.5,
        genre_ids: [80, 18],
        genres: ['Crime', 'Drama'],
        mood: ['Quirky', 'Dark', 'Suspenseful']
      },
    ];
  };

  // Check if user already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_taste_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (data?.onboarding_completed) {
          router.push('/');
        }
      } catch (error) {
        // Table might not exist yet, continue
        console.log('No profile found, continuing with onboarding');
      }
    };

    checkOnboarding();
  }, [user, router]);

  const filteredMovies = popularMovies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (movie.genres || []).some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleMovie = (movie: Movie) => {
    setSelectedMovies(prev =>
      prev.find(m => m.id === movie.id)
        ? prev.filter(m => m.id !== movie.id)
        : [...prev, movie]
    );
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    if (selectedMovies.length === 0) {
      toast.error('Please select at least one movie you like');
      return;
    }

    setLoading(true);
    try {
      // Calculate genre affinities from selected movies
      const genreCounts: Record<string, number> = {};
      const moodCounts: Record<string, number> = {};
      
      selectedMovies.forEach(movie => {
        // Use genres from the movie object
        const genres = movie.genres || [];
        genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        
        // Use moods from the movie object
        const moods = movie.mood || [];
        moods.forEach((mood: string) => {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
      });
      
      const total = selectedMovies.length;
      const genreAffinities: Record<string, number> = {};
      Object.entries(genreCounts).forEach(([genre, count]) => {
        genreAffinities[genre] = Math.min(count / total, 1);
      });
      
      const moodPreferences = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mood]) => mood);

      // ✅ FIX: Use upsert with proper syntax
      const { data, error } = await supabase
        .from('user_taste_profiles')
        .upsert({
          user_id: user.id,
          genre_affinities: genreAffinities,
          mood_preferences: moodPreferences,
          language_preferences: preferences.languages || ['en'],
          preferred_runtime_min: preferences.runtimeMin || 90,
          preferred_runtime_max: preferences.runtimeMax || 150,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      toast.success(`🎉 Great choices! Based on ${selectedMovies.length} movies, we've learned your taste!`);
      router.push('/');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to save preferences: ${error.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Get full image URL
  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/w185${path}`;
  };

  if (loadingMovies) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading popular movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-teal-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              BADMOUTH AI
            </h1>
          </div>
          <p className="text-gray-400 text-sm">Step {step} of 2</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 max-w-md mx-auto">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-teal-500' : 'bg-gray-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-teal-500' : 'bg-gray-700'}`} />
        </div>

        <div className="bg-gray-900/50 rounded-xl p-6 max-w-3xl mx-auto">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">🎬 What movies do you love?</h2>
                <p className="text-gray-400 mt-2">Select movies you've enjoyed (at least 1)</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Movie Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                {filteredMovies.slice(0, 20).map(movie => {
                  const isSelected = selectedMovies.find(m => m.id === movie.id);
                  const imageUrl = getImageUrl(movie.poster_path);
                  
                  return (
                    <button
                      key={movie.id}
                      onClick={() => toggleMovie(movie)}
                      className={`relative rounded-lg overflow-hidden transition-all ${
                        isSelected ? 'ring-2 ring-teal-500 scale-95' : 'hover:scale-105'
                      }`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover bg-gray-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(movie.title)}`;
                          }}
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                          {movie.title}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <p className="text-xs font-medium text-white truncate">{movie.title}</p>
                        {movie.genres && movie.genres.length > 0 && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {movie.genres.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {selectedMovies.length} movie{selectedMovies.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedMovies.length === 0}
                  className="px-6 py-2 bg-teal-500 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">🧠 We've learned your taste!</h2>
                <p className="text-gray-400 mt-2">Based on your movie choices</p>
              </div>

              {/* Genre affinities */}
              {(() => {
                const genreCounts: Record<string, number> = {};
                selectedMovies.forEach(movie => {
                  (movie.genres || []).forEach((genre: string) => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                  });
                });
                const topGenres = Object.entries(genreCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);

                return (
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {topGenres.map(([genre, count]) => (
                        <span 
                          key={genre}
                          className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm flex items-center gap-1"
                        >
                          {genre} <span className="text-xs text-teal-500">({count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Movies You Selected</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMovies.map(movie => (
                    <span 
                      key={movie.id}
                      className="px-3 py-1 bg-gray-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {movie.title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-2 py-3 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {loading ? 'Saving...' : 'Get Recommendations'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
