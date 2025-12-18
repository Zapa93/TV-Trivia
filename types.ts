export enum AppState {
  SETUP,
  LOADING,
  BOARD,
  QUESTION,
  GAME_OVER
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface QuestionData {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface ProcessedQuestion extends QuestionData {
  id: string;
  all_answers: string[]; // Shuffled answers
  isAnswered: boolean;
  pointValue: number;
}

export interface CategoryColumn {
  title: string;
  questions: ProcessedQuestion[];
}

export interface Player {
  id: number;
  name: string;
  score: number;
}

export enum RemoteKey {
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
  ENTER = 'Enter',
  BACK = 'Backspace', // Often mapped to Back on TV
  BACK_ALT = 'Escape',
  RED = 'Red',
  GREEN = 'Green',
  YELLOW = 'Yellow',
  BLUE = 'Blue'
}

// WebOS specific key codes often used if key names aren't mapped standardly
export const TV_KEY_CODES: { [key: number]: RemoteKey } = {
  403: RemoteKey.RED,
  404: RemoteKey.GREEN,
  405: RemoteKey.YELLOW,
  406: RemoteKey.BLUE,
  461: RemoteKey.BACK,
  37: RemoteKey.LEFT,
  38: RemoteKey.UP,
  39: RemoteKey.RIGHT,
  40: RemoteKey.DOWN,
  13: RemoteKey.ENTER,
};
