// components/ExperienceModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { EXPERIENCE_CATEGORIES } from '@/constants/experienceCategories';

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  selectedCategory: string | null;
}

export default function ExperienceModal({
  isOpen,
  onClose,
  onSelectCategory,
  selectedCategory,
}: ExperienceModalProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />

      <div className="relative bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-full">
              <Sparkles className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How do you want to feel?</h2>
              <p className="text-xs text-gray-400">Pick a vibe and get AI-curated recommendations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPERIENCE_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.id;
              const isHovered = hoveredId === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelectCategory(isSelected ? null : category.id);
                    onClose();
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

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {selectedCategory 
                ? `Currently filtered by: ${EXPERIENCE_CATEGORIES.find(c => c.id === selectedCategory)?.name}`
                : 'No filter active'
              }
            </p>
            {selectedCategory && (
              <button
                onClick={() => {
                  onSelectCategory(null);
                  onClose();
                }}
                className="text-xs text-teal-400 hover:text-teal-300 transition"
              >
                ✕ Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
