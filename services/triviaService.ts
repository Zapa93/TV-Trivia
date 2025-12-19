import { CategoryColumn, ProcessedQuestion, TriviaCategory, ApiQuestion } from '../types';
import { 
  ARTISTS_ROCK, 
  ARTISTS_80S, 
  ARTISTS_90S, 
  ARTISTS_2000S, 
  ARTISTS_2010S, 
  ARTISTS_HIPHOP, 
  MOVIE_THEMES,
  FOOTBALL_CAREERS
} from './musicData';

const TRIVIA_API_URL = 'https://the-trivia-api.com/v2/questions';
const ITUNES_API_URL = 'https://itunes.apple.com/search';
const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,flags,capital,population';
const TMDB_API_URL = 'https://api.themoviedb.org/3/movie/top_rated';
const SPORTS_DB_URL = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php';

const PLAYED_ITEMS_KEY = 'trivia_played_items_v2';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Persistent History Helpers ---

const getPlayedItems = (): string[] => {
  try {
    const stored = localStorage.getItem(PLAYED_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to read played items", e);
    return [];
  }
};

const savePlayedItem = (id: string) => {
  try {
    const current = getPlayedItems();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(PLAYED_ITEMS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("Failed to save played item", e);
  }
};

export const resetPlayedTracks = () => {
  localStorage.removeItem(PLAYED_ITEMS_KEY);
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

interface Country {
  name: { common: string };
  flags: { svg: string; png: string };
  capital: string[];
  population: number;
}

// --- Logic A: Music (iTunes) ---
const fetchFromMixedList = async (list: MusicItem[], cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const playedItems = getPlayedItems();
  
  const shuffledList = shuffle(list);
  const candidates = shuffledList.slice(0, 30); // Grab more candidates
  
  const questions: ProcessedQuestion[] = [];
  const duplicatesBuffer: ProcessedQuestion[] = []; 
  
  const isMovieCat = cat.id === 'music_movies';

  const POINT_VALUE = isMovieCat ? 600 : 400;
  const TIMER_DURATION = isMovieCat ? 25 : 15;

  for (const item of candidates) {
    if (questions.length >= 5) break;

    let url = '';
    const isObject = typeof item !== 'string';
    
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
      
      if (!isObject) {
          const searchArtist = (item as string).toLowerCase();
          
          validTracks = validTracks.filter((t: any) => {
             const artistLower = (t.artistName || "").toLowerCase();
             const trackLower = (t.trackName || "").toLowerCase();
             const collectionLower = (t.collectionName || "").toLowerCase();

             if (!artistLower.includes(searchArtist)) return false;

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
        track = validTracks[Math.floor(Math.random() * validTracks.length)];
      } else {
        track = validTracks[0];
      }

      const uniqueId = `music-${track.trackId}`;

      let artistDisplay = '';
      let titleDisplay = '';

      if (isMovieCat) {
        if (isObject) {
           titleDisplay = (item as { title: string }).title;
           artistDisplay = ""; 
        } else {
           titleDisplay = track.collectionName || "Unknown Source";
           artistDisplay = "";
        }
      } else {
        if (isObject) {
           titleDisplay = (item as { title: string }).title; 
           artistDisplay = track.artistName;
        } else {
           titleDisplay = track.trackName;
           artistDisplay = track.artistName;
        }
      }

      const newQuestion: ProcessedQuestion = {
        id: uniqueId,
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

      if (playedItems.includes(uniqueId)) {
        duplicatesBuffer.push(newQuestion);
        continue;
      }

      questions.push(newQuestion);
      savePlayedItem(uniqueId);

    } catch (e) {
      console.warn("Fetch failed for item:", item);
    }
  }

  while (questions.length < 5 && duplicatesBuffer.length > 0) {
     const fallback = duplicatesBuffer.pop();
     if (fallback) {
        fallback.id = `music-dup-${Math.random()}`; 
        questions.push(fallback);
     }
  }

  return questions;
};

// --- Logic B: Standard (The Trivia API) ---
const fetchStandardQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const url = `${TRIVIA_API_URL}?categories=${cat.id}&limit=20`; // Fetch more to filter by diff
  const playedItems = getPlayedItems();

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const rawData: ApiQuestion[] = await res.json();
    
    // Filter duplicates first
    const freshQuestions = rawData.filter(q => !playedItems.includes(q.id));
    
    // Fallback if we run out of fresh questions
    const pool = freshQuestions.length >= 5 ? freshQuestions : rawData;

    const easy = pool.filter(q => q.difficulty === 'easy');
    const medium = pool.filter(q => q.difficulty === 'medium');
    const hard = pool.filter(q => q.difficulty === 'hard');

    const selectedQuestions: ProcessedQuestion[] = [];
    const pointValues = [200, 400, 600, 800, 1000];
    
    const slots = ['easy', 'medium', 'medium', 'hard', 'hard'];
    
    for (let i = 0; i < 5; i++) {
      const targetDiff = slots[i];
      let qRaw: ApiQuestion | undefined;

      if (targetDiff === 'easy') qRaw = easy.pop();
      else if (targetDiff === 'medium') qRaw = medium.pop();
      else qRaw = hard.pop();

      // Backfill if empty
      if (!qRaw) {
        if (targetDiff === 'hard') qRaw = medium.pop() || easy.pop();
        else if (targetDiff === 'medium') qRaw = hard.pop() || easy.pop();
        else qRaw = medium.pop() || hard.pop();
      }

      // Last resort: Just pick anything not selected
      if (!qRaw) qRaw = pool.find(q => !selectedQuestions.some(sq => sq.id === q.id));

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
          mediaType: 'text',
          timerDuration: 20
        });
        savePlayedItem(qRaw.id);
      }
    }
    return selectedQuestions.length === 5 ? selectedQuestions : [];

  } catch (e) {
    console.error("Standard API Error", e);
    return [];
  }
};

