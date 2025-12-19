import React, { useState } from 'react';
import { TriviaCategory } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';
import { resetPlayedTracks } from '../services/triviaService';
import { shuffleArray } from '../utils/helpers';

interface CategorySelectionScreenProps {
  onStartGame: (selectedCategories: TriviaCategory[]) => void;
  onBack: () => void;
}

const AVAILABLE_CATEGORIES: TriviaCategory[] = [
  // Standard (The Trivia API)
  { id: 'general_knowledge', name: 'General', emoji: '🧠' },
  { id: 'film_and_tv', name: 'Film & TV', emoji: '🎬' },
  { id: 'history', name: 'History', emoji: '📜' },
  { id: 'geography', name: 'Geography', emoji: '🌍' },
  { id: 'sport_and_leisure', name: 'Sports', emoji: '⚽' },
  { id: 'science', name: 'Science', emoji: '🔬' },
  { id: 'food_and_drink', name: 'Food', emoji: '🍔' },
  { id: 'arts_and_literature', name: 'Arts/Lit', emoji: '🎨' },
  { id: 'society_and_culture', name: 'Culture', emoji: '🏛️' },
  
  // Visual Categories
  { id: 'geo_flags', name: 'Flags', emoji: '🏳️' },
  { id: 'geo_capitals', name: 'Capitals', emoji: '🏛️' },
  { id: 'mov_posters', name: 'Posters', emoji: '🎬' },
  { id: 'football_career', name: 'Career Path', emoji: '⚽' },

  // Music (iTunes Custom)
  { id: 'music_2010s', name: '2010s Hits', emoji: '📱' },
  { id: 'music_2000s', name: '2000s Hits', emoji: '💿' },
  { id: 'music_90s', name: '90s Hits', emoji: '📼' },
  { id: 'music_80s', name: '80s Hits', emoji: '🕺' },
  { id: 'music_rock', name: 'Rock Classics', emoji: '🎸' },
  { id: 'music_hiphop', name: 'Hip Hop', emoji: '🎤' },
  { id: 'music_movies', name: 'TV/Movie Soundtrack', emoji: '🍿' }
];

