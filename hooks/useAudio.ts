import { useRef, useEffect, useCallback, useState } from 'react';

export const useAudio = () => {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  
  // Browser Autoplay Policy: AudioContext is suspended until user interaction
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);

  useEffect(() => {
    // Randomize track 1-4 on mount
    const trackNum = Math.floor(Math.random() * 4) + 1;
    
    // Initialize Music
    const bgAudio = new Audio(`/sounds/bg-music${trackNum}.mp3`);
    bgAudio.loop = true;
    bgAudio.volume = 0.3;
    musicRef.current = bgAudio;

    // Initialize SFX
    correctRef.current = new Audio('/sounds/correct.mp3');
    correctRef.current.volume = 1.0;
    
    wrongRef.current = new Audio('/sounds/wrong.mp3');
    wrongRef.current.volume = 1.0;

    return () => {
      bgAudio.pause();
      musicRef.current = null;
    };
  }, []);

  // Effect to handle actual playback based on enabled state and logic state
  useEffect(() => {
    if (musicRef.current) {
      if (audioEnabled && shouldPlayMusic) {
        // Try/Catch for any lingering autoplay blocks
        const playPromise = musicRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Audio Playback prevented:", error);
            });
        }
      } else {
        musicRef.current.pause();
      }
    }
  }, [audioEnabled, shouldPlayMusic]);

  // Called on first user interaction (e.g., clicking Next in Setup)
  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      
      // Optional: Play a silent sound or resume context if using Web Audio API
      // For simple HTML5 Audio, flipping the state is usually enough if triggered by event
    }
  }, [audioEnabled]);

  const playMusic = useCallback(() => {
    setShouldPlayMusic(true);
  }, []);

  const stopMusic = useCallback(() => {
    setShouldPlayMusic(false);
    if (musicRef.current) {
        musicRef.current.currentTime = 0;
    }
  }, []);

  const playCorrect = useCallback(() => {
    if (correctRef.current && audioEnabled) {
      correctRef.current.currentTime = 0;
      correctRef.current.play().catch(e => console.warn("SFX blocked:", e));
    }
  }, [audioEnabled]);

  const playWrong = useCallback(() => {
    if (wrongRef.current && audioEnabled) {
      wrongRef.current.currentTime = 0;
      wrongRef.current.play().catch(e => console.warn("SFX blocked:", e));
    }
  }, [audioEnabled]);

  return { 
    enableAudio, 
    playMusic, 
    stopMusic, 
    playCorrect, 
    playWrong 
  };
};