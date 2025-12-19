import React, { useState, useEffect, useRef } from 'react';
import { ProcessedQuestion } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';

interface QuestionScreenProps {
  question: ProcessedQuestion;
  onAnswer: (scoreMultiplier: number) => void; 
  onBack?: () => void;
  playCorrect: () => void;
  playWrong: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({ 
  question, 
  onAnswer, 
  onBack,
  playCorrect,
  playWrong 
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  
  // Audio Mode States
  const [audioRevealed, setAudioRevealed] = useState(false);
  
  // Timer Init: Use duration from question, default to 15s
  const MAX_TIME = question.timerDuration || 15;
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if it's a Movie/TV round (Strict scoring: No Half Points)
  const isMovieRound = question.category === 'Movie & TV Soundtrack';

  // --- AUDIO MODE LOGIC ---
  useEffect(() => {
    if (question.mediaType === 'audio' && question.audioUrl) {
      const audio = new Audio(question.audioUrl);
      audio.volume = 0.8;
      audioRef.current = audio;

      // Safety: Ensure timer zeros out if track ends early
      audio.onended = () => {
        setTimeLeft(0);
      };

      audio.play().catch(e => console.warn("Preview play blocked", e));
      
      // Start Timer
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nextTime = prev - 1;
          if (nextTime <= 0) {
            clearInterval(interval);
            if (audioRef.current) audioRef.current.pause();
            return 0;
          }
          return nextTime;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [question]);

  const handleAudioReveal = () => {
    setAudioRevealed(true);
    // Stop audio if it hasn't stopped yet
    if (audioRef.current) {
        audioRef.current.pause();
    }
  };

  const handleAudioScore = (multiplier: number) => {
     if (multiplier === 0) playWrong();
     else playCorrect();

     onAnswer(multiplier);
  };

  // --- TEXT MODE LOGIC ---
  const correctIndex = question.all_answers.indexOf(question.correct_answer);

  const handleTextSelection = (idx: number) => {
    if (showResult) return;
    
    setSelectedIdx(idx);
    setShowResult(true);

    const isCorrect = idx === correctIndex;

    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
      setShakeIdx(idx);
    }
    
    setTimeout(() => {
      onAnswer(isCorrect ? 1 : 0);
    }, 2500);
  };

  // Navigation
  useTVNavigation({
    // Standard Red/Green/Yellow/Blue for options
    onRed: () => {
      if (question.mediaType === 'text') handleTextSelection(0);
      else if (audioRevealed) handleAudioScore(0); // Red = Wrong (0pts)
    },
    onGreen: () => {
      if (question.mediaType === 'text') handleTextSelection(1);
      else if (audioRevealed) handleAudioScore(1); // Green = Perfect (100% pts)
    },
    onYellow: () => {
      if (question.mediaType === 'text') handleTextSelection(2);
      // Yellow (Half Points) is disabled for Movie Rounds
      else if (audioRevealed && !isMovieRound) handleAudioScore(0.5); 
    },
    onBlue: () => {
      if (question.mediaType === 'text') handleTextSelection(3);
    },
    onEnter: () => {
      if (question.mediaType === 'audio' && !audioRevealed) handleAudioReveal();
    }
  }, [showResult, audioRevealed, question, isMovieRound]);

  // --- RENDER ---

  const colors = [
    { name: 'Red', bg: 'bg-lg-red', shadow: 'shadow-neon-red', border: 'border-lg-red' },
    { name: 'Green', bg: 'bg-lg-green', shadow: 'shadow-neon-green', border: 'border-lg-green' },
    { name: 'Yellow', bg: 'bg-lg-yellow', shadow: 'shadow-neon-yellow', border: 'border-lg-yellow' },
    { name: 'Blue', bg: 'bg-lg-blue', shadow: 'shadow-neon-blue', border: 'border-lg-blue' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-zoom-in backdrop-blur-xl bg-indigo-950/80">
      
      {/* Background ambient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/50 pointer-events-none"></div>

      {/* Correct Answer Flash (Text Mode) */}
      {showResult && selectedIdx === correctIndex && (
         <div className="absolute inset-0 bg-green-500/20 z-0 animate-pulse-fast pointer-events-none mix-blend-screen"></div>
      )}

      {/* Header */}
      <div className="p-8 flex justify-between items-end border-b border-white/10 bg-black/20 z-10 shadow-lg">
        <div className="flex flex-col">
          <span className="text-magic-cyan font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md text-xl">{question.category}</span>
          <span className="text-purple-200 text-sm uppercase tracking-wide font-semibold">{question.difficulty}</span>
        </div>
        <div className="text-7xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          ${question.pointValue}
        </div>
      </div>

      {/* ---------------- AUDIO MODE LAYOUT ---------------- */}
      {question.mediaType === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 p-12">
           
           {/* Vinyl Animation */}
           <div className={`
              w-64 h-64 rounded-full border-8 border-gray-900 bg-black relative shadow-2xl flex items-center justify-center mb-8
              ${!audioRevealed && timeLeft > 0 ? 'animate-spin' : ''}
           `} style={{ animationDuration: '3s' }}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-magic-pink to-purple-600 border-4 border-white/20 flex items-center justify-center">
                 <span className="text-2xl">🎵</span>
              </div>
           </div>

           {/* Timer Progress */}
           {!audioRevealed && (
             <div className="w-96 h-4 bg-gray-700 rounded-full mb-8 overflow-hidden border border-white/20">
                <div 
                   className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-1000 ease-linear"
                   style={{ width: `${(timeLeft / MAX_TIME) * 100}%` }}
                ></div>
             </div>
           )}

           {/* Question / Status */}
           {!audioRevealed ? (
             <div className="text-center animate-pulse">
               <h2 className="text-4xl font-black text-white mb-4 tracking-widest">
                 {timeLeft > 0 ? "LISTENING..." : "TIME'S UP"}
               </h2>
               <p className="text-xl text-cyan-300">
                  {question.category === 'Movie & TV Soundtrack' ? 'Guess the Movie/Show!' : 'Guess the Song & Artist'}
               </p>
               <div className="mt-8 bg-white/20 px-8 py-3 rounded-full inline-block border border-white/20">
                 Press <span className="font-bold text-white">OK</span> to Reveal
               </div>
             </div>
           ) : (
             <div className="text-center animate-zoom-in">
               <div className="glass-panel p-8 rounded-2xl border-magic-cyan mb-8 min-w-[500px]">
                  {/* Movie Label */}
                  {isMovieRound && (
                    <span className="block text-xs uppercase tracking-widest text-gray-400 mb-1">Movie / Show</span>
                  )}
                  
                  {/* Primary: Song Title (or Track Name for Movies) */}
                  <h2 className="text-4xl font-black text-magic-cyan mb-2 drop-shadow-md">
                    {question.answerReveal?.title}
                  </h2>
                  
                  {/* Secondary: Artist (or Movie Name for Movies) */}
                  <h3 className="text-2xl font-semibold text-white/80">
                    {question.answerReveal?.artist}
                  </h3>
               </div>
               
               <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-6">Rate Your Answer</p>
               
               <div className="flex justify-center gap-6">
                 {/* Scoring Buttons */}
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-red shadow-neon-red flex items-center justify-center text-2xl mb-2">❌</div>
                    <span className="font-bold text-red-400">0%</span>
                 </div>
                 
                 {/* Half Points: Only show if NOT a Movie Round */}
                 {!isMovieRound && (
                   <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-lg-yellow shadow-neon-yellow flex items-center justify-center text-2xl mb-2">⚖️</div>
                      <span className="font-bold text-yellow-400">50%</span>
                   </div>
                 )}

                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-green shadow-neon-green flex items-center justify-center text-2xl mb-2">✅</div>
                    <span className="font-bold text-green-400">100%</span>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}


      {/* ---------------- TEXT MODE LAYOUT ---------------- */}
      {question.mediaType === 'text' && (
        <>
          <div className="flex-1 flex items-center justify-center p-12 text-center z-10">
            <div className="glass-panel p-12 rounded-[2rem] max-w-6xl bg-gradient-to-br from-white/10 to-transparent border-white/20 shadow-2xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-md">
                {question.question}
              </h2>
            </div>
          </div>

          <div className="p-8 pb-12 z-10">
            <div className="grid grid-cols-2 gap-8 max-w-7xl mx-auto">
              {question.all_answers.map((ans, idx) => {
                const config = colors[idx];
                
                // Determine styles
                let containerClass = "glass-panel border-l-8 text-white/90";
                let borderColor = config.border;
                let scaleClass = "";

                if (showResult) {
                   if (idx === correctIndex) {
                     // Correct
                     containerClass = "bg-gradient-to-r from-green-600 to-green-500 text-white border-l-8 border-white shadow-neon-green";
                     borderColor = "border-white";
                     scaleClass = "scale-105 z-20";
                   } else if (idx === selectedIdx) {
                     // Wrong
                     containerClass = "bg-red-600/80 text-white border-l-8 border-white opacity-80";
                     borderColor = "border-white";
                   } else {
                     // Inactive
                     containerClass = "bg-black/40 opacity-30 border-gray-700 text-gray-500";
                     borderColor = "border-gray-700";
                   }
                } else if (selectedIdx === idx) {
                   // Pressed
                   containerClass = "bg-white/20 border-white text-white";
                } else {
                    // Default
                    containerClass += " hover:bg-white/10 transition-colors";
                }

                const animClass = (shakeIdx === idx) ? 'animate-shake' : '';

                return (
                  <div 
                    key={idx}
                    className={`
                      relative h-32 md:h-40 rounded-r-3xl flex items-center px-10 transition-all duration-300
                      ${containerClass} ${borderColor} ${animClass} ${scaleClass}
                    `}
                  >
                    <div className={`
                        absolute -left-7 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 border-white/20 shadow-xl flex items-center justify-center
                        ${config.bg} ${config.shadow} z-20
                    `}>
                      <div className="w-4 h-4 bg-white/50 rounded-full blur-sm"></div>
                    </div>

                    <span className="text-2xl md:text-3xl font-bold ml-6 drop-shadow-md leading-snug">{ans}</span>
                  </div>
                );
              })}
            </div>
            
            {!showResult && (
              <div className="flex justify-center mt-12 space-x-12 text-white/60 text-sm uppercase tracking-[0.2em] font-bold">
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-red shadow-neon-red mr-3"></span> Select</div>
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-green shadow-neon-green mr-3"></span> Select</div>
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-yellow shadow-neon-yellow mr-3"></span> Select</div>
                  <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-blue shadow-neon-blue mr-3"></span> Select</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};