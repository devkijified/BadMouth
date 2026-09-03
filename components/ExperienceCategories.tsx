// components/ExperienceCategories.tsx
'use client';

import { useState } from 'react';
import { EXPERIENCE_CATEGORIES } from '@/constants/experienceCategories';
import { ChevronRight, X } from 'lucide-react';

interface ExperienceCategoriesProps {
  onSelectCategory: (categoryId: string | null) => void;
  selectedCategory: string | null;
}

export default function ExperienceCategories({ 
  onSelectCategory, 
  selectedCategory 
}: ExperienceCategoriesProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          🎯 How do you want to feel?
        </h3>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPERIENCE_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          const isHovered = hoveredId === category.id;

          return (
            <button
              key={category.id}
              onClick={() => {
                console.log('🎯 Category clicked:', category.id);
                onSelectCategory(isSelected ? null : category.id);
              }}
              onMouseEnter={() => setHoveredId(category.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative p-4 rounded-xl text-left transition-all duration-300 ${
                isSelected
                  ? `bg-gradient-to-r ${category.color} ring-2 ring-white scale-[1.02] shadow-lg`
                  : 'bg-gray-800/50 hover:bg-gray-700/50 hover:scale-[1.01] border border-gray-700/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{category.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-white'}`}>
                    {category.name}
                  </h4>
                  <p className={`text-xs mt-1 line-clamp-2 ${
                    isSelected ? 'text-white/80' : 'text-gray-400'
                  }`}>
                    {category.pitch}
                  </p>
                  {isSelected && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {category.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 ${
                    isHovered ? 'text-teal-400' : 'text-gray-600'
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
