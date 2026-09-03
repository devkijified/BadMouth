// components/MovieDetailsModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Star, Heart, Play, Users, Calendar, Clock, Film, 
  ExternalLink, Sparkles, Loader2, ThumbsUp, ThumbsDown,
  Share2, Bookmark, Volume2, VolumeX, Maximize2, ChevronDown,
  Award, Globe, Clock as ClockIcon, Tag, User, Clapperboard,
  Info, Download, Eye
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
  popularity: number;
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
  budget: number;
  revenue: number;
  status: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string }[];
  keywords: { id: number; name: string }[];
  certification?: string;
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
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiRating, setAiRating] = useState<number | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'cast' | 'trailers' | 'platforms'>('details');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  
  const videoRef = useRef<HTMLIFrameElement>(null);

  // Fetch all movie details when content changes
  useEffect(() => {
    if (content && isOpen) {
      fetchFullMovieDetails();
      generateAIReview();
    }
  }, [content, isOpen]);

  const fetchFullMovieDetails = async () => {
    if (!content) return;
    setLoading(true);

    try {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
      
      // Fetch all data in parallel
      const [movieRes, creditsRes, videosRes, providersRes, similarRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${content.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=release_dates`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/credits?api_key=${TMDB_API_KEY}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/watch/providers?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${content.id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
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
          budget: data.budget,
          revenue: data.revenue,
          status: data.status,
          vote_average: data.vote_average,
          vote_count: data.vote_count,
          popularity: data.popularity,
          genres: data.genres || [],
          production_companies: data.production_companies || [],
          production_countries: data.production_countries || [],
          spoken_languages: data.spoken_languages || [],
          keywords: data.keywords?.keywords || [],
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
            popularity: c.popularity,
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

      // Process platforms
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
          setPlatforms(unique.slice(0, 10));
        }
      }

      // Process similar movies
      if (similarRes.ok) {
        const data = await similarRes.json();
        setSimilarMovies(data.results?.slice(0, 6) || []);
      }

    } catch (error) {
      console.error('Error fetching movie details:', error);
      toast.error('Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const generateAIReview = async () => {
    if (!content) return;
    setLoadingAI(true);

    try {
      const response = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          description: content.description,
          year: content.year,
          genre: content.genre,
          rating: content.rating,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.review) setAiReview(data.review);
        if (data.rating) setAiRating(data.rating);
      }
    } catch (error) {
      console.error('Error generating AI review:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCastClick = (actorName: string) => {
    onClose();
    window.location.href = `/actor/${encodeURIComponent(actorName)}`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
                        <span className="text-white font-bold">{details?.vote_average?.toFixed(1) || content.rating?.toFixed(1) || 'N/A'}</span>
                        <span className="text-gray-400 text-xs">({details?.vote_count?.toLocaleString() || content.rating_count || 0} ratings)</span>
                      </div>
                      {aiRating && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-teal-400" />
                          <span className="text-teal-400 font-bold">{aiRating.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs">AI</span>
                        </div>
                      )}
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
                    className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
                      activeTab === tab
                        ? 'border-teal-500 text-teal-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* AI Review */}
                  <div className="p-4 bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-xl border border-teal-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-teal-500" />
                        <h3 className="font-semibold text-white">BADMOUTH AI Review</h3>
                        <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">Powered by Gemini</span>
                      </div>
                      {loadingAI && <Loader2 className="w-4 h-4 animate-spin text-teal-500" />}
                    </div>
                    {loadingAI ? (
                      <p className="text-gray-400 text-sm">Generating AI review...</p>
                    ) : aiReview ? (
                      <>
                        {aiRating && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-4 h-4 text-teal-400" />
                              <span className="text-lg font-bold text-teal-400">{aiRating.toFixed(1)}</span>
                              <span className="text-gray-400 text-sm">/10</span>
                            </div>
                            <span className="text-xs text-gray-500">• BADMOUTH AI Rating</span>
                          </div>
                        )}
                        <p className="text-gray-300 text-sm leading-relaxed">{aiReview}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm">AI review not available for this title.</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Overview</h4>
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

                  {/* Movie Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl">{details?.status || 'Released'}</p>
                      <p className="text-xs text-gray-400">Status</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl">{details?.popularity?.toFixed(0) || 'N/A'}</p>
                      <p className="text-xs text-gray-400">Popularity</p>
                    </div>
                    {details?.budget && details.budget > 0 && (
                      <div className="text-center">
                        <p className="text-2xl">{formatCurrency(details.budget)}</p>
                        <p className="text-xs text-gray-400">Budget</p>
                      </div>
                    )}
                    {details?.revenue && details.revenue > 0 && (
                      <div className="text-center">
                        <p className="text-2xl">{formatCurrency(details.revenue)}</p>
                        <p className="text-xs text-gray-400">Revenue</p>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {details?.production_countries && details.production_countries.length > 0 && (
                      <div>
                        <span className="text-gray-400">Country:</span>{' '}
                        <span className="text-gray-300">{details.production_countries.map(c => c.name).join(', ')}</span>
                      </div>
                    )}
                    {details?.spoken_languages && details.spoken_languages.length > 0 && (
                      <div>
                        <span className="text-gray-400">Language:</span>{' '}
                        <span className="text-gray-300">{details.spoken_languages.map(l => l.name).join(', ')}</span>
                      </div>
                    )}
                    {details?.keywords && details.keywords.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Keywords:</span>{' '}
                        <span className="text-gray-300">{details.keywords.slice(0, 10).map(k => k.name).join(', ')}</span>
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
                        {platforms.map((platform) => (
                          <a
                            key={platform.provider_id}
                            href={`https://www.themoviedb.org/movie/${content.id}/watch`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition group"
                          >
                            <img
                              src={`https://image.tmdb.org/t/p/w92${platform.logo_path}`}
                              alt={platform.provider_name}
                              className="w-8 h-8 rounded object-contain"
                            />
                            <span className="text-sm text-white group-hover:text-teal-400 transition flex-1">
                              {platform.provider_name}
                            </span>
                            <ExternalLink size={14} className="text-gray-500 group-hover:text-teal-400" />
                          </a>
                        ))}
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

            {/* Similar Movies */}
            {similarMovies.length > 0 && (
              <div className="px-6 pb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">You might also like</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {similarMovies.map((movie: any) => (
                    <div
                      key={movie.id}
                      className="group cursor-pointer"
                      onClick={() => {
                        onClose();
                        // You'd need to load this movie's details
                        // window.location.href = `/?details=${movie.id}`;
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TMDB Attribution */}
            <div className="px-6 pb-4 pt-2 border-t border-gray-800 flex justify-between items-center">
              <p className="text-[10px] text-gray-500">
                Data provided by TMDB • BADMOUTH AI Rating by Gemini
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
