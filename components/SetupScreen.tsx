import React, { useState } from 'react';
import { useTVNavigation } from '../hooks/useTVNavigation';

interface SetupScreenProps {
  onStartGame: (playerCount: number) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState(1);
  const [isFocused, setIsFocused] = useState(true);

  useTVNavigation({
    onLeft: () => setPlayerCount(prev => Math.max(1, prev - 1)),
    onRight: () => setPlayerCount(prev => Math.min(4, prev + 1)),
    onEnter: () => onStartGame(playerCount),
  }, [playerCount]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Title with heavy shadow/glow */}
      <div className="mb-16 text-center animate-float">
        <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          OLED TRIVIA
        </h1>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-lg-yellow to-transparent mt-2 opacity-80 shadow-glow-gold"></div>
      </div>

      <div className="glass-panel p-12 rounded-3xl border border-white/10 flex flex-col items-center space-y-10 w-full max-w-2xl backdrop-blur-xl shadow-2xl">
        <h2 className="text-xl text-blue-200 uppercase tracking-[0.2em] font-bold">Select Contenders</h2>
        
        <div className="flex items-center space-x-12">
          {/* Main Number Display */}
          <div className={`
             transition-all duration-300 w-48 h-48 rounded-full border-4
             flex items-center justify-center relative
             ${isFocused ? 'border-lg-yellow bg-white/5 shadow-glow-gold scale-110' : 'border-gray-700 bg-black/40'}
          `}>
             <span className="text-9xl font-black font-mono text-white drop-shadow-md">{playerCount}</span>
             
             {/* Decor arrows */}
             {isFocused && (
               <>
                <div className="absolute -left-16 text-4xl text-lg-yellow animate-pulse">◀</div>
                <div className="absolute -right-16 text-4xl text-lg-yellow animate-pulse">▶</div>
               </>
             )}
          </div>
        </div>

        {/* Player Dots */}
        <div className="flex space-x-4 mt-4">
          {[1, 2, 3, 4].map(n => (
            <div 
              key={n} 
              className={`h-4 w-4 rounded-full transition-all duration-300 ${n <= playerCount ? 'bg-lg-blue shadow-neon-blue scale-125' : 'bg-gray-800'}`} 
            />
          ))}
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm tracking-widest uppercase">
          <p>Press <span className="text-lg-green font-bold glow">OK</span> to Initialize</p>
        </div>
      </div>
    </div>
  );
};