import { CategoryColumn, ProcessedQuestion, TriviaCategory, ApiQuestion } from '../types';

const BASE_URL = 'https://the-trivia-api.com/v2/questions';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Local Fisher-Yates Shuffle Algorithm to ensure randomness
const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const fetchGameData = async (selectedCategories: TriviaCategory[]): Promise<CategoryColumn[]> => {
  const columns: CategoryColumn[] = [];

  try {
    for (const cat of selectedCategories) {
      // 1. Gentle Pacing
      await wait(600);

      // 2. Fetch Batch (Limit 12 to ensure distribution)
      // The Trivia API uses 'categories' query param with the tag
      const url = `${BASE_URL}?categories=${cat.id}&limit=12`;
      
      let rawData: ApiQuestion[] = [];
      
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch category: ${cat.name} (${res.status})`);
          continue; 
        }
        rawData = await res.json();
      } catch (err) {
        console.error(`Network error for ${cat.name}:`, err);
        continue;
      }

      if (!rawData || rawData.length < 5) {
        console.warn(`Not enough questions returned for ${cat.name}`);
        continue;
      }

      // 3. Local Sorting/Filtering
      const easy = rawData.filter(q => q.difficulty === 'easy');
      const medium = rawData.filter(q => q.difficulty === 'medium');
      const hard = rawData.filter(q => q.difficulty === 'hard');

      const selectedQuestions: ProcessedQuestion[] = [];
      const pointValues = [200, 400, 600, 800, 1000];

      // We need to fill 5 slots. 
      // Ideal distribution: Easy, Easy, Medium, Medium, Hard
      // Or: Easy, Medium, Medium, Hard, Hard
      
      for (let i = 0; i < 5; i++) {
        let qRaw: ApiQuestion | undefined;

        // Slot Logic
        if (i === 0) {
           qRaw = easy.pop() || medium.pop();
        } else if (i === 1) {
           qRaw = easy.pop() || medium.pop();
        } else if (i === 2) {
           qRaw = medium.pop() || easy.pop() || hard.pop();
        } else if (i === 3) {
           qRaw = medium.pop() || hard.pop();
        } else {
           qRaw = hard.pop() || medium.pop();
        }

        if (!qRaw) {
          // Absolute fallback if specific buckets ran dry
          qRaw = rawData.find(q => !selectedQuestions.some(sq => sq.id === q.id));
        }

        if (qRaw) {
          // Construct the pool of answers
          const answerPool = [qRaw.correctAnswer, ...qRaw.incorrectAnswers];

          // Transform to ProcessedQuestion
          const processed: ProcessedQuestion = {
            id: qRaw.id,
            category: cat.name, // Use our display name
            type: qRaw.type,
            difficulty: qRaw.difficulty,
            question: qRaw.question.text, // New API structure
            correct_answer: qRaw.correctAnswer,
            incorrect_answers: qRaw.incorrectAnswers,
            all_answers: shuffle(answerPool), // Explicitly shuffle here
            isAnswered: false,
            pointValue: pointValues[i]
          };
          selectedQuestions.push(processed);
        }
      }

      if (selectedQuestions.length === 5) {
        columns.push({
          title: cat.name,
          questions: selectedQuestions
        });
      }
    }

    return columns;

  } catch (error) {
    console.error("Fatal error fetching trivia data", error);
    return [];
  }
};