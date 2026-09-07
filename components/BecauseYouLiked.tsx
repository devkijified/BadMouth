// components/BecauseYouLiked.tsx
'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Heart, Star, Loader2 } from 'lucide-react';
import { ContentItem } from '@/types/content';
import toast from 'react-hot-toast';

interface BecauseYouLikedProps {
  userId: string;
  onViewDetails: (item: ContentItem) => void;
  onAddToWatchlist: (item: ContentItem) => Promise<void>;
  onRemoveFromWatchlist: (id: string) => Promise<void>;
  isInWatchlist: (id: string) => boolean;
}

export default function BecauseYouLiked({
  userId,
  onViewDetails,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
}: BecauseYouLikedProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedMovies, setWatchedMovies] = useState<string[]>([]);

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/similar-with-history', {
        headers: { 'x-user-id': userId },
      });
      const data = await response.json();

      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
        // Extract watched movie titles for display
        const watched = data.recommendations.map((r: any) => r.reason?.split('"')[1] || '');
        setWatchedMovies(watched);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
        <p className="text-gray-400 mt-2">Finding movies similar to your taste...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-500" />
          <h2 className="text-xl font-semibold text-white">Because you liked...</h2>
          <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">Personalized</span>
        </div>
        <button
          onClick={fetchRecommendations}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendations.slice(0, 10).map((rec: any) => {
          const item = rec.content;
          if (!item) return null;
          
          const isLiked = isInWatchlist(item.id);

          return (
            <div
              key={item.id}
              className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200 group"
              onClick={() => onViewDetails(item)}
            >
              <div className="relative">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=1a1a2e&color=14b8a6&bold=true&length=2&size=200&name=${encodeURIComponent(item.title)}`;
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-white">{item.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLiked) {
                      onRemoveFromWatchlist(item.id);
                    } else {
                      onAddToWatchlist(item);
                    }
                  }}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                >
                  <Heart
                    size={14}
                    className={isLiked ? 'fill-teal-500 text-teal-500' : 'text-gray-400'}
                  />
                </button>
                {/* "Because you liked X" overlay */}
                {rec.reason && (
                  <div className="absolute bottom-2 left-2 right-12">
                    <p className="text-[9px] text-teal-300 bg-black/70 px-1.5 py-0.5 rounded truncate">
                      💡 {rec.reason.split('"')[0]} "{rec.reason.split('"')[1] || ''}"
                    </p>
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 truncate">
                  {item.genre?.split(',').slice(0, 2).join(', ') || item.type}
                </p>
                {rec.reason && (
                  <p className="text-[9px] text-gray-500 mt-1 line-clamp-2">{rec.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