export const CategorySelectionScreen: React.FC<CategorySelectionScreenProps> = ({ onStartGame, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);

  // Enlarged Grid Layout: 5 Columns to fit ~20 items better on screen
  const GRID_COLS = 5;
  const TOTAL_CATS = AVAILABLE_CATEGORIES.length;
  
  // Navigation Indices
  const START_BUTTON_INDEX = TOTAL_CATS;
  const RANDOM_BUTTON_INDEX = TOTAL_CATS + 1;
  const RESET_BUTTON_INDEX = TOTAL_CATS + 2;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(catId => catId !== id);
      } else {
        if (prev.length >= 6) return prev; 
        return [...prev, id];
      }
    });
  };

  const handleRandomize = () => {
    const shuffled = shuffleArray([...AVAILABLE_CATEGORIES]);
    const randomSix = shuffled.slice(0, 6).map(c => c.id);
    setSelectedIds(randomSix);
  };

  const handleResetHistory = () => {
    if (confirm("Clear played song history? Songs may repeat.")) {
      resetPlayedTracks();
    }
  };

  const isValid = selectedIds.length >= 4 && selectedIds.length <= 6;

  useTVNavigation({
    onUp: () => {
      if (focusIndex >= START_BUTTON_INDEX) {
        setFocusIndex(TOTAL_CATS - Math.floor(GRID_COLS / 2));
      } else if (focusIndex >= GRID_COLS) {
        setFocusIndex(prev => prev - GRID_COLS);
      }
    },
    onDown: () => {
      if (focusIndex < TOTAL_CATS - GRID_COLS) {
        setFocusIndex(prev => prev + GRID_COLS);
      } else if (focusIndex < TOTAL_CATS) {
        setFocusIndex(START_BUTTON_INDEX); // Go to buttons
      }
    },
    onLeft: () => {
      if (focusIndex === START_BUTTON_INDEX) return; // Leftmost button
      if (focusIndex === RANDOM_BUTTON_INDEX) setFocusIndex(START_BUTTON_INDEX);
      if (focusIndex === RESET_BUTTON_INDEX) setFocusIndex(RANDOM_BUTTON_INDEX);
      
      if (focusIndex < TOTAL_CATS && focusIndex % GRID_COLS !== 0) {
        setFocusIndex(prev => prev - 1);
      }
    },
    onRight: () => {
      if (focusIndex === START_BUTTON_INDEX) setFocusIndex(RANDOM_BUTTON_INDEX);
      if (focusIndex === RANDOM_BUTTON_INDEX) setFocusIndex(RESET_BUTTON_INDEX);
      
      if (focusIndex < TOTAL_CATS && (focusIndex + 1) % GRID_COLS !== 0) {
        setFocusIndex(prev => prev + 1);
      }
    },
    onEnter: () => {
      if (focusIndex === START_BUTTON_INDEX) {
        if (isValid) {
          const selectedCats = AVAILABLE_CATEGORIES.filter(c => selectedIds.includes(c.id));
          onStartGame(selectedCats);
        }
      } else if (focusIndex === RANDOM_BUTTON_INDEX) {
        handleRandomize();
      } else if (focusIndex === RESET_BUTTON_INDEX) {
        handleResetHistory();
      } else if (focusIndex < TOTAL_CATS) {
        toggleSelection(AVAILABLE_CATEGORIES[focusIndex].id);
      }
    },
    onGreen: () => {
       if (isValid) {
          const selectedCats = AVAILABLE_CATEGORIES.filter(c => selectedIds.includes(c.id));
          onStartGame(selectedCats);
       }
    },
    onBack: onBack
  }, [focusIndex, selectedIds, isValid]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden text-white z-10 bg-indigo-950">
      
      <div className="mt-4 mb-6 text-center animate-zoom-in">
        <h2 className="text-4xl font-black tracking-tight mb-2 drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
          Choose Your Destiny
        </h2>
        <div className="flex items-center justify-center space-x-3">
          <div className="glass-panel px-6 py-1 rounded-full flex items-center gap-2 border-white/20">
            <span className={`text-xl font-mono font-bold ${isValid ? 'text-magic-cyan' : 'text-gray-400'}`}>
              {selectedIds.length} / 6
            </span>
            <span className="text-[10px] text-gray-300 uppercase tracking-widest font-semibold">Categories (Min 4)</span>
          </div>
        </div>
      </div>

      {/* Grid Container - Enlarged */}
      <div className="grid grid-cols-5 gap-4 mb-8 w-full max-w-7xl px-8 flex-1 content-center">
        {AVAILABLE_CATEGORIES.map((cat, idx) => {
          const isSelected = selectedIds.includes(cat.id);
          const isFocused = focusIndex === idx;
          const isMusic = cat.id.startsWith('music_');
          const isGeo = cat.id.startsWith('geo_');
          const isMoviePoster = cat.id === 'mov_posters';
          const isFootball = cat.id === 'football_career';
          
          const isVisual = isGeo || isMoviePoster || isFootball;

          // Styles based on Type
          let baseColor = 'bg-card-gradient border-white/10'; // Default
          if (isMusic) baseColor = 'bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 border-fuchsia-500/30';
          if (isVisual) baseColor = 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/30';

          if (isSelected) {
            if (isMusic) {
                baseColor = 'bg-gradient-to-br from-fuchsia-600 to-purple-700 border-white text-white shadow-glow';
            } else if (isVisual) {
                baseColor = 'bg-gradient-to-br from-emerald-600 to-teal-700 border-white text-white shadow-glow';
            } else {
                baseColor = 'bg-gradient-to-br from-indigo-600 to-blue-700 border-magic-cyan text-white shadow-glow-strong';
            }
          }

          return (
            <div
              key={cat.id}
              className={`
                h-24 flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 relative overflow-hidden
                ${baseColor}
                ${!isSelected && 'text-gray-400 opacity-90'}
                ${isFocused 
                  ? 'tv-focus z-10 !opacity-100 scale-105' 
                  : ''
                }
              `}
            >
              {isSelected && <div className="absolute inset-0 bg-white/10 animate-pulse-fast"></div>}
              
              <span className="text-3xl mb-1 drop-shadow-lg transform transition-transform duration-300 group-hover:scale-110">{cat.emoji}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-center px-1 leading-tight drop-shadow-md">
                {cat.name}
              </span>
              
              {/* Type Badge */}
              {isMusic && <div className="absolute top-1 left-1 text-[8px] font-bold bg-fuchsia-500 text-white px-1 rounded-sm shadow-sm">MUSIC</div>}
              {isVisual && <div className="absolute top-1 left-1 text-[8px] font-bold bg-emerald-500 text-white px-1 rounded-sm shadow-sm">VISUAL</div>}

              {isSelected && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full shadow-md border-2 border-white/50"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions Container */}
      <div className="flex items-center space-x-6 mb-8">
        {/* Start Button */}
        <div 
          className={`
            px-12 py-3 rounded-full border-2 transition-all duration-300 flex items-center space-x-4
            ${focusIndex === START_BUTTON_INDEX ? 'tv-focus scale-110' : ''}
            ${isValid 
              ? 'bg-gradient-to-r from-magic-cyan to-blue-600 text-white border-white/50 shadow-neon-blue cursor-pointer' 
              : 'bg-gray-900/50 text-gray-500 border-gray-700/50'
            }
          `}
        >
          <span className="font-black tracking-[0.2em] uppercase text-lg">BEGIN</span>
          {isValid && <span className="bg-white text-blue-900 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg">OK</span>}
        </div>

        {/* Randomize Button */}
        <div 
          className={`
            px-8 py-3 rounded-full border-2 transition-all duration-300 flex items-center space-x-2
            ${focusIndex === RANDOM_BUTTON_INDEX ? 'tv-focus bg-purple-600 border-white text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}
          `}
        >
          <span className="text-xl">🎲</span>
          <span className="font-bold tracking-widest uppercase text-sm">Random</span>
        </div>

        {/* Reset History Button */}
        <div 
          className={`
             px-6 py-3 rounded-full border border-red-900/50 transition-all duration-300
             ${focusIndex === RESET_BUTTON_INDEX ? 'tv-focus bg-red-900/80 border-red-500 text-white' : 'text-red-400/70'}
          `}
        >
           <span className="text-xs font-bold uppercase tracking-widest">Clear History</span>
        </div>
      </div>

    </div>
  );
};