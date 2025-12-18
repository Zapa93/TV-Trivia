import { CategoryColumn, ProcessedQuestion, TriviaCategory, ApiQuestion } from '../types';
import { 
  ARTISTS_ROCK, 
  ARTISTS_80S, 
  ARTISTS_90S, 
  ARTISTS_2000S, 
  ARTISTS_2010S, 
  ARTISTS_HIPHOP, 
  MOVIE_THEMES 
} from './musicData';

const TRIVIA_API_URL = 'https://the-trivia-api.com/v2/questions';
const ITUNES_API_URL = 'https://itunes.apple.com/search';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Local Fisher-Yates Shuffle
const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

type MusicItem = string | { query: string; title: string };

// --- Smart Fetch Logic (Mixed Strings & Objects) ---
const fetchFromMixedList = async (list: MusicItem[], cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  // Shuffle and pick a buffer (8) to ensure we get 5 valid ones
  const shuffledList = shuffle(list);
  const candidates = shuffledList.slice(0, 8);
  
  const questions: ProcessedQuestion[] = [];
  const FIXED_MUSIC_VALUE = 400;
  const isMovieCat = cat.id === 'music_movies';

  for (const item of candidates) {
    if (questions.length >= 5) break;

    let url = '';
    const isObject = typeof item !== 'string';
    
    // CASE A: String (Artist) -> Fetch 5, Pick Random
    // CASE B: Object (Specific) -> Fetch 1, Pick Top
    if (!isObject) {
      const term = encodeURIComponent(item as string);
      url = `${ITUNES_API_URL}?term=${term}&entity=song&limit=5&country=US`;
    } else {
      const objItem = item as { query: string };
      const term = encodeURIComponent(objItem.query);
      url = `${ITUNES_API_URL}?term=${term}&entity=song&limit=1&country=US`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      const validTracks = (data.results || []).filter((t: any) => t.previewUrl && t.kind === 'song');
      if (validTracks.length === 0) continue;

      let track;
      if (!isObject) {
        // Random pick from artist results
        track = validTracks[Math.floor(Math.random() * validTracks.length)];
      } else {
        // Exact match
        track = validTracks[0];
      }

      // Logic for Answer Display
      let artistDisplay = '';
      let titleDisplay = '';

      if (isMovieCat) {
        // For Movies: Main Display (Answer) is the Movie Name
        if (isObject) {
           artistDisplay = (item as { title: string }).title; // Movie Name
           titleDisplay = track.artistName; // Composer (Hidden usually)
        } else {
           artistDisplay = track.collectionName || track.artistName;
           titleDisplay = track.trackName;
        }
      } else {
        // Standard Music
        if (isObject) {
           artistDisplay = track.artistName;
           titleDisplay = (item as { title: string }).title; // Use custom title
        } else {
           artistDisplay = track.artistName;
           titleDisplay = track.trackName;
        }
      }

      questions.push({
        id: `music-${track.trackId}-${questions.length}`,
        category: cat.name,
        type: 'music',
        difficulty: 'honor-system',
        question: isMovieCat ? "Guess the Movie!" : "Listen & Guess!",
        correct_answer: "Honor System",
        incorrect_answers: [],
        all_answers: [],
        isAnswered: false,
        pointValue: FIXED_MUSIC_VALUE,
        mediaType: 'audio',
        audioUrl: track.previewUrl,
        answerReveal: {
          artist: artistDisplay,
          title: titleDisplay
        }
      });

    } catch (e) {
      console.warn("Fetch failed for item:", item);
    }
  }

  return questions;
};

// --- Logic B: Standard (The Trivia API) ---
const fetchStandardQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const url = `${TRIVIA_API_URL}?categories=${cat.id}&limit=12`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const rawData: ApiQuestion[] = await res.json();
    if (rawData.length < 5) return [];

    const easy = rawData.filter(q => q.difficulty === 'easy');
    const medium = rawData.filter(q => q.difficulty === 'medium');
    const hard = rawData.filter(q => q.difficulty === 'hard');

    const selectedQuestions: ProcessedQuestion[] = [];
    const pointValues = [200, 400, 600, 800, 1000];

    for (let i = 0; i < 5; i++) {
      let qRaw: ApiQuestion | undefined;

      if (i === 0) qRaw = easy.pop() || medium.pop();
      else if (i === 1) qRaw = easy.pop() || medium.pop();
      else if (i === 2) qRaw = medium.pop() || easy.pop() || hard.pop();
      else if (i === 3) qRaw = medium.pop() || hard.pop();
      else qRaw = hard.pop() || medium.pop();

      if (!qRaw) qRaw = rawData.find(q => !selectedQuestions.some(sq => sq.id === q.id));

      if (qRaw) {
        const answerPool = [qRaw.correctAnswer, ...qRaw.incorrectAnswers];
        selectedQuestions.push({
          id: qRaw.id,
          category: cat.name,
          type: 'text',
          difficulty: qRaw.difficulty,
          question: qRaw.question.text,
          correct_answer: qRaw.correctAnswer,
          incorrect_answers: qRaw.incorrectAnswers,
          all_answers: shuffle(answerPool),
          isAnswered: false,
          pointValue: pointValues[i],
          mediaType: 'text'
        });
      }
    }
    return selectedQuestions.length === 5 ? selectedQuestions : [];

  } catch (e) {
    console.error("Standard API Error", e);
    return [];
  }
};

export const fetchGameData = async (selectedCategories: TriviaCategory[]): Promise<CategoryColumn[]> => {
  const columns: CategoryColumn[] = [];

  for (const cat of selectedCategories) {
    await wait(400); // Gentle pacing
    
    let questions: ProcessedQuestion[] = [];

    if (cat.id.startsWith('music_')) {
      let list: MusicItem[] = [];
      
      switch (cat.id) {
        case 'music_rock': list = ARTISTS_ROCK; break;
        case 'music_80s': list = ARTISTS_80S; break;
        case 'music_90s': list = ARTISTS_90S; break;
        case 'music_2000s': list = ARTISTS_2000S; break;
        case 'music_2010s': list = ARTISTS_2010S; break;
        case 'music_hiphop': list = ARTISTS_HIPHOP; break;
        case 'music_movies': list = MOVIE_THEMES; break;
        default: list = ARTISTS_2010S;
      }
      
      questions = await fetchFromMixedList(list, cat);
    } else {
      questions = await fetchStandardQuestions(cat);
    }

    if (questions.length === 5) {
      columns.push({
        title: cat.name,
        questions: questions
      });
    }
  }

  return columns;
};