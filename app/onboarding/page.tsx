// app/onboarding/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Film, Music, Heart, Star, Clock, Languages, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
    watchedMovies: [] as string[],
  });

  const allGenres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Horror', 'Adventure', 'Animation', 'Documentary'];
  const allMoods = ['Mind-bending', 'Feel-good', 'Suspenseful', 'Emotional', 'Thought-provoking', 'Action-packed', 'Heartwarming', 'Dark', 'Quirky', 'Epic'];

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

  const handleSavePreferences = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_taste_profiles')
        .upsert({
          user_id: user.id,
          genre_affinities: preferences.genres.reduce((acc, genre) => ({ ...acc, [genre]: 0.8 }), {}),
          mood_preferences: preferences.moods,
          language_preferences: preferences.languages,
          preferred_runtime_min: preferences.runtimeMin,
          preferred_runtime_max: preferences.runtimeMax,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Preferences saved!');
      router.push('/');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-teal-500' : 'bg-gray-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-teal-500' : 'bg-gray-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 3 ? 'bg-teal-500' : 'bg-gray-700'}`} />
        </div>

        <h1 className="text-3xl font-bold mb-2">Welcome to BADMOUTH</h1>
        <p className="text-gray-400 mb-8">Let's personalize your movie recommendations</p>

        {/* Step 1: Genres */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">What genres do you love?</h2>
            <p className="text-gray-400 text-sm mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2 mb-8">
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
              className="w-full py-3 bg-teal-500 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center justify-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Moods & Preferences */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">What mood are you usually in?</h2>
            <p className="text-gray-400 text-sm mb-6">Pick your favorite movie moods</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {allMoods.map(mood => (
                <button
                  key={mood}
                  onClick={() => handleMoodToggle(mood)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    preferences.moods.includes(mood)
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>

            <div className="bg-gray-900 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock size={18} /> Runtime Preference
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="60"
                  max="240"
                  value={preferences.runtimeMin}
                  onChange={(e) => setPreferences(prev => ({ ...prev, runtimeMin: parseInt(e.target.value) }))}
                  className="flex-1"
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
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-teal-500 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center justify-center gap-2"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary & Save */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
            <p className="text-gray-400 text-sm mb-6">Here's your taste profile</p>

            <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <span className="text-sm text-gray-400">Genres</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preferences.genres.length > 0 ? (
                    preferences.genres.map(g => (
                      <span key={g} className="px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded text-xs">{g}</span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No genres selected</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">Moods</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preferences.moods.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">Runtime</span>
                <p className="text-sm">{preferences.runtimeMin}-{preferences.runtimeMax} minutes</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Back
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={loading}
                className="flex-1 py-3 bg-teal-500 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save & Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
