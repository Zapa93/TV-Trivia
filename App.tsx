import React, { useState, useEffect } from 'react';
import { AppState, CategoryColumn, Player, ProcessedQuestion, TriviaCategory } from './types';
import { fetchGameData } from './services/triviaService';
import { LoadingScreen } from './components/LoadingScreen';
import { SetupScreen } from './components/SetupScreen';
import { CategorySelectionScreen } from './components/CategorySelectionScreen';
import { GameBoard } from './components/GameBoard';
import { QuestionScreen } from './components/QuestionScreen';
import { GameOver } from './components/GameOver';

const ANIMAL_PLAYERS = [
  { name: 'Fox', avatar: '🦊' },
  { name: 'Lion', avatar: '🦁' },
  { name: 'Panda', avatar: '🐼' },
  { name: 'Koala', avatar: '🐨' }
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [categories, setCategories] = useState<CategoryColumn[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [activeQuestion, setActiveQuestion] = useState<ProcessedQuestion | null>(null);

  const handlePlayerSetup = (playerCount: number) => {
    // Initialize Players with Animals
    const newPlayers: Player[] = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: ANIMAL_PLAYERS[i].name,
      avatar: ANIMAL_PLAYERS[i].avatar,
      score: 0
    }));
    setPlayers(newPlayers);
    setAppState(AppState.CATEGORY_SELECT);
  };

  const handleCategorySelection = async (selectedCategories: TriviaCategory[]) => {
    setAppState(AppState.LOADING);
    
    // Fetch Data using specific categories
    const data = await fetchGameData(selectedCategories);
    if (data.length === 0) {
       alert("Failed to load trivia. Check internet.");
       setAppState(AppState.CATEGORY_SELECT);
       return;
    }
    
    setCategories(data);
    setCurrentTurn(0);
    setAppState(AppState.BOARD);
  };

  const handleQuestionSelect = (question: ProcessedQuestion) => {
    setActiveQuestion(question);
    setAppState(AppState.QUESTION);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!activeQuestion) return;

    // Update Player Score
    setPlayers(prev => prev.map((p, i) => {
      if (i === currentTurn) {
        const change = isCorrect ? activeQuestion.pointValue : -activeQuestion.pointValue;
        return { ...p, score: p.score + change };
      }
      return p;
    }));

    // Mark Question as Answered in the state
    setCategories(prevCategories => {
      return prevCategories.map(col => {
        // Find the column containing the question
        if (col.questions.some(q => q.id === activeQuestion.id)) {
           return {
             ...col,
             questions: col.questions.map(q => 
               q.id === activeQuestion.id ? { ...q, isAnswered: true } : q
             )
           };
        }
        return col;
      });
    });

    // Move turn to next player
    setCurrentTurn(prev => (prev + 1) % players.length);
    setActiveQuestion(null);
    setAppState(AppState.BOARD);
  };

  // Check Game Over Condition
  useEffect(() => {
    if (appState === AppState.BOARD && categories.length > 0) {
      // Game ends ONLY when every single question in every column is answered
      const allAnswered = categories.every(col => 
        col.questions.every(q => q.isAnswered)
      );
      
      if (allAnswered) {
        setAppState(AppState.GAME_OVER);
      }
    }
  }, [appState, categories]);

  const handleRestart = () => {
    setAppState(AppState.SETUP);
    setCategories([]);
    setPlayers([]);
  };

  return (
    <div className="font-sans antialiased text-white min-h-screen relative z-10">
      {appState === AppState.SETUP && <SetupScreen onNext={handlePlayerSetup} />}
      {appState === AppState.CATEGORY_SELECT && (
        <CategorySelectionScreen 
          onStartGame={handleCategorySelection} 
          onBack={() => setAppState(AppState.SETUP)}
        />
      )}
      {appState === AppState.LOADING && <LoadingScreen />}
      {appState === AppState.BOARD && (
        <GameBoard 
          categories={categories}
          players={players}
          currentPlayerIndex={currentTurn}
          onQuestionSelect={handleQuestionSelect}
        />
      )}
      {appState === AppState.QUESTION && activeQuestion && (
        <QuestionScreen 
          question={activeQuestion}
          onAnswer={handleAnswer}
        />
      )}
      {appState === AppState.GAME_OVER && (
        <GameOver players={players} onRestart={handleRestart} />
      )}
    </div>
  );
};

export default App;