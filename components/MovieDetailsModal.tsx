// components/MovieDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Star, Heart, Play, Users, Calendar, Clock, Film, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
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

interface Platform {
  name: string;
  logo: string;
  url: string;
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
  const [cast, setCast] = useState<CastMember[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiRating, setAiRating] = useState<number | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Fetch cast, crew, and platform data when content changes
  useEffect(() => {
    if (content && isOpen) {
      fetchMovieDetails();
      generateAIReview();
    }
  }, [content, isOpen]);

  const fetchMovieDetails = async () => {
    if (!content) return;
    setLoading(true);

    try {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'e40a2dd7da8c15d302e6790211dd958f';
      
      // Fetch full movie details from TMDB
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${content.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,watch/providers,images`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract cast (top 15)
        if (data.credits?.cast) {
          setCast(data.credits.cast.slice(0, 15).map((c: any) => ({
            id: c.id.toString(),
            name: c.name,
            character: c.character || 'Unknown',
            profile_path: c.profile_path,
          })));
        }

        // Extract crew (directors, writers, producers)
        if (data.credits?.crew) {
          const keyRoles = ['Director', 'Writer', 'Producer', 'Cinematography', 'Editor', 'Music'];
          const filteredCrew = data.credits.crew
            .filter((c: any) => keyRoles.includes(c.job))
            .slice(0, 10)
            .map((c: any) => ({
              id: c.id.toString(),
              name: c.name,
              job: c.job,
              profile_path: c.profile_path,
            }));
          setCrew(filteredCrew);
        }

        // Extract platform data (US providers)
        if (data['watch/providers']?.results?.US) {
          const providers = data['watch/providers'].results.US;
          const allPlatforms = [
            ...(providers.flatrate || []),
            ...(providers.rent || []),
            ...(providers.buy || []),
          ];
          
          const uniquePlatforms = allPlatforms.reduce((acc: any[], current) => {
            if (!acc.find((p: any) => p.provider_id === current.provider_id)) {
              acc.push(current);
            }
            return acc;
          }, []).slice(0, 8).map((p: any) => ({
            name: p.provider_name,
            logo: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
            url: `https://www.themoviedb.org/movie/${content.id}/watch`,
          }));
          setPlatforms(uniquePlatforms);
        }
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.review) {
          setAiReview(data.review);
        }
        if (data.rating) {
          setAiRating(data.rating);
        }
      }
    } catch (error) {
      console.error('Error generating AI review:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!isOpen || !content) return null;

  const isLiked = isInWatchlist(content.id);
  const getRating = (item: ContentItem) => item.rating || 0;

  // Platform icons for display
  const platformLogos: Record<string, { icon: string; color: string }> = {
    'Netflix': { icon: '📺', color: 'bg-red-700' },
    'Prime Video': { icon: '📦', color: 'bg-blue-600' },
    'Max': { icon: '🔷', color: 'bg-blue-500' },
    'Hulu': { icon: '🟢', color: 'bg-green-500' },
    'Disney+': { icon: '✨', color: 'bg-blue-700' },
    'Apple TV+': { icon: '🍎', color: 'bg-gray-600' },
    'Peacock': { icon: '🦚', color: 'bg-blue-600' },
    'Paramount+': { icon: '⛰️', color: 'bg-blue-600' },
  };

  const handleCastClick = (actorName: string) => {
    onClose();
    // Navigate to actor page
    window.location.href = `/actor/${encodeURIComponent(actorName)}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-30 p-2 bg-black/70 hover:bg-black/90 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Hero Section */}
        <div className="relative w-full h-72 bg-gray-800">
          <img
            src={content.backdrop_url || content.image_url}
            alt={content.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = content.image_url || '';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
          
          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-3xl font-bold text-white">{content.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-300">
              {content.year && <span>{content.year}</span>}
              {content.runtime && <span>• {content.runtime}</span>}
              {content.genre && <span>• {content.genre.split(',').slice(0, 3).join(', ')}</span>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* AI Review Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-xl border border-teal-500/20">
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
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-lg font-bold text-white">{aiRating.toFixed(1)}</span>
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
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {content.long_description || content.description}
          </p>

          {/* Rating and Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold text-white">{getRating(content).toFixed(1)}</span>
              <span className="text-gray-400 text-sm">/10</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-teal-500 text-teal-500' : 'text-gray-400'}`} />
              <span className="text-gray-400 text-sm">{content.rating_count || 0} ratings</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                onClose();
                onRecommend(content);
              }}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 text-sm"
            >
              <Star size={16} className="fill-white" /> Rate
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
          </div>

          {/* Cast Section */}
          {cast.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Users size={16} /> Cast
              </h3>
              <div className="flex flex-wrap gap-3">
                {cast.map((actor) => (
                  <button
                    key={actor.id}
                    onClick={() => handleCastClick(actor.name)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-teal-600/20 rounded-lg transition group"
                  >
                    {actor.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                        alt={actor.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                        {actor.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-medium text-white group-hover:text-teal-400 transition">
                        {actor.name}
                      </p>
                      <p className="text-[10px] text-gray-400">{actor.character}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Crew Section */}
          {crew.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Film size={16} /> Crew
              </h3>
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

          {/* Platforms Section */}
          {platforms.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Play size={16} /> Available on
              </h3>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform, idx) => {
                  const platformInfo = platformLogos[platform.name] || { icon: '🎬', color: 'bg-gray-600' };
                  return (
                    <a
                      key={idx}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-1.5 ${platformInfo.color} rounded-lg text-xs font-medium hover:opacity-80 transition`}
                    >
                      <img src={platform.logo} alt={platform.name} className="w-5 h-5 rounded object-contain" />
                      <span>{platform.name}</span>
                      <ExternalLink size={12} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* TMDB Attribution */}
          <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center">
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
        </div>
      </div>
    </div>
  );
}
