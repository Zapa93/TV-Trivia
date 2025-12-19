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
  
  // Reveal Mode States (Used for Audio & Honor System)
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Timers
  const TIMER_DURATION = question.timerDuration || (question.mediaType === 'text' ? 20 : 15);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  
  // Secondary Timer (Audio Guessing Phase)
  const GUESS_LIMIT = 15;
  const [guessingTime, setGuessingTime] = useState(GUESS_LIMIT);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Checks
  const isMovieRound = question.category === 'Movie & TV Soundtrack';
  const isMultipleChoice = question.type === 'multiple' || question.type === 'text';
  const isHonorSystem = question.type === 'honor-system' || question.type === 'music';
  
  const isImageSequence = question.mediaType === 'image_sequence';

  // --- AUDIO MODE LOGIC ---
  useEffect(() => {
    if (question.mediaType === 'audio' && question.audioUrl) {
      const audio = new Audio(question.audioUrl);
      audio.volume = 0.8;
      audioRef.current = audio;

      audio.onended = () => {
        setTimeLeft(0);
      };

      audio.play().catch(e => console.warn("Preview play blocked", e));
      
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
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

  // Secondary Timer for Audio
  useEffect(() => {
    if (question.mediaType === 'audio' && timeLeft <= 0 && !isRevealed) {
      // STOP MUSIC HERE: Ensure music stops exactly when the first timer ends
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const interval = setInterval(() => {
        setGuessingTime(prev => {
          if (prev <= 1) {
             clearInterval(interval);
             handleReveal(); 
             return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [question.mediaType, timeLeft, isRevealed]);

  // --- IMAGE / HONOR SYSTEM TIMER ---
  useEffect(() => {
    if ((question.mediaType === 'image' || isImageSequence) && isHonorSystem && !isRevealed) {
       const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleReveal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [question.mediaType, isRevealed, isHonorSystem, isImageSequence]);

  // --- MULTIPLE CHOICE TIMER (Text & Movie Posters) ---
  useEffect(() => {
    if (isMultipleChoice && !showResult) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTextTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isMultipleChoice, showResult]);


  const handleReveal = () => {
    setIsRevealed(true);
    if (audioRef.current) {
        audioRef.current.pause();
    }
  };

  const handleRevealScore = (multiplier: number) => {
     if (multiplier === 0) playWrong();
     else playCorrect();

     onAnswer(multiplier);
  };

  const correctIndex = question.all_answers.indexOf(question.correct_answer);

  const handleTextTimeout = () => {
    setShowResult(true);
    playWrong();
    setTimeout(() => {
      onAnswer(0); // Fail
    }, 3000);
  };

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

  // Navigation Logic
  useTVNavigation({
    onRed: () => {
      if (isMultipleChoice) handleTextSelection(0);
      else if (isRevealed) handleRevealScore(0); 
    },
    onGreen: () => {
      if (isMultipleChoice) handleTextSelection(1);
      else if (isRevealed) handleRevealScore(1); 
    },
    onYellow: () => {
      if (isMultipleChoice) handleTextSelection(2);
      else if (isRevealed && !isMovieRound) handleRevealScore(0.5); 
    },
    onBlue: () => {
      if (isMultipleChoice) handleTextSelection(3);
    },
    onEnter: () => {
      if (isHonorSystem && !isRevealed) handleReveal();
    }
  }, [showResult, isRevealed, question, isMovieRound, isMultipleChoice, isHonorSystem]);

  // --- RENDER ---

  const colors = [
    { name: 'Red', bg: 'bg-lg-red', shadow: 'shadow-neon-red', border: 'border-lg-red' },
    { name: 'Green', bg: 'bg-lg-green', shadow: 'shadow-neon-green', border: 'border-lg-green' },
    { name: 'Yellow', bg: 'bg-lg-yellow', shadow: 'shadow-neon-yellow', border: 'border-lg-yellow' },
    { name: 'Blue', bg: 'bg-lg-blue', shadow: 'shadow-neon-blue', border: 'border-lg-blue' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-zoom-in backdrop-blur-xl bg-indigo-950/80">
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/50 pointer-events-none"></div>

      {/* Correct Answer Flash (Multiple Choice) */}
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

      {/* ---------------- AUDIO MODE ---------------- */}
      {question.mediaType === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 p-12">
           
           <div className={`
              w-64 h-64 rounded-full border-8 border-gray-900 bg-black relative shadow-2xl flex items-center justify-center mb-8
              ${!isRevealed && timeLeft > 0 ? 'animate-spin' : ''}
           `} style={{ animationDuration: '3s' }}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-magic-pink to-purple-600 border-4 border-white/20 flex items-center justify-center">
                 <span className="text-2xl">🎵</span>
              </div>
           </div>

           {!isRevealed && timeLeft > 0 && (
             <div className="w-96 h-4 bg-gray-700 rounded-full mb-8 overflow-hidden border border-white/20">
                <div 
                   className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-1000 ease-linear"
                   style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
                ></div>
             </div>
           )}

           {!isRevealed && timeLeft <= 0 && (
             <div className="w-96 h-4 bg-gray-700 rounded-full mb-8 overflow-hidden border border-white/20">
                <div 
                   className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000 ease-linear"
                   style={{ width: `${(guessingTime / GUESS_LIMIT) * 100}%` }}
                ></div>
             </div>
           )}

           {!isRevealed ? (
             <div className="text-center">
               <h2 className="text-4xl font-black text-white mb-4 tracking-widest animate-pulse">
                 {timeLeft > 0 ? "LISTENING..." : `GUESS NOW: ${guessingTime}s`}
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
                  {isMovieRound && (
                    <span className="block text-xs uppercase tracking-widest text-gray-400 mb-1">Movie / Show</span>
                  )}
                  <h2 className="text-4xl font-black text-magic-cyan mb-2 drop-shadow-md">
                    {question.answerReveal?.title}
                  </h2>
                  <h3 className="text-2xl font-semibold text-white/80">
                    {question.answerReveal?.artist}
                  </h3>
               </div>
               
               <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-6">Rate Your Answer</p>
               
               <div className="flex justify-center gap-6">
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-red shadow-neon-red flex items-center justify-center text-2xl mb-2">❌</div>
                    <span className="font-bold text-red-400">0%</span>
                 </div>
                 
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

      {/* ---------------- VISUAL LAYOUTS (Image & Sequences) ---------------- */}
      {(question.mediaType === 'image' || isImageSequence) && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 p-4">
           
           {/* IMAGE SEQUENCE (Career Path) */}
           {isImageSequence && question.imageUrls && (
             <div className="w-full max-w-[90vw] mb-8 overflow-x-auto p-4 flex items-center justify-start space-x-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm mx-auto">
               {question.imageUrls.map((url, idx) => (
                 <React.Fragment key={idx}>
                   <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-white p-2 rounded-full shadow-lg flex items-center justify-center">
                     <img src={url} alt="Club Logo" className="object-contain w-full h-full" />
                   </div>
                   {idx < question.imageUrls!.length - 1 && (
                     <div className="text-5xl text-yellow-400 opacity-80 flex-shrink-0 font-bold">→</div>
                   )}
                 </React.Fragment>
               ))}
             </div>
           )}

           {/* SINGLE IMAGE */}
           {question.mediaType === 'image' && (
              <div className={`relative rounded-lg overflow-hidden shadow-2xl border-4 border-white/20 max-w-4xl ${isMultipleChoice ? 'max-h-[35vh] mb-6' : 'max-h-[45vh] mb-8'}`}>
                  {question.imageUrl && (
                    <img src={question.imageUrl} alt="Visual" className="object-contain h-full w-full" style={{ maxHeight: 'inherit' }} />
                  )}
              </div>
           )}

           {/* Context Text (e.g. Country Name or Movie Title) */}
           {question.infoText && !isRevealed && !showResult && (
             <div className="mb-6 text-2xl font-bold text-yellow-400 drop-shadow-md bg-black/60 px-6 py-2 rounded-full border border-yellow-400/30">
               {question.infoText}
             </div>
           )}

           {/* Timer Bar */}
           {!isRevealed && !showResult && (
             <div className="w-96 h-3 bg-gray-700 rounded-full mb-6 overflow-hidden border border-white/20">
                <div 
                   className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-1000 ease-linear"
                   style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
                ></div>
             </div>
           )}

           {/* ---- HONOR SYSTEM REVEAL (Geo Flags/Capitals/Career) ---- */}
           {isHonorSystem && !isRevealed && (
             <div className="text-center">
               <h2 className="text-4xl font-black text-white mb-4 tracking-widest animate-pulse">
                 {question.question}
               </h2>
               <div className="mt-4 bg-white/20 px-8 py-3 rounded-full inline-block border border-white/20">
                 Press <span className="font-bold text-white">OK</span> to Reveal
               </div>
             </div>
           )}

           {isHonorSystem && isRevealed && (
             <div className="text-center animate-zoom-in">
               <div className="glass-panel p-6 rounded-2xl border-emerald-500 mb-6 min-w-[500px]">
                  {question.infoText && (
                    <div className="text-xl text-gray-300 mb-2">{question.infoText}</div>
                  )}
                  <h2 className="text-5xl font-black text-emerald-400 mb-2 drop-shadow-md">
                    {question.answerReveal?.title}
                  </h2>
                  <h3 className="text-xl font-semibold text-white/60 uppercase tracking-widest">
                    {question.answerReveal?.artist}
                  </h3>
               </div>
               
               <div className="flex justify-center gap-6">
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-red shadow-neon-red flex items-center justify-center text-2xl mb-2">❌</div>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-yellow shadow-neon-yellow flex items-center justify-center text-2xl mb-2">⚖️</div>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-lg-green shadow-neon-green flex items-center justify-center text-2xl mb-2">✅</div>
                 </div>
               </div>
             </div>
           )}

           {/* ---- MULTIPLE CHOICE (Movie Posters / Text) ---- */}
           {isMultipleChoice && (
              <>
                 <h2 className="text-3xl font-black text-white mb-6 drop-shadow-md">{question.question}</h2>
                 <div className="grid grid-cols-2 gap-6 w-full max-w-5xl px-8">
                    {question.all_answers.map((ans, idx) => {
                      const config = colors[idx];
                      let containerClass = "glass-panel border-l-8 text-white/90";
                      let borderColor = config.border;
                      
                      if (showResult) {
                         if (idx === correctIndex) {
                           containerClass = "bg-gradient-to-r from-green-600 to-green-500 text-white border-l-8 border-white shadow-neon-green";
                           borderColor = "border-white";
                         } else if (idx === selectedIdx) {
                           containerClass = "bg-red-600/80 text-white border-l-8 border-white opacity-80";
                         } else {
                           containerClass = "bg-black/40 opacity-30 border-gray-700 text-gray-500";
                         }
                      } else if (selectedIdx === idx) {
                         containerClass = "bg-white/20 border-white text-white";
                      } else {
                          containerClass += " hover:bg-white/10";
                      }

                      return (
                        <div key={idx} className={`relative h-20 rounded-r-2xl flex items-center px-6 transition-all duration-300 ${containerClass} ${borderColor}`}>
                           <div className={`absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center ${config.bg} ${config.shadow}`}>
                           </div>
                           <span className="text-2xl font-bold ml-4">{ans}</span>
                        </div>
                      );
                    })}
                 </div>
              </>
           )}
        </div>
      )}


      {/* ---------------- TEXT ONLY LAYOUT ---------------- */}
      {question.mediaType === 'text' && (
        <>
          {!showResult && (
             <div className="w-full h-2 bg-gray-800 fixed top-0 left-0 z-50">
               <div 
                 className="h-full bg-gradient-to-r from-red-500 to-yellow-400 transition-all duration-1000 ease-linear"
                 style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
               ></div>
             </div>
          )}

          <div className="flex-1 flex items-center justify-center p-12 text-center z-10">
            <div className="glass-panel p-12 rounded-[2rem] max-w-6xl bg-gradient-to-br from-white/10 to-transparent border-white/20 shadow-2xl">
              {showResult && timeLeft <= 0 && selectedIdx === null && (
                 <div className="text-red-500 font-black text-4xl mb-4 animate-bounce">TIME'S UP!</div>
              )}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-md">
                {question.question}
              </h2>
            </div>
          </div>

          <div className="p-8 pb-12 z-10">
            <div className="grid grid-cols-2 gap-8 max-w-7xl mx-auto">
              {question.all_answers.map((ans, idx) => {
                const config = colors[idx];
                let containerClass = "glass-panel border-l-8 text-white/90";
                let borderColor = config.border;
                
                if (showResult) {
                   if (idx === correctIndex) {
                     containerClass = "bg-gradient-to-r from-green-600 to-green-500 text-white border-l-8 border-white shadow-neon-green";
                     borderColor = "border-white";
                   } else if (idx === selectedIdx) {
                     containerClass = "bg-red-600/80 text-white border-l-8 border-white opacity-80";
                   } else {
                     containerClass = "bg-black/40 opacity-30 border-gray-700 text-gray-500";
                   }
                } else if (selectedIdx === idx) {
                   containerClass = "bg-white/20 border-white text-white";
                } else {
                    containerClass += " hover:bg-white/10";
                }

                return (
                  <div key={idx} className={`relative h-32 md:h-40 rounded-r-3xl flex items-center px-10 transition-all duration-300 ${containerClass} ${borderColor}`}>
                    <div className={`absolute -left-7 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 border-white/20 shadow-xl flex items-center justify-center ${config.bg} ${config.shadow}`}></div>
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