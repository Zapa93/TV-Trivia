import React, { useState } from 'react';
import { ProcessedQuestion } from '../types';
import { useTVNavigation } from '../hooks/useTVNavigation';

interface QuestionScreenProps {
  question: ProcessedQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onBack?: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({ question, onAnswer, onBack }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);

  const correctIndex = question.all_answers.indexOf(question.correct_answer);

  const handleSelection = (idx: number) => {
    if (showResult) return;
    
    setSelectedIdx(idx);
    setShowResult(true);

    const isCorrect = idx === correctIndex;

    if (!isCorrect) {
      setShakeIdx(idx);
    }
    
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 2500);
  };

  useTVNavigation({
    onRed: () => handleSelection(0),
    onGreen: () => handleSelection(1),
    onYellow: () => handleSelection(2),
    onBlue: () => handleSelection(3),
    onBack: () => { /* Optional */ }
  }, [showResult]);

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

      {/* Correct Answer Flash */}
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

      {/* Question Body */}
      <div className="flex-1 flex items-center justify-center p-12 text-center z-10">
        <div className="glass-panel p-12 rounded-[2rem] max-w-6xl bg-gradient-to-br from-white/10 to-transparent border-white/20 shadow-2xl">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-md">
            {question.question}
          </h2>
        </div>
      </div>

      {/* Answers Grid */}
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
                {/* Gem Indicator */}
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
        
        {/* Instructions */}
        {!showResult && (
           <div className="flex justify-center mt-12 space-x-12 text-white/60 text-sm uppercase tracking-[0.2em] font-bold">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-red shadow-neon-red mr-3"></span> Select</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-green shadow-neon-green mr-3"></span> Select</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-yellow shadow-neon-yellow mr-3"></span> Select</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-lg-blue shadow-neon-blue mr-3"></span> Select</div>
           </div>
        )}
      </div>
    </div>
  );
};