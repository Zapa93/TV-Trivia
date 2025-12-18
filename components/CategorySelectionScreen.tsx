import React, { useState } from 'react';
import { TriviaCategory } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';

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
  
  // Music (iTunes Custom)
  { id: 'music_2010s', name: '2010s Hits', emoji: '📱' },
  { id: 'music_2000s', name: '2000s Hits', emoji: '💿' },
  { id: 'music_90s', name: '90s Hits', emoji: '📼' },
  { id: 'music_80s', name: '80s Hits', emoji: '🕺' },
  { id: 'music_rock', name: 'Rock Classics', emoji: '🎸' },
  { id: 'music_hiphop', name: 'Hip Hop/R&B', emoji: '🎤' },
  { id: 'music_movies', name: 'Movie Themes', emoji: '🍿' }
];

export const CategorySelectionScreen: React.FC<CategorySelectionScreenProps> = ({ onStartGame, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);

  const GRID_COLS = 4;
  const TOTAL_CATS = AVAILABLE_CATEGORIES.length;
  const START_BUTTON_INDEX = TOTAL_CATS;

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

  const isValid = selectedIds.length >= 4 && selectedIds.length <= 6;

  useTVNavigation({
    onUp: () => {
      if (focusIndex === START_BUTTON_INDEX) {
        setFocusIndex(TOTAL_CATS - Math.floor(GRID_COLS / 2));
      } else if (focusIndex >= GRID_COLS) {
        setFocusIndex(prev => prev - GRID_COLS);
      }
    },
    onDown: () => {
      if (focusIndex < TOTAL_CATS - GRID_COLS) {
        setFocusIndex(prev => prev + GRID_COLS);
      } else if (focusIndex < TOTAL_CATS) {
        setFocusIndex(START_BUTTON_INDEX);
      }
    },
    onLeft: () => {
      if (focusIndex === START_BUTTON_INDEX) return;
      if (focusIndex % GRID_COLS !== 0) setFocusIndex(prev => prev - 1);
    },
    onRight: () => {
      if (focusIndex === START_BUTTON_INDEX) return;
      if ((focusIndex + 1) % GRID_COLS !== 0) setFocusIndex(prev => prev + 1);
    },
    onEnter: () => {
      if (focusIndex === START_BUTTON_INDEX) {
        if (isValid) {
          const selectedCats = AVAILABLE_CATEGORIES.filter(c => selectedIds.includes(c.id));
          onStartGame(selectedCats);
        }
      } else {
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
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden text-white z-10">
      
      <div className="mb-8 text-center animate-zoom-in">
        <h2 className="text-5xl font-black tracking-tight mb-2 drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
          Choose Your Destiny
        </h2>
        <div className="flex items-center justify-center space-x-3 mt-4">
          <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-2">
            <span className={`text-2xl font-mono font-bold ${isValid ? 'text-magic-cyan' : 'text-gray-400'}`}>
              {selectedIds.length} / 6
            </span>
            <span className="text-xs text-gray-300 uppercase tracking-widest font-semibold">Categories (Min 4)</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4 mb-10 w-full max-w-6xl px-8 h-[60vh] overflow-y-auto p-4 hide-scrollbar">
        {AVAILABLE_CATEGORIES.map((cat, idx) => {
          const isSelected = selectedIds.includes(cat.id);
          const isFocused = focusIndex === idx;
          const isMusic = cat.id.startsWith('music_');

          // Styles based on Type
          let baseColor = isMusic 
            ? 'bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 border-fuchsia-500/30' // Music Base
            : 'bg-card-gradient border-white/10'; // Trivia Base

          if (isSelected) {
            baseColor = isMusic 
              ? 'bg-gradient-to-br from-fuchsia-600 to-purple-700 border-white text-white shadow-glow'
              : 'bg-gradient-to-br from-indigo-600 to-blue-700 border-magic-cyan text-white shadow-glow-strong';
          }

          return (
            <div
              key={cat.id}
              className={`
                h-28 flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 relative overflow-hidden
                ${baseColor}
                ${!isSelected && 'text-gray-400 opacity-90'}
                ${isFocused 
                  ? 'tv-focus z-10 !opacity-100 scale-105' 
                  : ''
                }
              `}
            >
              {isSelected && <div className="absolute inset-0 bg-white/10 animate-pulse-fast"></div>}
              
              <span className="text-4xl mb-2 drop-shadow-lg transform transition-transform duration-300 group-hover:scale-110">{cat.emoji}</span>
              <span className="text-sm font-bold uppercase tracking-wide text-center px-2 leading-tight drop-shadow-md">
                {cat.name}
              </span>
              
              {/* Type Badge */}
              {isMusic && (
                 <div className="absolute top-2 left-2 text-[10px] font-bold bg-fuchsia-500 text-white px-1.5 rounded-sm shadow-sm">MUSIC</div>
              )}

              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-white/50"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <div 
        className={`
          px-16 py-5 rounded-full border-2 transition-all duration-300 flex items-center space-x-4
          ${focusIndex === START_BUTTON_INDEX ? 'tv-focus scale-110' : ''}
          ${isValid 
            ? 'bg-gradient-to-r from-magic-cyan to-blue-600 text-white border-white/50 shadow-neon-blue cursor-pointer' 
            : 'bg-gray-900/50 text-gray-500 border-gray-700/50'
          }
        `}
      >
        <span className="font-black tracking-[0.2em] uppercase text-xl">BEGIN GAME</span>
        {isValid && <span className="bg-white text-blue-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg">OK</span>}
      </div>
    </div>
  );
};