// components/MovieFeed.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Search, Loader2, Heart, Star, Filter, X } from 'lucide-react';
import { ContentItem } from '@/types/content';
import toast from 'react-hot-toast';

interface Movie {
  id: string;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: string[];
  popularity: number;
}

interface MovieFeedProps {
  onViewDetails: (item: ContentItem) => void;
  onAddToWatchlist: (item: ContentItem) => void;
  onRemoveFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  userId: string;
}

// Genre mapping
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western'
};

// Genre IDs for filtering (backwards mapping)
const GENRE_TO_ID: Record<string, number> = {
  'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
  'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
  'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
  'Mystery': 9648, 'Romance': 10749, 'Sci-Fi': 878, 'TV Movie': 10770,
  'Thriller': 53, 'War': 10752, 'Western': 37
};

export default function MovieFeed({
  onViewDetails,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  userId
}: MovieFeedProps) {
  const { user } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userTaste, setUserTaste] = useState<any>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastMovieRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

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

  // Fetch user taste profile
  useEffect(() => {
    const fetchUserTaste = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('user_taste_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching taste:', error);
          return;
        }

        if (data) {
          setUserTaste(data);
          console.log('🎯 User taste loaded:', data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUserTaste();
  }, [userId]);

  // Fetch watchlist IDs
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .select('content_id')
          .eq('user_id', userId);

        if (error) throw error;
        
        const ids = new Set(data?.map(item => item.content_id) || []);
        setWatchlistIds(ids);
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      }
    };

    fetchWatchlist();
  }, [userId]);

  // Main fetch function
  const fetchMovies = useCallback(async (pageNum: number, append: boolean = true) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      // Build URL with filters
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f'}&language=en-US&page=${pageNum}&sort_by=popularity.desc`;

      // Apply genre filter
      if (selectedGenre !== 'all' && GENRE_TO_ID[selectedGenre]) {
        url += `&with_genres=${GENRE_TO_ID[selectedGenre]}`;
      }

      // Apply mood filter (maps to genres)
      if (selectedMood !== 'all' && MOOD_TO_GENRES[selectedMood]) {
        const moodGenres = MOOD_TO_GENRES[selectedMood].join(',');
        url += `&with_genres=${moodGenres}`;
      }

      // Apply search
      if (searchQuery.trim()) {
        url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f'}&language=en-US&page=${pageNum}&query=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        setHasMore(false);
        return;
      }

      const formattedMovies = data.results.map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        genre_ids: movie.genre_ids || [],
        genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id] || 'Unknown'),
        popularity: movie.popularity,
      }));

      // Filter out movies that are already in the user's watchlist or watched
      const filteredMovies = formattedMovies.filter(
        (movie: Movie) => !watchlistIds.has(movie.id)
      );

      if (append) {
        setMovies(prev => [...prev, ...filteredMovies]);
      } else {
        setMovies(filteredMovies);
      }

      setHasMore(data.total_pages > pageNum && filteredMovies.length > 0);
      
    } catch (error) {
      console.error('Error fetching movies:', error);
      toast.error('Failed to load movies');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedGenre, selectedMood, searchQuery, watchlistIds]);

  // Initial load and filter changes
  useEffect(() => {
    setPage(1);
    setMovies([]);
    setHasMore(true);
    fetchMovies(1, false);
  }, [selectedGenre, selectedMood, searchQuery, fetchMovies]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore]);

  // Trigger fetch when page changes
  useEffect(() => {
    if (page > 1) {
      fetchMovies(page, true);
    }
  }, [page, fetchMovies]);

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const getBackdropUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/original${path}`;
  };

  const handleMovieClick = (movie: Movie) => {
    // Convert to ContentItem format
    const contentItem: ContentItem = {
      id: movie.id,
      title: movie.title,
      description: movie.overview,
      image_url: getImageUrl(movie.poster_path) || '',
      backdrop_url: getBackdropUrl(movie.backdrop_path) || '',
      type: 'movie',
      year: parseInt(movie.release_date?.split('-')[0] || '0'),
      rating: movie.vote_average || 0,
      rating_count: movie.vote_count || 0,
      genre: movie.genres?.join(', ') || '',
    };
    onViewDetails(contentItem);
  };

  const handleAddToWatchlist = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const contentItem: ContentItem = {
      id: movie.id,
      title: movie.title,
      description: movie.overview,
      image_url: getImageUrl(movie.poster_path) || '',
      backdrop_url: getBackdropUrl(movie.backdrop_path) || '',
      type: 'movie',
      year: parseInt(movie.release_date?.split('-')[0] || '0'),
      rating: movie.vote_average || 0,
      rating_count: movie.vote_count || 0,
      genre: movie.genres?.join(', ') || '',
    };
    
    await onAddToWatchlist(contentItem);
    
    // Update watchlist IDs locally
    setWatchlistIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movie.id)) {
        newSet.delete(movie.id);
      } else {
        newSet.add(movie.id);
      }
      return newSet;
    });
  };

  // Get top genres from user taste
  const getTopGenres = () => {
    if (!userTaste?.genre_affinities) return [];
    return Object.entries(userTaste.genre_affinities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
  };

  // Mood options (same as onboarding)
  const MOOD_OPTIONS = [
    { id: 'all', label: 'All Moods' },
    { id: 'action-packed', label: '⚡ Action-Packed' },
    { id: 'feel-good', label: '😊 Feel Good' },
    { id: 'mind-bending', label: '🧠 Mind-Bending' },
    { id: 'comedy', label: '😂 Funny' },
    { id: 'dark', label: '🌙 Dark & Gritty' },
    { id: 'romantic', label: '💕 Romantic' },
    { id: 'scary', label: '👻 Scary' },
    { id: 'epic', label: '🔥 Epic' },
    { id: 'quirky', label: '🎉 Quirky' },
    { id: 'musical', label: '🎵 Musical' },
    { id: 'thoughtful', label: '☕ Thoughtful' },
    { id: 'family', label: '👨‍👩‍👧‍👦 Family' },
  ];

  const GENRE_OPTIONS = [
    'all',
    ...Object.values(GENRE_MAP).filter((v, i, a) => a.indexOf(v) === i)
  ];

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with taste profile */}
      {userTaste?.onboarding_completed && (
        <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 rounded-lg p-4 border border-teal-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm text-gray-400">Based on your taste</p>
              <div className="flex gap-2 mt-1">
                {getTopGenres().map(genre => (
                  <span key={genre} className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
        >
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <button
              onClick={() => {
                setSelectedGenre('all');
                setSelectedMood('all');
                setSearchQuery('');
              }}
              className="text-sm text-teal-400 hover:text-teal-300"
            >
              Clear All
            </button>
          </div>

          {/* Genre Filter */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Genre</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    selectedGenre === genre
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {genre === 'all' ? 'All' : genre}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Filter */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    selectedMood === mood.id
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movie Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies.map((movie, index) => {
          const isLiked = watchlistIds.has(movie.id);
          const imageUrl = getImageUrl(movie.poster_path);
          
          return (
            <div
              key={`${movie.id}-${index}`}
              ref={index === movies.length - 1 ? lastMovieRef : null}
              className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200 group"
              onClick={() => handleMovieClick(movie)}
            >
              <div className="relative">
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
                
                {/* Rating Badge */}
                {movie.vote_average > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                  </div>
                )}

                {/* Like Button */}
                <button
                  onClick={(e) => handleAddToWatchlist(movie, e)}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                >
                  <Heart
                    size={14}
                    className={isLiked ? 'fill-teal-500 text-teal-500' : 'text-gray-400'}
                  />
                </button>

                {/* Genre tags */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    {movie.genres.slice(0, 2).map(genre => (
                      <span key={genre} className="text-[8px] px-1.5 py-0.5 bg-black/70 rounded text-white/80">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                <p className="text-xs text-gray-400 truncate">
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading More Indicator */}
      <div ref={loaderRef} className="flex justify-center py-4">
        {loadingMore && (
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        )}
        {!hasMore && movies.length > 0 && (
          <p className="text-gray-500 text-sm">No more movies to load</p>
        )}
        {!hasMore && movies.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400">No movies found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
