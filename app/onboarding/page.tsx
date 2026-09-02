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

// Popular movies for selection
const POPULAR_MOVIES = [
  { 
    id: '1', 
    title: 'The Lincoln Lawyer', 
    poster: 'https://image.tmdb.org/t/p/w500/3N1etGc27QzEpcNVmfOM1tHRMxI.jpg',
    genres: ['Crime', 'Drama', 'Mystery'],
    moods: ['Suspenseful', 'Thought-provoking']
  },
  { 
    id: '2', 
    title: 'Lucifer', 
    poster: 'https://image.tmdb.org/t/p/w500/6fBJhSKsR2b1jPLQWNarL1dCvLw.jpg',
    genres: ['Crime', 'Fantasy', 'Drama'],
    moods: ['Quirky', 'Suspenseful', 'Funny']
  },
  { 
    id: '3', 
    title: 'Inception', 
    poster: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    moods: ['Mind-bending', 'Suspenseful', 'Epic']
  },
  { 
    id: '4', 
    title: 'The Dark Knight', 
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    genres: ['Action', 'Crime', 'Drama'],
    moods: ['Dark', 'Suspenseful', 'Action-packed']
  },
  { 
    id: '5', 
    title: 'Interstellar', 
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6M1NbZvWd.jpg',
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    moods: ['Epic', 'Emotional', 'Mind-bending']
  },
  { 
    id: '6', 
    title: 'The Shawshank Redemption', 
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    genres: ['Drama'],
    moods: ['Heartwarming', 'Emotional', 'Thought-provoking']
  },
  { 
    id: '7', 
    title: 'Pulp Fiction', 
    poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8vIfUBHJ.jpg',
    genres: ['Crime', 'Drama'],
    moods: ['Quirky', 'Dark', 'Suspenseful']
  },
  { 
    id: '8', 
    title: 'The Matrix', 
    poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    genres: ['Action', 'Sci-Fi'],
    moods: ['Mind-bending', 'Action-packed', 'Suspenseful']
  },
  { 
    id: '9', 
    title: 'Goodfellas', 
    poster: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
    genres: ['Crime', 'Drama'],
    moods: ['Dark', 'Suspenseful', 'Action-packed']
  },
  { 
    id: '10', 
    title: 'The Godfather', 
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    genres: ['Crime', 'Drama'],
    moods: ['Dark', 'Epic', 'Thought-provoking']
  },
  { 
    id: '11', 
    title: 'Forrest Gump', 
    poster: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    genres: ['Comedy', 'Drama', 'Romance'],
    moods: ['Heartwarming', 'Feel-good', 'Emotional']
  },
  { 
    id: '12', 
    title: 'Fight Club', 
    poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    genres: ['Drama'],
    moods: ['Dark', 'Mind-bending', 'Thought-provoking']
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovies, setSelectedMovies] = useState<typeof POPULAR_MOVIES>([]);
  const [preferences, setPreferences] = useState({
    languages: ['en'],
    runtimeMin: 90,
    runtimeMax: 150,
  });

  // Check if user already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_taste_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (data?.onboarding_completed) {
        router.push('/');
      }
    };

    checkOnboarding();
  }, [user, router]);

  const filteredMovies = POPULAR_MOVIES.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleMovie = (movie: typeof POPULAR_MOVIES[0]) => {
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
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        movie.moods?.forEach((mood: string) => {
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

      const { error } = await supabase
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
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      toast.success(`🎉 Great choices! Based on ${selectedMovies.length} movies, we've learned your taste!`);
      router.push('/');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to save preferences: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">🎬 What movies do you love?</h2>
            <p className="text-gray-400 mt-2">Select all the movies that you've enjoyed</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search movies or genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Movie Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
            {filteredMovies.map(movie => {
              const isSelected = selectedMovies.find(m => m.id === movie.id);
              return (
                <button
                  key={movie.id}
                  onClick={() => toggleMovie(movie)}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    isSelected ? 'ring-2 ring-teal-500 scale-95' : 'hover:scale-105'
                  }`}
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-xs font-medium text-white truncate">{movie.title}</p>
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
      );
    }

    if (step === 2) {
      // Show what we learned
      const genreCounts: Record<string, number> = {};
      selectedMovies.forEach(movie => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });
      
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">🧠 We've learned your taste!</h2>
            <p className="text-gray-400 mt-2">Based on your movie choices</p>
          </div>

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

          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Movies You Like</h3>
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
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-teal-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              BADMOUTH AI
            </h1>
          </div>
          <p className="text-gray-400 text-sm">Step {step} of 2</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-teal-500' : 'bg-gray-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-teal-500' : 'bg-gray-700'}`} />
        </div>

        <div className="bg-gray-900/50 rounded-xl p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
