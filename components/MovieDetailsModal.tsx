// components/MovieDetailsModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Star, Heart, Play, Users, Calendar, Clock, Film, 
  ExternalLink, Sparkles, Loader2, Share2,
  Globe, Tag, ChevronDown, Clapperboard
} from 'lucide-react';
import { ContentItem } from '@/types/content';
import { supabase } from '@/lib/supabase/client';
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
  link?: string;
}

interface MovieDetails {
  title: string;
  overview: string;
  tagline: string;
  release_date: string;
  runtime: number;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string }[];
  certification?: string;
}

// Platform mapping to direct URLs
const PLATFORM_URLS: Record<string, string> = {
  'Netflix': 'https://www.netflix.com/search?q=',
  'Prime Video': 'https://www.amazon.com/s?k=',
  'Disney+': 'https://www.disneyplus.com/search/',
  'HBO Max': 'https://www.max.com/search?q=',
  'Max': 'https://www.max.com/search?q=',
  'Hulu': 'https://www.hulu.com/search?q=',
  'Apple TV+': 'https://tv.apple.com/search/',
  'Peacock': 'https://www.peacocktv.com/search?q=',
  'Paramount+': 'https://www.paramountplus.com/search/',
  'MGM+': 'https://www.mgmplus.com/search?q=',
  'Starz': 'https://www.starz.com/search?q=',
  'Showtime': 'https://www.sho.com/search?q=',
};

