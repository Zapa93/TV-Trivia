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

// --- Logic A: Music (iTunes) ---
const fetchMusicQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  // Map our IDs to iTunes search terms
  let term = 'hits';
  switch(cat.id) {
    case 'music_2010s': term = 'hits+2010s'; break;
    case 'music_2000s': term = 'hits+2000s'; break;
    case 'music_90s': term = 'hits+90s'; break;
    case 'music_80s': term = 'hits+80s'; break;
    case 'music_rock': term = 'rock+classics'; break;
    case 'music_hiphop': term = 'hip+hop+hits'; break;
    case 'music_movies': term = 'movie+soundtrack'; break;
  }

  const url = `${ITUNES_API_URL}?term=${term}&media=music&entity=song&limit=200`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Filter for valid previews
    const validTracks: ItunesTrack[] = data.results.filter((t: any) => t.previewUrl && t.kind === 'song');
    
    if (validTracks.length < 5) return [];

    const shuffled = shuffle(validTracks);
    const selected = shuffled.slice(0, 5);
    const pointValues = [200, 400, 600, 800, 1000];

    return selected.map((track, idx) => ({
      id: `music-${track.trackId}`,
      category: cat.name,
      type: 'music',
      difficulty: 'honor-system',
      question: "Listen & Guess!",
      correct_answer: "Honor System",
      incorrect_answers: [],
      all_answers: [],
      isAnswered: false,
      pointValue: pointValues[idx],
      mediaType: 'audio',
      audioUrl: track.previewUrl,
      answerReveal: {
        artist: track.artistName,
        title: track.trackName
      }
    }));
  } catch (e) {
    console.error("iTunes Fetch Error", e);
    return [];
  }
};

// --- Logic B: Standard (The Trivia API) ---
const fetchStandardQuestions = async (cat: TriviaCategory): Promise<ProcessedQuestion[]> => {
  // The Trivia API call
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
          type: qRaw.type,
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