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
    <div className="fixed inset-0 z-50 flex flex-col animate-zoom-in backdrop-blur-3xl bg-black/80">
      
      {/* Correct Answer Flash Overlay */}
      {showResult && selectedIdx === correctIndex && (
         <div className="absolute inset-0 bg-green-500/20 z-0 animate-pulse-fast pointer-events-none"></div>
      )}

      {/* Header */}
      <div className="p-8 flex justify-between items-end border-b border-white/10 bg-black/40 z-10">
        <div className="flex flex-col">
          <span className="text-lg-yellow font-bold tracking-[0.2em] uppercase mb-1 shadow-black drop-shadow-md">{question.category}</span>
          <span className="text-gray-400 text-sm uppercase tracking-wide">{question.difficulty}</span>
        </div>
        <div className="text-6xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          ${question.pointValue}
        </div>
      </div>

      {/* Question Body */}
      <div className="flex-1 flex items-center justify-center p-12 text-center z-10">
        <div className="glass-panel p-10 rounded-3xl max-w-5xl bg-black/20 border-white/5">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white drop-shadow-xl">
            {question.question}
          </h2>
        </div>
      </div>

      {/* Answers Grid */}
      <div className="p-8 pb-12 z-10">
        <div className="grid grid-cols-2 gap-6 max-w-6xl mx-auto">
          {question.all_answers.map((ans, idx) => {
            const config = colors[idx];
            
            // Determine styles based on state
            let containerClass = "glass-panel border-l-8 text-gray-200 opacity-90";
            let borderColor = config.border;

            if (showResult) {
               if (idx === correctIndex) {
                 // Correct
                 containerClass = "bg-green-600/90 text-white border-l-8 border-white scale-105 shadow-[0_0_50px_rgba(0,230,118,0.6)]";
                 borderColor = "border-white";
               } else if (idx === selectedIdx) {
                 // Wrong
                 containerClass = "bg-red-600/90 text-white border-l-8 border-white opacity-80";
                 borderColor = "border-white";
               } else {
                 // Inactive
                 containerClass = "bg-black/60 opacity-20 border-gray-800 text-gray-600";
                 borderColor = "border-gray-800";
               }
            } else if (selectedIdx === idx) {
               // Pressed state
               containerClass = "bg-white/20 border-white text-white";
            }

            // Animation class
            const animClass = (shakeIdx === idx) ? 'animate-shake' : '';

            return (
              <div 
                key={idx}
                className={`
                  relative h-28 md:h-36 rounded-r-2xl flex items-center px-8 transition-all duration-300
                  ${containerClass} ${borderColor} ${animClass}
                `}
              >
                {/* Color Button Indicator */}
                <div className={`
                    absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-4 border-black/50 shadow-lg flex items-center justify-center
                    ${config.bg} ${config.shadow} z-20
                `}>
                </div>

                <span className="text-xl md:text-3xl font-semibold ml-6 drop-shadow-sm leading-snug">{ans}</span>
              </div>
            );
          })}
        </div>
        
        {/* Instructions */}
        {!showResult && (
           <div className="flex justify-center mt-10 space-x-12 text-gray-400 text-sm uppercase tracking-[0.2em] font-bold">
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