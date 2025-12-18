import React, { useState } from 'react';
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
  const colCount = categories.length;

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
    <div className="h-screen w-screen flex flex-col p-6 box-border z-10">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 px-4 h-16">
        <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300 drop-shadow-md">
          TRIVIA
        </h1>
        
        <div className="glass-panel px-6 py-2 rounded-full flex items-center space-x-3 bg-black/20 border-white/20">
          <span className="text-xs uppercase tracking-widest text-purple-200">Current Turn</span>
          <span className="text-2xl animate-pulse">{currentPlayer.avatar}</span>
          <span className="text-xl font-black text-magic-cyan drop-shadow-md">{currentPlayer.name}</span>
        </div>
      </div>

      {/* Main Grid 
          Using grid-flow-col or just dynamic columns. 
          The structure is: One column div per category, containing a header + 5 questions.
          This ensures the visual 'ladder' for each category.
      */}
      <div 
        className="flex-1 grid gap-4 lg:gap-5"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {categories.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-3 h-full">
            {/* Category Header */}
            <div className="glass-panel bg-gradient-to-b from-indigo-900/60 to-purple-900/60 h-24 flex items-center justify-center text-center rounded-2xl p-2 border-b-4 border-indigo-500/30 shadow-lg">
              <h3 className="font-bold text-xs lg:text-sm leading-tight uppercase tracking-wider text-white drop-shadow-md break-words w-full">
                {col.title}
              </h3>
            </div>

            {/* Question Cells Container - Flex Column to fill space */}
            <div className="flex-1 flex flex-col gap-3">
              {col.questions.map((q, rIdx) => {
                const isFocused = focus[0] === cIdx && focus[1] === rIdx;
                
                return (
                  <div 
                    key={q.id}
                    className={`
                      flex-1 flex items-center justify-center rounded-2xl border-2 transition-all duration-200 relative overflow-hidden
                      ${q.isAnswered 
                        ? 'bg-black/20 border-white/5 opacity-50' 
                        : 'bg-card-gradient border-white/10 text-magic-cyan'
                      }
                      ${isFocused ? 'tv-focus z-20 scale-105 shadow-glow-strong' : 'hover:border-white/30'}
                    `}
                  >
                    {q.isAnswered ? (
                      <span className="text-2xl opacity-20 grayscale">✓</span>
                    ) : (
                      <>
                        {isFocused && <div className="absolute inset-0 bg-magic-cyan/10 animate-pulse-fast"></div>}
                        <span className={`font-mono font-black text-2xl lg:text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isFocused ? 'text-white' : ''}`}>
                          ${q.pointValue}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="mt-4 h-24 flex justify-center space-x-6 items-end pb-2">
        {players.map((p, idx) => (
          <div 
            key={p.id} 
            className={`
               glass-panel px-6 py-2 rounded-2xl border-t transition-all duration-300
               flex flex-col items-center min-w-[120px]
               ${idx === currentPlayerIndex 
                 ? 'bg-gradient-to-b from-white/10 to-transparent border-magic-cyan shadow-glow transform -translate-y-2' 
                 : 'border-white/5 bg-black/20 opacity-70'}
            `}
          >
            <div className="flex items-center space-x-2 mb-1">
               <span className="text-2xl">{p.avatar}</span>
               <span className={`text-[10px] font-bold uppercase tracking-widest ${idx === currentPlayerIndex ? 'text-magic-cyan' : 'text-gray-400'}`}>
                 {p.name}
               </span>
            </div>
            <span className={`text-3xl font-mono font-black ${p.score < 0 ? 'text-lg-red' : 'text-white'} drop-shadow-md`}>
              ${p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};