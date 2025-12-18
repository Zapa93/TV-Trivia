import React from 'react';
import { Player } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';

interface GameOverProps {
  players: Player[];
  onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ players, onRestart }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  useTVNavigation({
    onEnter: onRestart,
    onBack: onRestart
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center animate-zoom-in">
       <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-lg-yellow to-yellow-600 mb-8 animate-float drop-shadow-sm">
         GAME OVER
       </h1>
       
       <div className="glass-panel-active rounded-3xl p-16 text-center shadow-glow-gold mb-12 border-2 border-lg-yellow/50 relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

          <p className="text-lg-yellow uppercase tracking-[0.3em] mb-6 font-bold">Champion</p>
          <div className="text-8xl font-black text-white mb-4 drop-shadow-md">{winner.name}</div>
          <div className="text-6xl font-mono text-lg-yellow font-bold">${winner.score}</div>
       </div>

       <div className="w-full max-w-3xl space-y-4">
         {sortedPlayers.slice(1).map((p, idx) => (
           <div key={idx} className="flex justify-between items-center glass-panel p-6 rounded-xl border-l-4 border-gray-500">
              <span className="text-2xl text-gray-300 font-bold">#{idx + 2} {p.name}</span>
              <span className="text-2xl font-mono text-white">${p.score}</span>
           </div>
         ))}
       </div>

       <div className="mt-16 bg-white/10 px-8 py-3 rounded-full animate-pulse border border-white/20">
         <span className="text-gray-300 uppercase tracking-widest font-semibold text-sm">Press <span className="text-white font-bold">OK</span> to Play Again</span>
       </div>
    </div>
  );
};