// constants/experienceCategories.ts

import { ExperienceCategory } from '@/types/content';

export const EXPERIENCE_CATEGORIES: ExperienceCategory[] = [
  {
    id: 'watch-in-weekend',
    name: 'Watch In a Weekend',
    pitch: 'High-energy limited series or cinematic sagas that can easily be devoured in 48 hours.',
    icon: '📺',
    color: 'from-purple-600 to-indigo-500',
    tags: ['Action', 'Adventure', 'Sci-Fi', 'Thriller'],
    keywords: ['binge', 'limited series', 'saga', 'fast-paced', 'marathon']
  },
  {
    id: 'watch-with-spouse',
    name: 'Watch With Your Spouse',
    pitch: 'High-engagement, low-disagreement crowd-pleasers with zero dead spots to keep both of you hooked.',
    icon: '❤️',
    color: 'from-pink-500 to-rose-400',
    tags: ['Comedy', 'Romance', 'Drama', 'Family'],
    keywords: ['crowd-pleaser', 'romantic', 'engaging', 'fun', 'heartwarming']
  },
  {
    id: 'brains-required',
    name: 'Brains Required',
    pitch: 'Mind-bending plots, non-linear timelines, and twist endings that demand total focus and post-credits debates.',
    icon: '🧠',
    color: 'from-indigo-600 to-purple-500',
    tags: ['Thriller', 'Mystery', 'Sci-Fi'],
    keywords: ['mind-bending', 'twist', 'non-linear', 'intellectual', 'complex']
  },
  {
    id: 'background-noise',
    name: 'Background Noise Friendly',
    pitch: 'Low-stakes, highly visual or episodic picks you can glance at while multi-tasking, folding laundry, or scrolling.',
    icon: '🎧',
    color: 'from-gray-500 to-gray-700',
    tags: ['Comedy', 'Family', 'Animation', 'Documentary'],
    keywords: ['easy watching', 'visual', 'low-stakes', 'multi-tasking', 'casual']
  },
  {
    id: '90-min-clean-cuts',
    name: '90-Minute Clean Cuts',
    pitch: 'Zero filler, fast-paced thrillers or comedies that wrap up cleanly before bedtime without bloated runtimes.',
    icon: '⏱️',
    color: 'from-green-500 to-emerald-400',
    tags: ['Thriller', 'Comedy', 'Action'],
    keywords: ['short', 'tight', 'fast-paced', 'efficient', 'under-90']
  },
  {
    id: 'comfort-food-cinema',
    name: 'Comfort Food Cinema',
    pitch: 'Feel-good classics, warm aesthetics, and low-stress plots designed to lower your cortisol after a brutal week.',
    icon: '🍿',
    color: 'from-amber-500 to-yellow-400',
    tags: ['Comedy', 'Drama', 'Family', 'Romance'],
    keywords: ['feel-good', 'heartwarming', 'classic', 'relaxing', 'cozy']
  },
  {
    id: 'high-risk-high-reward',
    name: 'High Risk, High Reward',
    pitch: 'Divisive, weird, or unorthodox hidden gems—movies you\'ll either rate a 1/10 or declare a masterpiece.',
    icon: '🎲',
    color: 'from-red-600 to-orange-500',
    tags: ['Thriller', 'Horror', 'Mystery', 'Drama'],
    keywords: ['divisive', 'unorthodox', 'hidden gem', 'unique', 'controversial']
  },
  {
    id: 'date-night-edge',
    name: 'Date Night Edge',
    pitch: 'Stylish, tense, and slightly spicy thrillers or dark romances designed to build suspense and keep the room quiet.',
    icon: '🌙',
    color: 'from-purple-700 to-pink-600',
    tags: ['Thriller', 'Romance', 'Drama'],
    keywords: ['suspenseful', 'stylish', 'dark romance', 'tense', 'spicy']
  },
  {
    id: 'group-chat-debates',
    name: 'Group Chat Debates',
    pitch: 'Controversial endings, morally gray characters, and wild plot points that instantly demand a debrief text.',
    icon: '💬',
    color: 'from-blue-500 to-teal-400',
    tags: ['Thriller', 'Drama', 'Mystery', 'Sci-Fi'],
    keywords: ['controversial', 'morally gray', 'debate', 'wild', 'unexpected']
  },
  {
    id: 'visual-eye-candy',
    name: 'Visual Eye Candy',
    pitch: 'Stunning cinematography, breathtaking set design, or world-class animation where turn-off-the-lights aesthetics take center stage.',
    icon: '🎬',
    color: 'from-cyan-500 to-blue-400',
    tags: ['Adventure', 'Sci-Fi', 'Fantasy', 'Animation'],
    keywords: ['cinematography', 'visuals', 'stunning', 'aesthetic', 'beautiful']
  }
];