// --- Logic C: Geography (Rest Countries) ---
const fetchGeoQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const isFlags = cat.id === 'geo_flags';
  const playedItems = getPlayedItems();
  
  try {
    const res = await fetch(REST_COUNTRIES_URL);
    if (!res.ok) return [];

    const allCountries: Country[] = await res.json();
    const validCountries = allCountries.filter(c => c.name?.common && c.flags?.svg && c.population && c.capital?.[0]);

    if (validCountries.length < 10) return [];

    // Bucket Logic
    const easyBucket = validCountries.filter(c => c.population > 20_000_000);
    const mediumBucket = validCountries.filter(c => c.population > 5_000_000 && c.population <= 20_000_000);
    const hardBucket = validCountries.filter(c => c.population <= 5_000_000);

    const questions: ProcessedQuestion[] = [];
    const pointValues = [200, 400, 600, 800, 1000];
    
    // Slots: Easy, Easy, Medium, Medium, Hard
    const selectionOrder = [
      shuffle(easyBucket),
      shuffle(easyBucket),
      shuffle(mediumBucket),
      shuffle(mediumBucket),
      shuffle(hardBucket)
    ];

    for (let i = 0; i < 5; i++) {
       let country: Country | undefined;
       
       // Try to find an unplayed country in the bucket
       while(selectionOrder[i].length > 0) {
         const candidate = selectionOrder[i].pop();
         if (candidate) {
            const tempId = `geo-${candidate.name.common}`;
            if (!playedItems.includes(tempId) && !questions.some(q => q.id === tempId)) {
               country = candidate;
               break;
            }
         }
       }
       
       // Fallback: Pick any valid if we ran out of fresh ones
       if (!country) country = shuffle(validCountries).find(c => !questions.some(q => q.answerReveal?.title.includes(c.name.common)));
       
       if (country) {
          const qText = isFlags ? "Identify this Flag!" : "Name the Capital!";
          const countryName = country.name.common;
          const capitalName = country.capital[0];
          const uniqueId = `geo-${countryName}`;

          questions.push({
            id: uniqueId,
            category: cat.name,
            type: 'honor-system',
            difficulty: i < 2 ? 'easy' : (i < 4 ? 'medium' : 'hard'),
            question: qText,
            correct_answer: 'Honor System',
            incorrect_answers: [],
            all_answers: [],
            isAnswered: false,
            pointValue: pointValues[i],
            mediaType: 'image',
            imageUrl: country.flags.svg,
            infoText: isFlags ? undefined : countryName,
            timerDuration: 20, 
            answerReveal: {
              title: isFlags ? countryName : capitalName,
              artist: isFlags ? "Country" : "Capital" 
            }
          });
          savePlayedItem(uniqueId);
       }
    }
    
    return questions.length === 5 ? questions : [];

  } catch (e) {
    console.warn("Geo API failed", e);
    return [];
  }
};

