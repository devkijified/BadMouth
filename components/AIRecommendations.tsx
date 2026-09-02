// components/AIRecommendations.tsx
'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Star, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ContentItem } from '@/types/content';
import toast from 'react-hot-toast';

interface AIRecommendationsProps {
  userId: string;
  onViewDetails: (item: ContentItem) => void;
  onAddToWatchlist: (item: ContentItem) => void;
  isInWatchlist: (id: string) => boolean;
}

export default function AIRecommendations({ 
  userId, 
  onViewDetails, 
  onAddToWatchlist, 
  isInWatchlist 
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkTasteProfile();
  }, [userId]);

  const checkTasteProfile = async () => {
    try {
      const { data } = await supabase
        .from('user_taste_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      setHasProfile(!!data);
      if (data) {
        fetchRecommendations();
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        headers: { 'x-user-id': userId },
      });
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    // Check if user has taste profile
    const { data } = await supabase
      .from('user_taste_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (data) {
      // Has profile - get recommendations
      await fetchRecommendations();
    } else {
      // No profile - show onboarding
      window.location.href = '/onboarding';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
        <p className="text-gray-400 mt-2">Loading AI recommendations...</p>
      </div>
    );
  }

  // Show onboarding prompt if no taste profile
  if (!hasProfile) {
    return (
      <div className="bg-gradient-to-r from-teal-600/20 to-blue-600/20 rounded-xl p-6 border border-teal-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-500/20 rounded-full">
            <Sparkles className="w-8 h-8 text-teal-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">AI-Powered Recommendations</h3>
            <p className="text-gray-400 text-sm mt-1">
              Get personalized movie recommendations powered by AI. 
              Tell us what you like and we'll find the perfect matches.
            </p>
            <button
              onClick={handleGetRecommendations}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No recommendations yet
  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <Sparkles className="w-8 h-8 text-gray-500 mx-auto" />
        <p className="text-gray-400 mt-2">No AI recommendations yet</p>
        <button
          onClick={fetchRecommendations}
          className="mt-2 text-teal-400 hover:text-teal-300 text-sm"
        >
          Generate recommendations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-500" />
          <h2 className="text-xl font-semibold text-white">AI Picks for You</h2>
          <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">Powered by Gemini</span>
        </div>
        <button
          onClick={fetchRecommendations}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendations.map((rec: any) => {
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
                    onAddToWatchlist(item);
                  }}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-teal-600 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={isLiked ? "text-teal-500" : "text-gray-400"}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                {/* AI Score Badge */}
                {rec.score && (
                  <div className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-teal-400">
                    {Math.round(rec.score * 100)}% match
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 truncate">
                  {item.artist || item.director || item.type}
                </p>
                {rec.reason && (
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{rec.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
