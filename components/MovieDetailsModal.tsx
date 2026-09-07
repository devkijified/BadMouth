// components/MovieDetailsModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Star,
  Heart,
  Play,
  Calendar,
  Clock,
  ExternalLink,
  Sparkles,
  Loader2,
  Share2,
  Globe,
  Tag,
  ChevronDown,
  Clapperboard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ContentItem } from '@/types/content';
import toast from 'react-hot-toast';

interface MovieDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem | null;
  onRecommend: (item: ContentItem) => void;
  onAddToWatchlist: (item: ContentItem) => Promise<void>;
  onRemoveFromWatchlist: (id: string) => Promise<void>;
  isInWatchlist: (id: string) => boolean;
  userId: string;
}

interface CastMember {
  id: string;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CrewMember {
  id: string;
  name: string;
  job: string;
  profile_path: string | null;
}

interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

interface Platform {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface MovieDetails {
  title: string;
  overview: string;
  tagline: string;
  release_date: string;
  runtime: number;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string;
  }[];
  certification?: string;
}

interface TMDBResponse {
  movie?: any;
  credits?: any;
  videos?: any;
  providers?: any;
}

interface RecommendationItem {
  id: string;
  title: string;
  image_url: string | null;
  backdrop_url: string | null;
  description: string;
  longdescription: string;
  year: number | null;
  rating: number | null;
  rating_count: number;
  genre: string;
  type: string;
  tmdb_id?: number;
  recommendation_reason?: string;
  recommendation_score?: number;
  source: 'ai' | 'tmdb-similar' | 'tmdb-discover';
}

const PLATFORM_DISPLAY: Record<
  string,
  { icon: string; color: string }
> = {
  Netflix: { icon: '📺', color: 'bg-red-700' },
  'Prime Video': { icon: '📦', color: 'bg-blue-600' },
  'Disney+': { icon: '✨', color: 'bg-blue-700' },
  'HBO Max': { icon: '🔷', color: 'bg-blue-500' },
  Max: { icon: '🔷', color: 'bg-blue-500' },
  Hulu: { icon: '🟢', color: 'bg-green-500' },
  'Apple TV+': { icon: '🍎', color: 'bg-gray-600' },
  Peacock: { icon: '🦚', color: 'bg-blue-600' },
  'Paramount+': { icon: '⛰️', color: 'bg-blue-600' },
  'MGM+': { icon: '🎬', color: 'bg-red-600' },
  Starz: { icon: '⭐', color: 'bg-purple-600' },
  Showtime: { icon: '📺', color: 'bg-yellow-600' },
};

// Simple in-memory caches so re-opening the same title is instant
const detailsCache = new Map<
  string,
  {
    details: MovieDetails;
    cast: CastMember[];
    crew: CrewMember[];
    videos: Video[];
    platforms: Platform[];
  }
>();

const aiReviewCache = new Map<
  string,
  {
    review: string;
    rating: number | null;
  }
>();

const aiRecsCache = new Map<string, RecommendationItem[]>();
const streamingCache = new Map<string, any[]>();

// Wraps a fetch with a timeout so a hung request doesn't spin forever
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 12000
) {
  const controller = new AbortController();

  const id = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    return res;
  } finally {
    clearTimeout(id);
  }
}