// Platform display names with icons
const PLATFORM_DISPLAY: Record<string, { icon: string; color: string }> = {
  'Netflix': { icon: '📺', color: 'bg-red-700' },
  'Prime Video': { icon: '📦', color: 'bg-blue-600' },
  'Disney+': { icon: '✨', color: 'bg-blue-700' },
  'HBO Max': { icon: '🔷', color: 'bg-blue-500' },
  'Max': { icon: '🔷', color: 'bg-blue-500' },
  'Hulu': { icon: '🟢', color: 'bg-green-500' },
  'Apple TV+': { icon: '🍎', color: 'bg-gray-600' },
  'Peacock': { icon: '🦚', color: 'bg-blue-600' },
  'Paramount+': { icon: '⛰️', color: 'bg-blue-600' },
  'MGM+': { icon: '🎬', color: 'bg-red-600' },
  'Starz': { icon: '⭐', color: 'bg-purple-600' },
  'Showtime': { icon: '📺', color: 'bg-yellow-600' },
};

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
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'cast' | 'trailers' | 'platforms'>('details');
  const [expandedDescription, setExpandedDescription] = useState(false);
  
  const videoRef = useRef<HTMLIFrameElement>(null);

  // Fetch all movie details when content changes
  useEffect(() => {
    if (content && isOpen) {
      fetchFullMovieDetails();
      fetchAIRecommendations();
    }
  }, [content, isOpen]);

  const fetchFullMovieDetails = async () => {
    if (!content) return;
    setLoading(true);

    try {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
      
      // Fetch all data in parallel
      const [movieRes, creditsRes, videosRes, providersRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${content.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=release_dates`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/credits?api_key=${TMDB_API_KEY}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/watch/providers?api_key=${TMDB_API_KEY}`),
      ]);

      // Process movie details
      if (movieRes.ok) {
        const data = await movieRes.json();
        setDetails({
          title: data.title,
          overview: data.overview,
          tagline: data.tagline,
          release_date: data.release_date,
          runtime: data.runtime,
          genres: data.genres || [],
          production_companies: data.production_companies || [],
          certification: data.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification || 'NR',
        });
      }

      // Process credits
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        if (data.cast) {
          setCast(data.cast.slice(0, 20).map((c: any) => ({
            id: c.id.toString(),
            name: c.name,
            character: c.character || 'Unknown',
            profile_path: c.profile_path,
          })));
        }
        if (data.crew) {
          const keyRoles = ['Director', 'Writer', 'Producer', 'Cinematography', 'Editor', 'Music', 'Production Design'];
          setCrew(data.crew
            .filter((c: any) => keyRoles.includes(c.job))
            .slice(0, 15)
            .map((c: any) => ({
              id: c.id.toString(),
              name: c.name,
              job: c.job,
              profile_path: c.profile_path,
            }))
          );
        }
      }

      // Process videos (trailers)
      if (videosRes.ok) {
        const data = await videosRes.json();
        const trailers = data.results
          .filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
          .slice(0, 3);
        setVideos(trailers);
      }

      // Process platforms with direct links
      if (providersRes.ok) {
        const data = await providersRes.json();
        if (data.results?.US) {
          const us = data.results.US;
          const allProviders = [
            ...(us.flatrate || []),
            ...(us.rent || []),
            ...(us.buy || []),
          ];
          const unique = allProviders.reduce((acc: any[], current) => {
            if (!acc.find((p: any) => p.provider_id === current.provider_id)) {
              acc.push(current);
            }
            return acc;
          }, []);
          
          // Add direct links to platforms
          const platformsWithLinks = unique.slice(0, 10).map((p: any) => {
            const baseUrl = PLATFORM_URLS[p.provider_name] || 'https://www.themoviedb.org/search?q=';
            return {
              ...p,
              link: `${baseUrl}${encodeURIComponent(content.title)}`,
            };
          });
          setPlatforms(platformsWithLinks);
        }
      }

    } catch (error) {
      console.error('Error fetching movie details:', error);
      toast.error('Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRecommendations = async () => {
    if (!content) return;
    setLoadingAI(true);

    try {
      // Get AI recommendations for similar movies
      const response = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          genre: content.genre,
          year: content.year,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recommendations) {
          setAiRecommendations(data.recommendations);
        }
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCastClick = (actorName: string) => {
    onClose();
    window.location.href = `/actor/${encodeURIComponent(actorName)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handlePlatformClick = (platform: Platform) => {
    if (platform.link) {
      window.open(platform.link, '_blank');
    } else {
      // Fallback to TMDB watch page
      window.open(`https://www.themoviedb.org/movie/${content?.id}/watch`, '_blank');
    }
  };

  if (!isOpen || !content) return null;

  const isLiked = isInWatchlist(content.id);
  const hasTrailer = videos.length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-40 p-2 bg-black/70 hover:bg-black/90 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
            {/* Hero Section with Backdrop and Trailer */}
            <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-800">
              {/* Backdrop Image */}
              <img
                src={content.backdrop_url || content.image_url}
                alt={content.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = content.image_url || '';
                }}
              />

              {/* Trailer Overlay */}
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

              {/* Hidden Trailer Iframe */}
              {hasTrailer && (
                <iframe
                  id="trailer-iframe"
                  src={`https://www.youtube.com/embed/${videos[0].key}?autoplay=0&mute=1&rel=0&modestbranding=1`}
                  className="hidden"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
              
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Poster */}
                  <img
                    src={content.image_url}
                    alt={content.title}
                    className="w-24 h-36 object-cover rounded-lg shadow-lg hidden md:block"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(content.title)}`;
                    }}
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">{content.title}</h2>
                    {details?.tagline && (
                      <p className="text-gray-300 text-sm italic mt-1">"{details.tagline}"</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-300">
                      {details?.release_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {formatDate(details.release_date)}
                        </span>
                      )}
                      {details?.runtime && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {details.runtime} min
                        </span>
                      )}
                      {details?.certification && details.certification !== 'NR' && (
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">{details.certification}</span>
                      )}
                      {content.genre && (
                        <span className="flex items-center gap-1">
                          <Tag size={14} /> {content.genre.split(',').slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-bold">{content.rating?.toFixed(1) || 'N/A'}</span>
                        <span className="text-gray-400 text-xs">({content.rating_count || 0} ratings)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
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

            {/* Content Area */}
            <div className="p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <p className={`text-gray-300 text-sm leading-relaxed ${!expandedDescription ? 'line-clamp-4' : ''}`}>
                      {details?.overview || content.long_description || content.description}
                    </p>
                    <button
                      onClick={() => setExpandedDescription(!expandedDescription)}
                      className="text-teal-400 text-sm hover:text-teal-300 transition mt-1"
                    >
                      {expandedDescription ? 'Show less' : 'Read more'}
                    </button>
                  </div>

                  {/* Additional Details */}
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
                            <span key={genre.id} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                              {genre.name}
                            </span>
                          ))}
                          </div>
                      </div>
                    )}
                    {details?.production_companies && details.production_companies.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Production</p>
                        <p className="text-sm text-white">
                          {details.production_companies.slice(0, 3).map(c => c.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onRecommend(content);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 text-sm"
                    >
                      <Star size={16} className="fill-white" /> Rate This
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
                        isLiked ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      <Heart size={16} className={isLiked ? 'fill-white' : ''} />
                      {isLiked ? 'Saved' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        navigator.share?.({ title: content.title, text: `Check out ${content.title} on BADMOUTH!`, url: window.location.href })
                          .catch(() => navigator.clipboard.writeText(window.location.href));
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center gap-2 text-sm"
                    >
                      <Share2 size={16} /> Share
                    </button>
                  </div>

                  {/* ✅ AI Recommendations Section */}
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-teal-500" />
                      <h3 className="text-sm font-semibold text-white">You might also like</h3>
                      <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">AI Powered</span>
                      {loadingAI && <Loader2 className="w-4 h-4 animate-spin text-teal-500 ml-2" />}
                    </div>
                    
                    {loadingAI ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                      </div>
                    ) : aiRecommendations.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {aiRecommendations.slice(0, 6).map((movie: any) => (
                          <div
                            key={movie.id}
                            className="group cursor-pointer"
                            onClick={() => {
                              onClose();
                              // Navigate to movie details
                              window.location.href = `/?details=${movie.id}`;
                            }}
                          >
                            <img
                              src={movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : ''}
                              alt={movie.title}
                              className="w-full aspect-[2/3] object-cover rounded-lg group-hover:scale-105 transition"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(movie.title)}`;
                              }}
                            />
                            <p className="text-xs text-gray-400 mt-1 truncate group-hover:text-white transition">
                              {movie.title}
                            </p>
                            {movie.release_date && (
                              <p className="text-[10px] text-gray-500">
                                {new Date(movie.release_date).getFullYear()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No similar recommendations available.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cast Tab */}
              {activeTab === 'cast' && (
                <div className="space-y-4">
                  {cast.length > 0 ? (
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
                            <p className="text-xs text-gray-400 truncate">{actor.character}</p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-teal-400 rotate-[-90deg]" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Cast information not available.</p>
                  )}

                  {/* Crew */}
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
                            <span className="text-[10px] text-gray-400 ml-1">({person.job})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trailers Tab */}
              {activeTab === 'trailers' && (
                <div className="space-y-4">
                  {videos.length > 0 ? (
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
                            <p className="text-xs text-gray-400">{video.type} • {video.official ? 'Official' : 'Fan-made'}</p>
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

              {/* Platforms Tab */}
              {activeTab === 'platforms' && (
                <div className="space-y-4">
                  {platforms.length > 0 ? (
                    <div>
                      <p className="text-sm text-gray-400 mb-3">Where to watch {content.title}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {platforms.map((platform) => {
                          const display = PLATFORM_DISPLAY[platform.provider_name] || { icon: '🎬', color: 'bg-gray-600' };
                          return (
                            <button
                              key={platform.provider_id}
                              onClick={() => handlePlatformClick(platform)}
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
                                <p className="text-[10px] text-gray-400">
                                  {platform.link ? 'Click to watch' : 'Check availability'}
                                </p>
                              </div>
                              <ExternalLink size={14} className="text-gray-500 group-hover:text-teal-400 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">Platform information not available.</p>
                      <p className="text-xs text-gray-500 mt-1">Check your local streaming services.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TMDB Attribution */}
            <div className="px-6 pb-4 pt-2 border-t border-gray-800 flex justify-between items-center">
              <p className="text-[10px] text-gray-500">
                Data provided by TMDB • AI Recommendations by Gemini
              </p>
              <button
                onClick={() => {
                  window.open(`https://www.themoviedb.org/movie/${content.id}`, '_blank');
                }}
                className="text-[10px] text-gray-500 hover:text-teal-400 transition"
              >
                View on TMDB →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
