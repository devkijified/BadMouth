// components/ExperienceCategories.tsx
'use client';

import { Sparkles, ChevronRight } from 'lucide-react';

interface ExperienceCategoriesProps {
  onOpenModal: () => void;
  selectedCategory: string | null;
}

export default function ExperienceCategories({ 
  onOpenModal, 
  selectedCategory 
}: ExperienceCategoriesProps) {
  return (
    <button
      onClick={onOpenModal}
      className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-teal-500/50 transition-all duration-300 hover:scale-[1.01]"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 rounded-full group-hover:bg-teal-500/30 transition">
            <Sparkles className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              How do you want to feel?
            </h3>
            <p className="text-xs text-gray-400">
              {selectedCategory 
                ? `🎯 Filtered by: ${selectedCategory}`
                : 'Pick a vibe for personalized recommendations'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition" />
        </div>
      </div>

      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </button>
  );
}
