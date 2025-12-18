import React, { useState, useEffect } from 'react';
import { CategoryColumn, ProcessedQuestion, Player } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';

interface GameBoardProps {
  categories: CategoryColumn[];
  players: Player[];
  currentPlayerIndex: number;
  onQuestionSelect: (question: ProcessedQuestion) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  categories, 
  players, 
  currentPlayerIndex, 
  onQuestionSelect 
}) => {
  const [focus, setFocus] = useState<[number, number]>([0, 0]);

  useTVNavigation({
    onUp: () => setFocus(([c, r]) => [c, Math.max(0, r - 1)]),
    onDown: () => setFocus(([c, r]) => [c, Math.min(4, r + 1)]),
    onLeft: () => setFocus(([c, r]) => [Math.max(0, c - 1), r]),
    onRight: () => setFocus(([c, r]) => [Math.min(categories.length - 1, c + 1), r]),
    onEnter: () => {
      const [c, r] = focus;
      const question = categories[c].questions[r];
      if (!question.isAnswered) {
        onQuestionSelect(question);
      }
    }
  }, [focus, categories]);

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="h-screen w-screen flex flex-col p-8 box-border">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center space-x-2">
           <div className="w-3 h-3 bg-lg-red rounded-full shadow-neon-red"></div>
           <div className="text-xl font-bold tracking-wider text-gray-300">OLED TRIVIA</div>
        </div>
        
        <div className="glass-panel px-8 py-2 rounded-full flex items-center space-x-4">
          <span className="text-sm uppercase tracking-widest text-gray-400">Current Turn</span>
          <span className="text-2xl font-black text-lg-yellow drop-shadow-md">{currentPlayer.name}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-6 gap-3 lg:gap-5 perspective-1000">
        {categories.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-3 lg:gap-4">
            {/* Category Header */}
            <div className="glass-panel bg-blue-900/20 h-24 flex items-center justify-center text-center rounded-xl p-2 border-b-4 border-blue-500/50">
              <h3 className="font-bold text-xs lg:text-sm leading-tight uppercase tracking-wider text-blue-100 drop-shadow-sm">
                {col.title}
              </h3>
            </div>

            {/* Question Cells */}
            {col.questions.map((q, rIdx) => {
              const isFocused = focus[0] === cIdx && focus[1] === rIdx;
              
              return (
                <div 
                  key={q.id}
                  className={`
                    flex-1 flex items-center justify-center rounded-xl border transition-all duration-200 relative
                    ${q.isAnswered 
                      ? 'bg-black/40 border-white/5 text-gray-800' 
                      : 'glass-panel text-lg-yellow border-white/10'
                    }
                    ${isFocused ? 'tv-focus' : 'hover:border-white/20'}
                  `}
                >
                  {q.isAnswered ? (
                    <span className="text-3xl font-mono opacity-10 font-black">-</span>
                  ) : (
                    <span className={`font-mono font-bold text-3xl lg:text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isFocused ? 'text-white' : ''}`}>
                      ${q.pointValue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="mt-6 flex justify-center space-x-6">
        {players.map((p, idx) => (
          <div 
            key={p.id} 
            className={`
               glass-panel px-8 py-3 rounded-2xl border-t transition-all duration-300
               flex flex-col items-center min-w-[140px]
               ${idx === currentPlayerIndex 
                 ? 'bg-white/10 border-lg-yellow/50 shadow-glow-gold transform -translate-y-2' 
                 : 'border-white/5 opacity-70'}
            `}
          >
            <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${idx === currentPlayerIndex ? 'text-lg-yellow' : 'text-gray-400'}`}>
              {p.name}
            </span>
            <span className={`text-3xl font-mono font-black ${p.score < 0 ? 'text-lg-red' : 'text-white'}`}>
              ${p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};