// components/TrailerReels.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, Info, Bookmark, Volume2, VolumeX, X, Play, Pause } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface ReelContent {
  id: string;
  title: string;
  description: string;
  long_description?: string;
  image_url: string;
  backdrop_url?: string;
  trailer_url: string;
  type: 'movie' | 'music';
  year?: number;
  director?: string;
  artist?: string;
  rating?: number;
  genre?: string;
  // ... other fields
}

// 🎬 YouTube URL converter - ONLY USED FOR REELS
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  
  // If it's already an embed URL
  if (url.includes('/embed/')) {
    // Add autoplay if not present
    return url.includes('?') ? url : `${url}?autoplay=1&mute=1&enablejsapi=1`;
  }
  
  // Extract video ID
  let videoId = '';
  
  // Handle youtube.com/watch?v=...
  if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
  }
  // Handle youtu.be/...
  else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  }
  // Handle youtube.com/embed/ without autoplay
  else if (url.includes('/embed/')) {
    videoId = url.split('/embed/')[1]?.split('?')[0] || '';
  }
  // Handle youtube.com/v/...
  else if (url.includes('/v/')) {
    videoId = url.split('/v/')[1]?.split('?')[0] || '';
  }
  // Handle youtube.com/e/...
  else if (url.includes('/e/')) {
    videoId = url.split('/e/')[1]?.split('?')[0] || '';
  }
  
  if (!videoId) return url; // Return original if we can't parse it
  
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`;
};

export default function TrailerReels() {
  const [reels, setReels] = useState<ReelContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();

  // Fetch reels
  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching reels...');
        const { data, error, count } = await supabase
          .from('content')
          .select('*', { count: 'exact' })
          .not('trailer_url', 'is', null)
          .neq('trailer_url', '')
          .order('rating', { ascending: false })
          .limit(50);
        
        console.log('📊 Found reels:', count);
        console.log('📝 First reel:', data?.[0]);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setReels(data);
        } else {
          setError('No trailers found. Add some content with trailer URLs!');
        }
      } catch (err) {
        console.error('Error fetching reels:', err);
        setError('Failed to load reels');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReels();
  }, []);

  // Check if current reel is in watchlist
  useEffect(() => {
    const checkWatchlist = async () => {
      if (!user || !reels[currentIndex]) return;
      
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', reels[currentIndex].id)
        .single();
      
      setIsLiked(!!data);
      setIsSaved(!!data);
    };
    
    checkWatchlist();
  }, [currentIndex, user, reels]);

  // 🎬 Handle video progress
  useEffect(() => {
    // Simulate progress for demo
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 0.5;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentIndex]);

  // Handle scroll to change reels
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const index = Math.round(scrollTop / height);
      
      if (index !== currentIndex && index < reels.length) {
        setCurrentIndex(index);
        setProgress(0);
        setIsLiked(false);
        setIsSaved(false);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length]);

  const handleLike = async () => {
    if (!user) {
      alert('Please login to like');
      return;
    }
    
    try {
      if (isLiked) {
        // Remove from watchlist
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', reels[currentIndex].id);
      } else {
        // Add to watchlist
        await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            content_id: reels[currentIndex].id,
            content_type: reels[currentIndex].type
          });
      }
      setIsLiked(!isLiked);
      setIsSaved(!isLiked); // Sync save state
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert('Please login to save');
      return;
    }
    
    try {
      if (isSaved) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', reels[currentIndex].id);
      } else {
        await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            content_id: reels[currentIndex].id,
            content_type: reels[currentIndex].type
          });
      }
      setIsSaved(!isSaved);
      setIsLiked(!isSaved); // Sync like state
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Loading reels...</div>
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8">
        <h2 className="text-2xl font-bold mb-4">No Reels Available</h2>
        <p className="text-gray-400 text-center max-w-md">
          {error || 'No trailers found. Add content with YouTube URLs to the database.'}
        </p>
      </div>
    );
  }

  const currentReel = reels[currentIndex];
  const videoUrl = getYouTubeEmbedUrl(currentReel?.trailer_url);

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black relative"
      style={{ scrollbarWidth: 'none' }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Reels Container */}
      {reels.map((reel, index) => {
        const isActive = index === currentIndex;
        const embedUrl = getYouTubeEmbedUrl(reel.trailer_url);
        
        return (
          <div
            key={reel.id}
            className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
          >
            {/* Video Container */}
            <div className="absolute inset-0 w-full h-full bg-black">
              {embedUrl ? (
                <iframe
                  ref={isActive ? videoRef : null}
                  src={embedUrl}
                  title={reel.title}
                  className="w-full h-full pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  frameBorder="0"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-900">
                  <div className="text-center text-white p-4">
                    <p className="text-xl mb-2">No Trailer Available</p>
                    <p className="text-sm text-gray-400">{reel.title}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

            {/* Progress Bar */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 z-20">
                <div 
                  className="h-full bg-red-600 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Counter */}
            <div className="absolute top-4 left-4 text-white text-sm z-20 font-medium">
              <span className="bg-black/50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {reels.length}
              </span>
            </div>

            {/* Info Overlay - Bottom */}
            {isActive && (
              <div className="absolute bottom-20 left-4 right-20 z-20 text-white">
                <h2 className="text-2xl font-bold mb-1">{reel.title}</h2>
                <p className="text-sm text-gray-300 mb-1">
                  {reel.type === 'movie' ? reel.director : reel.artist}
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    ⭐ {reel.rating?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="bg-red-600 px-2 py-0.5 rounded text-xs">
                    {reel.type === 'movie' ? '🎬 Movie' : '🎵 Music'}
                  </span>
                  {reel.genre && (
                    <span className="text-gray-300">{reel.genre}</span>
                  )}
                </div>
                {reel.description && (
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2 max-w-md">
                    {reel.description}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons - Right Side */}
            {isActive && (
              <div className="absolute bottom-32 right-4 z-20 flex flex-col items-center gap-5">
                {/* Like Button */}
                <button 
                  onClick={handleLike}
                  className="flex flex-col items-center text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2 rounded-full ${isLiked ? 'bg-red-600' : 'bg-black/40'} backdrop-blur-sm`}>
                    <Heart className={`w-7 h-7 ${isLiked ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-xs mt-1">Like</span>
                </button>

                {/* Details Button */}
                <button 
                  onClick={() => setShowDetails(true)}
                  className="flex flex-col items-center text-white hover:scale-110 transition-transform"
                >
                  <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
                    <Info className="w-7 h-7" />
                  </div>
                  <span className="text-xs mt-1">Details</span>
                </button>

                {/* Save Button */}
                <button 
                  onClick={handleSave}
                  className="flex flex-col items-center text-white hover:scale-110 transition-transform"
                >
                  <div className={`p-2 rounded-full ${isSaved ? 'bg-blue-600' : 'bg-black/40'} backdrop-blur-sm`}>
                    <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-xs mt-1">Save</span>
                </button>
              </div>
            )}

            {/* Mute Button - Bottom */}
            {isActive && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
          </div>
        );
      })}

      {/* Details Modal */}
      {showDetails && currentReel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-white">{currentReel.title}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3 text-gray-300">
              {currentReel.description && (
                <p className="text-sm">{currentReel.description}</p>
              )}
              {currentReel.long_description && (
                <p className="text-sm text-gray-400">{currentReel.long_description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {currentReel.type === 'movie' && (
                  <>
                    <div><span className="text-gray-500">Director:</span> {currentReel.director || 'N/A'}</div>
                    <div><span className="text-gray-500">Year:</span> {currentReel.year || 'N/A'}</div>
                  </>
                )}
                {currentReel.type === 'music' && (
                  <>
                    <div><span className="text-gray-500">Artist:</span> {currentReel.artist || 'N/A'}</div>
                    <div><span className="text-gray-500">Duration:</span> {currentReel.duration || 'N/A'}</div>
                  </>
                )}
                <div><span className="text-gray-500">Rating:</span> ⭐ {currentReel.rating?.toFixed(1) || 'N/A'}</div>
                <div><span className="text-gray-500">Genre:</span> {currentReel.genre || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
