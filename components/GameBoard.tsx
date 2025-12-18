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
      <div className="flex justify-between items-center mb-6 px-4 h-16">
        <h1 className="text-4xl font-black italic tracking-tighter text-yellow-400 drop-shadow-[2px_4px_0_rgba(0,0,0,0.8)] transform -skew-x-6">
          TRIVIA NIGHT
        </h1>
        
        {/* Current Player Badge */}
        <div className="px-8 py-2 rounded-xl border-2 border-yellow-400 bg-blue-950 shadow-lg flex items-center space-x-4">
           <span className="text-3xl animate-bounce">{currentPlayer.avatar}</span>
           <div className="flex flex-col items-start">
             <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Current Turn</span>
             <span className="text-xl font-black text-white drop-shadow-md">{currentPlayer.name}</span>
           </div>
        </div>
      </div>

      {/* Main Grid */}
      <div 
        className="flex-1 grid gap-4 lg:gap-6"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {categories.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-4 h-full">
            {/* Category Header Box - Increased text size */}
            <div className="h-28 rounded-xl border-2 border-yellow-500 bg-blue-900/90 flex items-center justify-center p-2 shadow-lg relative overflow-hidden group">
               {/* Inner glow */}
               <div className="absolute inset-0 bg-gradient-to-b from-blue-800/50 to-transparent"></div>
               <h3 className="relative z-10 font-black text-sm lg:text-xl leading-tight uppercase text-yellow-400 text-center break-words w-full drop-shadow-md line-clamp-3">
                 {col.title}
               </h3>
            </div>

            {/* Questions Column */}
            <div className="flex-1 flex flex-col gap-4">
               {col.questions.map((q, rIdx) => {
                 const isFocused = focus[0] === cIdx && focus[1] === rIdx;
                 return (
                   <div 
                     key={q.id}
                     className={`
                       flex-1 rounded-xl flex items-center justify-center relative shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-200
                       ${q.isAnswered
                         ? 'bg-blue-950/80 border-2 border-white/5 opacity-50'
                         : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                       }
                       ${isFocused 
                          ? 'scale-105 z-20 ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] brightness-110'
                          : 'hover:brightness-105'
                       }
                     `}
                   >
                     {!q.isAnswered && (
                       <span className={`font-black text-3xl lg:text-5xl text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isFocused ? 'scale-110' : ''}`}>
                         ${q.pointValue}
                       </span>
                     )}
                   </div>
                 )
               })}
            </div>
          </div>
        ))}
      </div>

       {/* Scoreboard */}
       <div className="mt-6 flex justify-center space-x-6 items-end pb-2">
          {players.map((p, idx) => (
             <div 
               key={p.id}
               className={`
                 px-6 py-3 rounded-lg border-2 flex flex-col items-center min-w-[140px] transition-all duration-300
                 ${idx === currentPlayerIndex 
                   ? 'bg-blue-800 border-yellow-400 transform -translate-y-2 shadow-[0_0_20px_rgba(250,204,21,0.4)]' 
                   : 'bg-blue-950/60 border-blue-900 text-gray-400'}
               `}
             >
                <div className="flex items-center space-x-2 text-sm font-bold mb-1 opacity-90">
                  <span className="text-xl">{p.avatar}</span>
                  <span className="uppercase tracking-wider">{p.name}</span>
                </div>
                <span className={`text-3xl font-black ${p.score < 0 ? 'text-red-400' : 'text-white'} drop-shadow-md`}>
                  ${p.score}
                </span>
             </div>
          ))}
       </div>
    </div>
  );
};