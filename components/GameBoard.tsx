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
    <div className="h-screen w-screen flex flex-col p-8 box-border z-10">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300 drop-shadow-md">
          TRIVIA
        </h1>
        
        <div className="glass-panel px-8 py-2 rounded-full flex items-center space-x-4 bg-black/20 border-white/20">
          <span className="text-xs uppercase tracking-widest text-purple-200">Current Turn</span>
          <span className="text-2xl font-black text-magic-cyan drop-shadow-md">{currentPlayer.name}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div 
        className="flex-1 grid gap-4 lg:gap-6 perspective-1000"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {categories.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-4">
            {/* Category Header */}
            <div className="glass-panel bg-gradient-to-b from-indigo-900/60 to-purple-900/60 h-20 flex items-center justify-center text-center rounded-2xl p-3 border-b-4 border-indigo-500/30 shadow-lg">
              <h3 className="font-bold text-xs lg:text-sm leading-tight uppercase tracking-wider text-white drop-shadow-md">
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
                    flex-1 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 relative overflow-hidden
                    ${q.isAnswered 
                      ? 'bg-black/20 border-white/5' 
                      : 'bg-card-gradient border-white/10 text-magic-cyan'
                    }
                    ${isFocused ? 'tv-focus' : 'hover:border-white/30'}
                  `}
                >
                  {q.isAnswered ? (
                    <span className="text-4xl opacity-10 grayscale">💎</span>
                  ) : (
                    <>
                      {isFocused && <div className="absolute inset-0 bg-magic-cyan/10 animate-pulse-fast"></div>}
                      <span className={`font-mono font-black text-3xl lg:text-5xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] ${isFocused ? 'text-white' : ''}`}>
                        ${q.pointValue}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="mt-8 flex justify-center space-x-8">
        {players.map((p, idx) => (
          <div 
            key={p.id} 
            className={`
               glass-panel px-10 py-4 rounded-3xl border-t transition-all duration-300
               flex flex-col items-center min-w-[160px]
               ${idx === currentPlayerIndex 
                 ? 'bg-gradient-to-b from-white/10 to-transparent border-magic-cyan shadow-glow transform -translate-y-2' 
                 : 'border-white/5 bg-black/20 opacity-70'}
            `}
          >
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${idx === currentPlayerIndex ? 'text-magic-cyan' : 'text-gray-400'}`}>
              {p.name}
            </span>
            <span className={`text-4xl font-mono font-black ${p.score < 0 ? 'text-lg-red' : 'text-white'} drop-shadow-md`}>
              ${p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};