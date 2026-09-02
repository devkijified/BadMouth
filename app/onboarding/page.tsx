// app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { ChevronRight, Sparkles, Film, Heart, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const allGenres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Horror', 'Adventure', 'Animation', 'Documentary'];
const allMoods = ['Mind-bending', 'Feel-good', 'Suspenseful', 'Emotional', 'Thought-provoking', 'Action-packed', 'Heartwarming', 'Dark', 'Quirky', 'Epic'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    genres: [] as string[],
    moods: [] as string[],
    languages: ['en'],
    runtimeMin: 90,
    runtimeMax: 150,
  });

  const handleGenreToggle = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleMoodToggle = (mood: string) => {
    setPreferences(prev => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter(m => m !== mood)
        : [...prev.moods, mood]
    }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    if (preferences.genres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_taste_profiles')
        .upsert({
          user_id: user.id,
          genre_affinities: preferences.genres.reduce((acc, g) => ({ ...acc, [g]: 0.8 }), {}),
          mood_preferences: preferences.moods,
          language_preferences: preferences.languages,
          preferred_runtime_min: preferences.runtimeMin,
          preferred_runtime_max: preferences.runtimeMax,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Preferences saved! Getting your recommendations...');
      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-teal-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              BADMOUTH AI
            </h1>
          </div>
          <p className="text-gray-400">Let's personalize your movie recommendations</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-teal-500' : 'bg-gray-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-teal-500' : 'bg-gray-700'}`} />
        </div>

        {step === 1 && (
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">What genres do you love?</h2>
            <p className="text-gray-400 text-sm mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {allGenres.map(genre => (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    preferences.genres.includes(genre)
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={preferences.genres.length === 0}
              className="w-full py-3 bg-teal-500 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">What mood are you in?</h2>
            <p className="text-gray-400 text-sm mb-6">Pick your favorite movie vibes</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {allMoods.map(mood => (
                <button
                  key={mood}
                  onClick={() => handleMoodToggle(mood)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    preferences.moods.includes(mood)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} /> Runtime preference
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="60"
                  max="240"
                  value={preferences.runtimeMin}
                  onChange={(e) => setPreferences(prev => ({ ...prev, runtimeMin: parseInt(e.target.value) }))}
                  className="flex-1 accent-teal-500"
                />
                <span className="text-sm text-gray-400">{preferences.runtimeMin}-{preferences.runtimeMax} min</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : 'Get Recommendations'} <Sparkles size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