// --- Logic D: Movie Posters (TMDB) ---
const fetchMoviePosterQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const apiKey = (import.meta as any).env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    console.error("VITE_TMDB_API_KEY is missing!");
    return [];
  }

  const playedItems = getPlayedItems();
  const questions: ProcessedQuestion[] = [];
  const pointValues = [200, 400, 600, 800, 1000];

  // Randomize pages to get different movies (Pages 1-50 are usually safe for top rated)
  const pages = shuffle(Array.from({length: 50}, (_, i) => i + 1)).slice(0, 5);
  
  // We need to fetch multiple pages potentially to find 5 fresh movies
  const candidates: any[] = [];
  
  try {
     for (const page of pages) {
        const res = await fetch(`${TMDB_API_URL}?api_key=${apiKey}&language=en-US&page=${page}`);
        const data = await res.json();
        if (data.results) {
            candidates.push(...data.results);
        }
     }
  } catch (e) {
     console.error("TMDB Fetch Error", e);
     return [];
  }

  // Filter valid candidates (must have release_date and poster)
  const validCandidates = candidates.filter(m => m.release_date && m.poster_path);
  const freshCandidates = validCandidates.filter(m => !playedItems.includes(`mov-${m.id}`));
  
  const pool = freshCandidates.length >= 5 ? freshCandidates : validCandidates;
  const selectedMovies = shuffle(pool).slice(0, 5);

  for (let i = 0; i < selectedMovies.length; i++) {
    const movie = selectedMovies[i];
    const uniqueId = `mov-${movie.id}`;
    const realYear = parseInt(movie.release_date.split('-')[0]);
    
    // Generate distractors
    const answers = new Set<string>();
    answers.add(realYear.toString());
    
    while(answers.size < 4) {
      const offset = Math.floor(Math.random() * 11) - 5; // -5 to +5
      const dYear = realYear + offset;
      if (dYear > 1900 && dYear <= new Date().getFullYear() + 1) {
          answers.add(dYear.toString());
      }
    }

    questions.push({
      id: uniqueId,
      category: cat.name,
      type: 'multiple',
      difficulty: 'medium',
      question: "Guess the Release Year!",
      correct_answer: realYear.toString(),
      incorrect_answers: [], 
      all_answers: Array.from(answers).sort(),
      isAnswered: false,
      pointValue: pointValues[i],
      mediaType: 'image',
      imageUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      infoText: movie.title, 
      timerDuration: 20
    });
    savePlayedItem(uniqueId);
  }

  return questions;
};

// --- Logic E: Football Career Path ---
const fetchCareerQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  const playedItems = getPlayedItems();
  const questions: ProcessedQuestion[] = [];
  const pointValues = [200, 400, 600, 800, 1000];
  
  // Difficulty levels 1 to 5 (mapped to grid rows)
  for (let level = 1; level <= 5; level++) {
    // Filter candidates for this level
    const candidates = FOOTBALL_CAREERS.filter(p => p.difficulty === level);
    
    // Find a unique player that hasn't been played
    const shuffled = shuffle(candidates);
    let selectedPlayer = shuffled.find(p => !playedItems.includes(`fc-${p.player}`));
    
    // Fallback if all players at this level played (reset logic not implemented, just picking one)
    if (!selectedPlayer) selectedPlayer = shuffled[0];

    if (!selectedPlayer) continue;

    const uniqueId = `fc-${selectedPlayer.player}`;
    const logoUrls: string[] = [];

    // Fetch logos for each club
    // Use Promise.all to fetch in parallel, but map results back to order
    // We must maintain the career order
    const clubPromises = selectedPlayer.clubs.map(async (clubName) => {
       try {
        const res = await fetch(`${SPORTS_DB_URL}?t=${encodeURIComponent(clubName)}`);
        const data = await res.json();
        if (data.teams && data.teams[0] && data.teams[0].strTeamBadge) {
          return data.teams[0].strTeamBadge as string;
        }
        return null;
       } catch (e) {
         return null;
       }
    });

    const results = await Promise.all(clubPromises);
    const orderedLogos = results.filter((url): url is string => url !== null);

    if (orderedLogos.length === 0) continue; // Skip if no logos found

    questions.push({
      id: uniqueId,
      category: cat.name,
      type: 'honor-system',
      difficulty: level <= 2 ? 'easy' : (level <= 4 ? 'medium' : 'hard'),
      question: "Who is this player?",
      correct_answer: "Honor System",
      incorrect_answers: [],
      all_answers: [],
      isAnswered: false,
      pointValue: pointValues[level - 1],
      mediaType: 'image_sequence',
      imageUrls: orderedLogos,
      timerDuration: 25, 
      answerReveal: {
        title: selectedPlayer.player,
        artist: "Career Path"
      }
    });
    
    savePlayedItem(uniqueId);
  }

  return questions;
};

export const fetchGameData = async (selectedCategories: TriviaCategory[]): Promise<CategoryColumn[]> => {
  const columns: CategoryColumn[] = [];

  for (const cat of selectedCategories) {
    await wait(400); 
    
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
    } else if (cat.id.startsWith('geo_')) {
      questions = await fetchGeoQuestions(cat);
    } else if (cat.id === 'mov_posters') {
      questions = await fetchMoviePosterQuestions(cat);
    } else if (cat.id === 'football_career') {
      questions = await fetchCareerQuestions(cat);
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