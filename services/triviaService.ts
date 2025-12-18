import { CategoryColumn, ProcessedQuestion, TriviaCategory, ApiQuestion, ItunesTrack } from '../types';

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

// --- Helper: Clean Movie Names ---
const cleanMovieTitle = (title: string): string => {
  // Removes text inside brackets/parentheses like (Original Motion Picture Soundtrack), [OST], etc.
  return title
    .replace(/\s*[\(\[].*?(soundtrack|score|motion picture|ost|music from).*?[\)\]]/gi, '')
    .replace(/\s*-\s*main title/gi, '')
    .trim();
};

// --- Logic A: Music (iTunes) ---
const fetchMusicQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  let url = '';
  const isMovieCategory = cat.id === 'music_movies';
  
  // Quality Control: Force US store, limit 80 for top hits
  const commonParams = '&media=music&entity=song&limit=80&country=US';

  if (isMovieCategory) {
    // Specialized Movie Search
    url = `${ITUNES_API_URL}?term=movie+soundtrack+highlights${commonParams}`;
  } else {
    // Standard Hits Search
    let term = 'hits';
    switch(cat.id) {
      case 'music_2010s': term = '2010s+pop+essentials'; break;
      case 'music_2000s': term = '2000s+pop+anthems'; break;
      case 'music_90s': term = '90s+greatest+hits'; break;
      case 'music_80s': term = '80s+pop+classics'; break;
      case 'music_rock': term = 'rock+hall+of+fame+anthems'; break;
      case 'music_hiphop': term = 'hip+hop+r&b+essentials'; break;
      default: term = 'top+hits';
    }
    url = `${ITUNES_API_URL}?term=${term}${commonParams}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    let validTracks: any[] = [];

    if (isMovieCategory) {
      // --- Smart Filtering for Movies ---
      validTracks = data.results.filter((t: any) => {
        if (!t.previewUrl || t.kind !== 'song') return false;
        
        const genre = (t.primaryGenreName || '').toLowerCase();
        const name = (t.trackName || '').toLowerCase();
        
        // Must be Soundtrack genre
        const isSoundtrack = genre.includes('soundtrack') || genre.includes('score');
        
        // Boost relevance: Look for "Theme" or "Main Title" to avoid random pop songs in movies
        const isTheme = name.includes('theme') || name.includes('main title') || name.includes('opening') || name.includes('suite');

        return isSoundtrack && isTheme;
      });
    } else {
      // Standard Filter
      validTracks = data.results.filter((t: any) => t.previewUrl && t.kind === 'song');
    }
    
    if (validTracks.length < 5) return [];

    const shuffled = shuffle(validTracks);
    const selected = shuffled.slice(0, 5);
    
    // Music Questions are ALWAYS flat rate $400
    const FIXED_MUSIC_VALUE = 400;

    return selected.map((track, idx) => {
      // For Movies: Artist = Movie Name (Cleaned), Title = Track Name
      // For Hits: Artist = Artist Name, Title = Track Name
      const artistDisplay = isMovieCategory ? cleanMovieTitle(track.collectionName || track.artistName) : track.artistName;
      const titleDisplay = track.trackName;

      return {
        id: `music-${track.trackId}-${idx}`,
        category: cat.name,
        type: 'music', // Used for styling
        difficulty: 'honor-system',
        question: isMovieCategory ? "Guess the Movie!" : "Listen & Guess!",
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
      };
    });
  } catch (e) {
    console.error("iTunes Fetch Error", e);
    return [];
  }
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
    await wait(600); // Gentle pacing
    
    let questions: ProcessedQuestion[] = [];

    if (cat.id.startsWith('music_')) {
      questions = await fetchMusicQuestions(cat);
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