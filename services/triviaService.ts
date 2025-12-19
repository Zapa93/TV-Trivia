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
const PLAYED_TRACKS_KEY = 'trivia_played_tracks';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- LocalStorage Helpers ---

const getPlayedTracks = (): string[] => {
  try {
    const stored = localStorage.getItem(PLAYED_TRACKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to read played tracks", e);
    return [];
  }
};

const savePlayedTrack = (id: string) => {
  try {
    const current = getPlayedTracks();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(PLAYED_TRACKS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("Failed to save played track", e);
  }
};

export const resetPlayedTracks = () => {
  localStorage.removeItem(PLAYED_TRACKS_KEY);
};

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
  const playedTracks = getPlayedTracks();
  
  // Shuffle and pick a larger buffer (25) to increase odds of finding unique unplayed songs
  const shuffledList = shuffle(list);
  const candidates = shuffledList.slice(0, 25); 
  
  const questions: ProcessedQuestion[] = [];
  const duplicatesBuffer: ProcessedQuestion[] = []; // Store valid but played tracks as fallback
  
  const isMovieCat = cat.id === 'music_movies';

  // --- Rules Configuration ---
  const POINT_VALUE = isMovieCat ? 600 : 400;
  const TIMER_DURATION = isMovieCat ? 25 : 15;

  for (const item of candidates) {
    if (questions.length >= 5) break;

    let url = '';
    const isObject = typeof item !== 'string';
    
    // CASE A: String (Artist) -> Fetch 25 to allow for strict filtering
    // CASE B: Object (Specific) -> Fetch 1 (Exact Query)
    if (!isObject) {
      const term = encodeURIComponent(item as string);
      url = `${ITUNES_API_URL}?term=${term}&entity=song&limit=25&country=US`;
    } else {
      const objItem = item as { query: string };
      const term = encodeURIComponent(objItem.query);
      url = `${ITUNES_API_URL}?term=${term}&entity=song&limit=1&country=US`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      let validTracks = (data.results || []).filter((t: any) => t.previewUrl && t.kind === 'song');
      
      // Strict Validation for Artist Mode
      if (!isObject) {
          const searchArtist = (item as string).toLowerCase();
          
          validTracks = validTracks.filter((t: any) => {
             const artistLower = (t.artistName || "").toLowerCase();
             const trackLower = (t.trackName || "").toLowerCase();
             const collectionLower = (t.collectionName || "").toLowerCase();

             // 1. Strict Artist Check
             if (!artistLower.includes(searchArtist)) return false;

             // 2. Anti-Cover/Tribute/Karaoke Filter
             const forbiddenTerms = ["tribute", "cover", "karaoke"];
             if (forbiddenTerms.some(term => trackLower.includes(term))) return false;
             if (forbiddenTerms.some(term => collectionLower.includes(term))) return false;
             if (forbiddenTerms.some(term => artistLower.includes(term))) return false;

             return true;
          });
      }

      if (validTracks.length === 0) continue;

      let track;
      if (!isObject) {
        // Random pick from the strictly filtered results
        track = validTracks[Math.floor(Math.random() * validTracks.length)];
      } else {
        // Exact match
        track = validTracks[0];
      }

      const trackId = track.trackId.toString();

      // Logic for Answer Display
      let artistDisplay = '';
      let titleDisplay = '';

      if (isMovieCat) {
        // For Movies: Only show the Source (Movie/TV Show Name)
        // QuestionScreen displays 'title' as H2 (Big) and 'artist' as H3 (Small)
        if (isObject) {
           titleDisplay = (item as { title: string }).title; // Movie Name
           artistDisplay = ""; // Hide artist/track info
        } else {
           titleDisplay = track.collectionName || "Unknown Source";
           artistDisplay = "";
        }
      } else {
        // Standard Music
        if (isObject) {
           // Specific Song Mode: Use custom title from our list for the Song Name
           titleDisplay = (item as { title: string }).title; 
           artistDisplay = track.artistName;
        } else {
           // Artist Mode
           titleDisplay = track.trackName;
           artistDisplay = track.artistName;
        }
      }

      // Construct Question Object
      const newQuestion: ProcessedQuestion = {
        id: `music-${track.trackId}`, // Temporary ID
        category: cat.name,
        type: 'music',
        difficulty: 'honor-system',
        question: isMovieCat ? "Guess the Soundtrack!" : "Listen & Guess!",
        correct_answer: "Honor System",
        incorrect_answers: [],
        all_answers: [],
        isAnswered: false,
        pointValue: POINT_VALUE,
        mediaType: 'audio',
        audioUrl: track.previewUrl,
        timerDuration: TIMER_DURATION,
        answerReveal: {
          artist: artistDisplay,
          title: titleDisplay
        }
      };

      // Check History
      if (playedTracks.includes(trackId)) {
        // It's a duplicate. Save it in buffer but don't add to main list yet.
        duplicatesBuffer.push(newQuestion);
        continue;
      }

      // It's Unique! Add it.
      // Fix ID index relative to current length
      newQuestion.id = `music-${track.trackId}-${questions.length}`;
      questions.push(newQuestion);
      savePlayedTrack(trackId);

    } catch (e) {
      console.warn("Fetch failed for item:", item);
    }
  }

  // Fallback: If we couldn't find 5 unique songs, fill up with duplicates
  while (questions.length < 5 && duplicatesBuffer.length > 0) {
     console.warn(`Ran out of unique songs for ${cat.name}. Using a duplicate.`);
     const fallback = duplicatesBuffer.pop();
     if (fallback) {
        fallback.id = `music-dup-${questions.length}`; // Ensure unique key for React
        questions.push(fallback);
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