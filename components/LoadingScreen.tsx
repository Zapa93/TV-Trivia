import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="glass-panel p-12 rounded-3xl flex flex-col items-center animate-zoom-in">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-lg-red mb-8 shadow-glow"></div>
        <h2 className="text-3xl font-black tracking-widest animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          PREPARING STAGE
        </h2>
        <p className="mt-4 text-gray-400 uppercase tracking-widest text-sm">Curating questions from the cloud</p>
      </div>
    </div>
  );
};