export default function MovieDetailsModal({
  isOpen,
  onClose,
  content,
  onRecommend,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  userId,
}: MovieDetailsModalProps) {
  const [loading, setLoading] = useState(false);

  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const [streamingLinks, setStreamingLinks] = useState<any[]>([]);
  const [loadingStreaming, setLoadingStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(
    null
  );

  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiRating, setAiRating] = useState<number | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReviewVisible, setAiReviewVisible] = useState(true);

  const [aiRecommendations, setAiRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'details' | 'cast' | 'trailers' | 'platforms'
  >('details');

  const [expandedDescription, setExpandedDescription] =
    useState(false);

  // Tracks which content id the in-flight requests belong to,
  // so stale responses get dropped.
  const requestIdRef = useRef<string | null>(null);

  const isStale = useCallback((id: string) => {
    return requestIdRef.current !== id;
  }, []);

  /*
   * ============================================================
   * TMDB DETAILS
   * ============================================================
   */
  const fetchFullMovieDetails = useCallback(
    async (movieId: string) => {
      const cached = detailsCache.get(movieId);

      if (cached) {
        setDetails(cached.details);
        setCast(cached.cast);
        setCrew(cached.crew);
        setVideos(cached.videos);
        setPlatforms(cached.platforms);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetchWithTimeout(
          `/api/tmdb/movie/${encodeURIComponent(movieId)}`,
          {},
          15000
        );

        if (isStale(movieId)) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('TMDB request failed:', response.status, errorData);

          // If fallback, use content data
          if (errorData.fallback && content) {
            const fallbackDetails: MovieDetails = {
              title: content.title,
              overview: content.description || '',
              tagline: '',
              release_date: content.year ? `${content.year}-01-01` : '',
              runtime: 0,
              genres: content.genre?.split(',').map((g, i) => ({ 
                id: i, 
                name: g.trim() 
              })) || [],
              production_companies: [],
              certification: 'NR',
            };
            setDetails(fallbackDetails);
            setLoading(false);
            return;
          }

          if (response.status === 404) {
            toast.error('Movie not found on TMDB.');
          } else if (response.status === 429) {
            toast.error('TMDB rate limit. Please try again.');
          } else {
            toast.error(`Failed to load movie details (${response.status})`);
          }
          setLoading(false);
          return;
        }

        const data: TMDBResponse = await response.json();

        if (isStale(movieId)) return;

        let newDetails: MovieDetails | null = null;
        let newCast: CastMember[] = [];
        let newCrew: CrewMember[] = [];
        let newVideos: Video[] = [];
        let newPlatforms: Platform[] = [];

        if (data.movie) {
          const movie = data.movie;
          newDetails = {
            title: movie.title || '',
            overview: movie.overview || '',
            tagline: movie.tagline || '',
            release_date: movie.release_date || '',
            runtime: movie.runtime || 0,
            genres: movie.genres || [],
            production_companies: movie.production_companies || [],
            certification: movie.release_dates?.results?.find(
              (r: any) => r.iso_3166_1 === 'US'
            )?.release_dates?.[0]?.certification || 'NR',
          };
        }

        if (data.credits) {
          const credits = data.credits;
          if (credits.cast) {
            newCast = credits.cast
              .slice(0, 20)
              .map((c: any) => ({
                id: c.id?.toString() || '',
                name: c.name || 'Unknown',
                character: c.character || 'Unknown',
                profile_path: c.profile_path || null,
              }));
          }
          if (credits.crew) {
            const keyRoles = [
              'Director', 'Writer', 'Producer', 'Cinematography',
              'Editor', 'Music', 'Production Design'
            ];
            newCrew = credits.crew
              .filter((c: any) => keyRoles.includes(c.job))
              .slice(0, 15)
              .map((c: any) => ({
                id: c.id?.toString() || '',
                name: c.name || 'Unknown',
                job: c.job || 'Unknown',
                profile_path: c.profile_path || null,
              }));
          }
        }

        if (data.videos) {
          const videoResults = data.videos.results || [];
          newVideos = videoResults
            .filter(
              (v: any) =>
                v.site === 'YouTube' &&
                (v.type === 'Trailer' || v.type === 'Teaser')
            )
            .slice(0, 3)
            .map((v: any) => ({
              key: v.key,
              name: v.name || 'Trailer',
              site: v.site,
              type: v.type,
              official: Boolean(v.official),
            }));
        }

        if (data.providers) {
          const results = data.providers.results;
          if (results?.US) {
            const us = results.US;
            const allProviders = [
              ...(us.flatrate || []),
              ...(us.rent || []),
              ...(us.buy || []),
            ];
            const unique = allProviders.reduce(
              (acc: Platform[], current: Platform) => {
                if (!acc.find((p) => p.provider_id === current.provider_id)) {
                  acc.push(current);
                }
                return acc;
              },
              []
            );
            newPlatforms = unique.slice(0, 10);
          }
        }

        if (newDetails) {
          detailsCache.set(movieId, {
            details: newDetails,
            cast: newCast,
            crew: newCrew,
            videos: newVideos,
            platforms: newPlatforms,
          });
        }

        if (isStale(movieId)) return;

        setDetails(newDetails);
        setCast(newCast);
        setCrew(newCrew);
        setVideos(newVideos);
        setPlatforms(newPlatforms);
      } catch (error: any) {
        console.error('Error fetching movie details:', error);
        if (!isStale(movieId)) {
          toast.error('Failed to load movie details.');
        }
      } finally {
        if (!isStale(movieId)) {
          setLoading(false);
        }
      }
    },
    [isStale, content]
  );

  /*
   * ============================================================
   * AI REVIEW - Hide on error
   * ============================================================
   */
  const generateAIReview = useCallback(
    async (movieId: string) => {
      if (!content) return;

      const cached = aiReviewCache.get(movieId);
      if (cached) {
        setAiReview(cached.review);
        setAiRating(cached.rating);
        setAiReviewVisible(true);
        return;
      }

      setLoadingAI(true);
      setAiError(null);
      setAiReviewVisible(true);

      try {
        const response = await fetchWithTimeout(
          '/api/ai/review',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: content.title,
              description: content.long_description || content.description,
              year: content.year,
              genre: content.genre,
              rating: content.rating,
            }),
          },
          20000
        );

        if (isStale(movieId)) return;

        if (!response.ok) {
          console.warn('AI review failed with status:', response.status);
          setAiReviewVisible(false);
          setLoadingAI(false);
          return;
        }

        const data = await response.json();

        if (data.fallback || !data.review) {
          setAiReviewVisible(false);
          setLoadingAI(false);
          return;
        }

        aiReviewCache.set(movieId, {
          review: data.review,
          rating: data.rating ?? null,
        });

        setAiReview(data.review);
        setAiRating(data.rating ?? null);
        setAiReviewVisible(true);
        
      } catch (error: any) {
        console.warn('AI review error:', error.message);
        setAiReviewVisible(false);
      } finally {
        if (!isStale(movieId)) {
          setLoadingAI(false);
        }
      }
    },
    [content, isStale]
  );

  /*
   * ============================================================
   * AI RECOMMENDATIONS - Use personalized API first, then TMDB similar, then genre discovery
   * ============================================================
   */
  const fetchAIRecommendations = useCallback(
    async (movieId: string) => {
      if (!content) return;

      const cached = aiRecsCache.get(movieId);
      if (cached) {
        setAiRecommendations(cached);
        return;
      }

      setLoadingRecs(true);

      try {
        let recommendations: RecommendationItem[] = [];

        // 1. Try personalized recommendations first (like AIRecommendations.tsx)
        const aiResponse = await fetchWithTimeout(
          '/api/recommendations',
          {
            headers: {
              'x-user-id': userId,
            },
          },
          20000
        );

        if (isStale(movieId)) return;

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();

          if (aiData.success && Array.isArray(aiData.recommendations)) {
            recommendations = aiData.recommendations
              .filter((rec: any) => {
                const recommendedItem = rec.content;
                return (
                  recommendedItem &&
                  recommendedItem.id !== content.id
                );
              })
              .slice(0, 6)
              .map((rec: any) => ({
                ...rec.content,
                recommendation_reason: rec.reason,
                recommendation_score: rec.score,
                source: 'ai' as const,
              }));
          }
        }

        // 2. If personalized recommendations fail, use TMDB similar movies
        if (recommendations.length === 0) {
          console.log('⚠️ AI recommendations failed, using TMDB similar fallback...');

          const tmdbResponse = await fetchWithTimeout(
            `/api/tmdb/similar/${encodeURIComponent(movieId)}`,
            {},
            15000
          );

          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();

            recommendations = (tmdbData.results || [])
              .filter((movie: any) => String(movie.id) !== String(movieId))
              .slice(0, 6)
              .map((movie: any) => ({
                id: String(movie.id),
                title: movie.title,
                image_url: movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : null,
                backdrop_url: movie.backdrop_path
                  ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                  : null,
                description: movie.overview || '',
                longdescription: movie.overview || '',
                year: movie.release_date
                  ? Number(movie.release_date.slice(0, 4))
                  : null,
                rating: movie.vote_average || null,
                rating_count: movie.vote_count || 0,
                genre: '',
                type: 'movie',
                tmdb_id: movie.id,
                recommendation_reason: 'Similar to this title',
                source: 'tmdb-similar' as const,
              }));
          }
        }

        // 3. Final fallback: genre-based discovery
        if (recommendations.length === 0) {
          const genre = content.genre
            ?.split(',')
            .map((value) => value.trim())
            .filter(Boolean)[0];

          const genreMap: Record<string, number> = {
            Action: 28,
            Adventure: 12,
            Animation: 16,
            Comedy: 35,
            Crime: 80,
            Drama: 18,
            Family: 10751,
            Fantasy: 14,
            Horror: 27,
            Romance: 10749,
            'Science Fiction': 878,
            'Sci-Fi': 878,
            Thriller: 53,
          };

          const genreId = genre ? genreMap[genre] : undefined;

          const query = genreId
            ? `/api/tmdb/discover?genreId=${genreId}`
            : '/api/tmdb/popular';

          const fallbackResponse = await fetchWithTimeout(
            query,
            {},
            15000
          );

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();

            recommendations = (fallbackData.results || [])
              .filter((movie: any) => String(movie.id) !== String(movieId))
              .slice(0, 6)
              .map((movie: any) => ({
                id: String(movie.id),
                title: movie.title,
                image_url: movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : null,
                backdrop_url: movie.backdrop_path
                  ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                  : null,
                description: movie.overview || '',
                longdescription: movie.overview || '',
                year: movie.release_date
                  ? Number(movie.release_date.slice(0, 4))
                  : null,
                rating: movie.vote_average || null,
                rating_count: movie.vote_count || 0,
                genre: genre || '',
                type: 'movie',
                tmdb_id: movie.id,
                recommendation_reason: genre
                  ? `Popular ${genre} title`
                  : 'Popular title',
                source: 'tmdb-discover' as const,
              }));
          }
        }

        aiRecsCache.set(movieId, recommendations);
        setAiRecommendations(recommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setAiRecommendations([]);
      } finally {
        if (!isStale(movieId)) {
          setLoadingRecs(false);
        }
      }
    },
    [content, userId, isStale]
  );

  /*
   * ============================================================
   * STREAMING LINKS
   * ============================================================
   */
  const fetchStreamingLinks = useCallback(
    async (movieId: string) => {
      const cached = streamingCache.get(movieId);

      if (cached) {
        setStreamingLinks(cached);
        return;
      }

      setLoadingStreaming(true);
      setStreamingError(null);

      try {
        const response = await fetchWithTimeout(
          `/api/streaming/${encodeURIComponent(movieId)}`,
          {},
          15000
        );

        if (isStale(movieId)) return;

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          console.error('Streaming links request failed:', response.status, body);
          setStreamingError(`Streaming lookup failed (${response.status})`);
          return;
        }

        const data = await response.json();

        if (data.success && data.links?.length > 0) {
          streamingCache.set(movieId, data.links);
          setStreamingLinks(data.links);
        } else if (!data.success) {
          setStreamingError(data.error || 'Streaming lookup returned an error');
        }
      } catch (error: any) {
        console.error('Error fetching streaming links:', error);
        if (!isStale(movieId)) {
          setStreamingError(error?.name === 'AbortError' ? 'Streaming lookup timed out' : 'Streaming lookup failed');
        }
      } finally {
        if (!isStale(movieId)) {
          setLoadingStreaming(false);
        }
      }
    },
    [isStale]
  );

  /*
   * ============================================================
   * LOAD EVERYTHING WHEN MOVIE CHANGES
   * ============================================================
   */
  useEffect(() => {
    if (!content || !isOpen) return;

    const id = content.id;

    requestIdRef.current = id;

    // Reset UI state for new title
    setDetails(null);
    setCast([]);
    setCrew([]);
    setVideos([]);
    setPlatforms([]);

    setStreamingLinks([]);
    setStreamingError(null);

    setAiReview(null);
    setAiRating(null);
    setAiError(null);
    setAiReviewVisible(true);

    setAiRecommendations([]);

    setActiveTab('details');
    setExpandedDescription(false);

    fetchFullMovieDetails(id);
    generateAIReview(id);
    fetchAIRecommendations(id);
    fetchStreamingLinks(id);
  }, [
    content?.id,
    isOpen,
    fetchFullMovieDetails,
    generateAIReview,
    fetchAIRecommendations,
    fetchStreamingLinks,
  ]);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */
  const handleCastClick = (actorName: string) => {
    onClose();
    window.location.href = `/actor/${encodeURIComponent(actorName)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen || !content) return null;

  const isLiked = isInWatchlist(content.id);
  const hasTrailer = videos.length > 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2 bg-black/70 hover:bg-black/90 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* HERO */}
        <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-800">
          <img
            src={content.backdrop_url || content.image_url}
            alt={content.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = content.image_url || '';
            }}
          />

          {hasTrailer && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                onClick={() => {
                  const trailerKey = videos[0].key;
                  const iframe = document.getElementById('trailer-iframe') as HTMLIFrameElement;
                  if (iframe) {
                    iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&rel=0`;
                  }
                }}
                className="w-20 h-20 rounded-full bg-teal-500/80 hover:bg-teal-500 transition flex items-center justify-center group"
              >
                <Play className="w-10 h-10 text-white fill-white ml-1 group-hover:scale-110 transition" />
              </button>

              <div className="absolute bottom-4 left-4 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
                ▶️ Watch Trailer
              </div>
            </div>
          )}

          {hasTrailer && (
            <iframe
              id="trailer-iframe"
              src={`https://www.youtube.com/embed/${videos[0].key}?autoplay=0&mute=1&rel=0&modestbranding=1`}
              className="hidden"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-wrap items-start gap-4">
              <img
                src={content.image_url}
                alt={content.title}
                className="w-24 h-36 object-cover rounded-lg shadow-lg hidden md:block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(
                    content.title
                  )}`;
                }}
              />

              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {content.title}
                </h2>

                {details?.tagline && (
                  <p className="text-gray-300 text-sm italic mt-1">
                    "{details.tagline}"
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-300">
                  {details?.release_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(details.release_date)}
                    </span>
                  )}

                  {details?.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {details.runtime} min
                    </span>
                  )}

                  {details?.certification &&
                    details.certification !== 'NR' && (
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                        {details.certification}
                      </span>
                    )}

                  {content.genre && (
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      {content.genre.split(',').slice(0, 3).join(', ')}
                    </span>
                  )}

                  {loading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-bold">
                      {content.rating?.toFixed(1) || 'N/A'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({content.rating_count || 0} ratings)
                    </span>
                  </div>

                  {aiReviewVisible && aiRating && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <span className="text-teal-400 font-bold">
                        {aiRating.toFixed(1)}
                      </span>
                      <span className="text-gray-400 text-xs">AI</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-gray-800 px-6 pt-2">
          <div className="flex gap-4 overflow-x-auto">
            {['details', 'cast', 'trailers', 'platforms'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-2 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'details' && 'Details'}
                {tab === 'cast' && 'Cast & Crew'}
                {tab === 'trailers' && 'Trailers'}
                {tab === 'platforms' && 'Where to Watch'}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {aiReviewVisible && (
                <div className="p-4 bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-xl border border-teal-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-500" />
                      <h3 className="font-semibold text-white">
                        BADMOUTH AI Review
                      </h3>
                      <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
                        Powered by Gemini
                      </span>
                    </div>
                    {loadingAI && (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                    )}
                  </div>

                  {loadingAI ? (
                    <p className="text-gray-400 text-sm">
                      Generating AI review...
                    </p>
                  ) : aiReview ? (
                    <>
                      {aiRating && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-teal-400" />
                            <span className="text-lg font-bold text-teal-400">
                              {aiRating.toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-sm">
                              /10
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            • BADMOUTH AI Rating
                          </span>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {aiReview}
                      </p>
                    </>
                  ) : null}
                </div>
              )}

              {/* DESCRIPTION */}
              <div>
                <p
                  className={`text-gray-300 text-sm leading-relaxed ${
                    !expandedDescription ? 'line-clamp-4' : ''
                  }`}
                >
                  {details?.overview || content.long_description || content.description}
                </p>

                <button
                  onClick={() => setExpandedDescription(!expandedDescription)}
                  className="text-teal-400 text-sm hover:text-teal-300 transition mt-1"
                >
                  {expandedDescription ? 'Show less' : 'Read more'}
                </button>
              </div>

              {/* MOVIE INFO */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-800/50 rounded-lg">
                {details?.release_date && (
                  <div>
                    <p className="text-xs text-gray-400">Release Date</p>
                    <p className="text-sm text-white">{formatDate(details.release_date)}</p>
                  </div>
                )}

                {details?.runtime && (
                  <div>
                    <p className="text-xs text-gray-400">Runtime</p>
                    <p className="text-sm text-white">{details.runtime} minutes</p>
                  </div>
                )}

                {details?.genres && details.genres.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Genres</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {details.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {details?.production_companies &&
                  details.production_companies.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">Production</p>
                      <p className="text-sm text-white">
                        {details.production_companies
                          .slice(0, 3)
                          .map((c) => c.name)
                          .join(', ')}
                      </p>
                    </div>
                  )}
              </div>

              {/* ACTIONS */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onRecommend(content);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 text-sm"
                >
                  <Star size={16} className="fill-white" />
                  Rate This
                </button>

                <button
                  onClick={async () => {
                    if (isLiked) {
                      await onRemoveFromWatchlist(content.id);
                    } else {
                      await onAddToWatchlist(content);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
                    isLiked
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <Heart size={16} className={isLiked ? 'fill-white' : ''} />
                  {isLiked ? 'Saved' : 'Save'}
                </button>

                <button
                  onClick={() => {
                    navigator.share
                      ?.({
                        title: content.title,
                        text: `Check out ${content.title} on BADMOUTH!`,
                        url: window.location.href,
                      })
                      .catch(() =>
                        navigator.clipboard.writeText(window.location.href)
                      );
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              {/* AI RECOMMENDATIONS - Always shows something */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-teal-500" />
                  <h3 className="text-sm font-semibold text-white">
                    You might also like
                  </h3>
                  <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
                    {loadingRecs ? 'Loading...' : aiRecommendations.some(r => r.source === 'ai') ? 'AI Powered' : 'TMDB'}
                  </span>
                  {loadingRecs && (
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500 ml-2" />
                  )}
                </div>

                {loadingRecs ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                  </div>
                ) : aiRecommendations.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {aiRecommendations.slice(0, 6).map((movie) => (
                      <button
                        key={`${movie.source}-${movie.id}`}
                        type="button"
                        className="group cursor-pointer text-left"
                        onClick={() => {
                          onClose();
                          window.location.href = `/?details=${movie.id}`;
                        }}
                      >
                        <img
                          src={movie.image_url || ''}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover rounded-lg group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(
                                movie.title
                              )}`;
                          }}
                        />
                        <p className="text-xs text-gray-400 mt-1 truncate group-hover:text-white transition">
                          {movie.title}
                        </p>
                        {movie.year && (
                          <p className="text-[10px] text-gray-500">
                            {movie.year}
                          </p>
                        )}
                        {movie.rating != null && (
                          <p className="text-[10px] text-yellow-400">
                            ⭐ {Number(movie.rating).toFixed(1)}
                          </p>
                        )}
                        {movie.source === 'ai' && (
                          <p className="text-[10px] text-teal-400 mt-1">
                            For you
                          </p>
                        )}
                        {movie.source !== 'ai' && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Similar title
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No similar recommendations available.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CAST */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : cast.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cast.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => handleCastClick(actor.name)}
                      className="flex items-center gap-3 p-2 bg-gray-800 hover:bg-teal-600/20 rounded-lg transition group"
                    >
                      {actor.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                          alt={actor.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-400">
                          {actor.name.charAt(0)}
                        </div>
                      )}

                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-teal-400 transition truncate">
                          {actor.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {actor.character}
                        </p>
                      </div>

                      <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-teal-400 rotate-[-90deg]" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Cast information not available.</p>
              )}

              {crew.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Crew</h4>
                  <div className="flex flex-wrap gap-2">
                    {crew.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleCastClick(person.name)}
                        className="px-3 py-1 bg-gray-800 hover:bg-teal-600/20 rounded-lg transition group"
                      >
                        <span className="text-xs text-white group-hover:text-teal-400 transition">
                          {person.name}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({person.job})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRAILERS */}
          {activeTab === 'trailers' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="relative aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${video.key}?rel=0&modestbranding=1`}
                          title={video.name}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-white font-medium">{video.name}</p>
                        <p className="text-xs text-gray-400">
                          {video.type} • {video.official ? 'Official' : 'Fan-made'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clapperboard className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No trailers available for this movie.</p>
                </div>
              )}
            </div>
          )}

          {/* PLATFORMS */}
          {activeTab === 'platforms' && (
            <div className="space-y-4">
              {loadingStreaming ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-gray-400 mt-2 text-sm">
                    Loading streaming options...
                  </p>
                </div>
              ) : streamingLinks.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Watch {content.title} on:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {streamingLinks.map((link, idx) => {
                      const getProviderIcon = (name: string) => {
                        const icons: Record<string, string> = {
                          Netflix: '📺',
                          'Prime Video': '📦',
                          'Disney+': '✨',
                          'HBO Max': '🔷',
                          Max: '🔷',
                          Hulu: '🟢',
                          'Apple TV+': '🍎',
                          Peacock: '🦚',
                          'Paramount+': '⛰️',
                          'MGM+': '🎬',
                          Starz: '⭐',
                          Showtime: '📺',
                          iTunes: '🍏',
                          'Google Play': '▶️',
                          Vudu: '🎥',
                          YouTube: '▶️',
                        };
                        return icons[name] || '🎬';
                      };

                      const getTypeLabel = (type: string) => {
                        const labels: Record<string, string> = {
                          flatrate: '📺 Streaming',
                          sub: '📺 Streaming',
                          rent: '💰 Rent',
                          buy: '💵 Buy',
                          free: '🆓 Free',
                        };
                        return labels[type] || type;
                      };

                      return (
                        <a
                          key={idx}
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition group"
                        >
                          <span className="text-2xl">{getProviderIcon(link.provider)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white group-hover:text-teal-400 transition truncate">
                              {link.provider}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {getTypeLabel(link.type)}
                              {link.quality && ` • ${link.quality}`}
                              {link.price && ` • $${link.price}`}
                            </p>
                          </div>
                          <ExternalLink size={14} className="text-gray-500 group-hover:text-teal-400 flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Direct links to streaming services • Powered by Watchmode
                  </p>
                </div>
              ) : platforms.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Available on (via TMDB):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {platforms.map((platform) => {
                      const display = PLATFORM_DISPLAY[platform.provider_name] || {
                        icon: '🎬',
                        color: 'bg-gray-600',
                      };
                      return (
                        <button
                          key={platform.provider_id}
                          onClick={() =>
                            window.open(
                              `https://www.themoviedb.org/movie/${content.id}/watch`,
                              '_blank'
                            )
                          }
                          className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition group text-left"
                        >
                          {platform.logo_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${platform.logo_path}`}
                              alt={platform.provider_name}
                              className="w-8 h-8 rounded object-contain"
                            />
                          ) : (
                            <span className="text-2xl">{display.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white group-hover:text-teal-400 transition truncate">
                              {platform.provider_name}
                            </p>
                            <p className="text-[10px] text-gray-400">Check TMDB</p>
                          </div>
                          <ExternalLink size={14} className="text-gray-500 group-hover:text-teal-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Streaming links not available • Check TMDB for availability
                  </p>
                </div>
              ) : streamingError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-400">{streamingError}</p>
                  <button
                    onClick={() => fetchStreamingLinks(content.id)}
                    className="mt-3 text-teal-400 text-sm hover:text-teal-300 flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No streaming information available.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Check your local streaming services.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 pb-4 pt-2 border-t border-gray-800 flex justify-between items-center">
          <p className="text-[10px] text-gray-500">
            Data provided by TMDB • BADMOUTH AI Review by Gemini • Streaming by Watchmode
          </p>
          <button
            onClick={() => window.open(`https://www.themoviedb.org/movie/${content.id}`, '_blank')}
            className="text-[10px] text-gray-500 hover:text-teal-400 transition"
          >
            View on TMDB →
          </button>
        </div>
      </div>
    </div>
  );
}
