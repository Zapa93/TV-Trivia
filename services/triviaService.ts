import { CategoryColumn, ProcessedQuestion, Difficulty, TriviaCategory } from '../types';
import { decodeHtml, shuffleArray } from '../utils/helpers';

const BASE_URL = 'https://opentdb.com/api.php';
const TOKEN_URL = 'https://opentdb.com/api_token.php?command=request';

// Map point values to difficulties conceptually
const getDifficultyForIndex = (index: number): Difficulty => {
  if (index <= 1) return Difficulty.EASY; // $200, $400
  if (index <= 3) return Difficulty.MEDIUM; // $600, $800
  return Difficulty.HARD; // $1000
};

const getSessionToken = async (): Promise<string | null> => {
  try {
    const res = await fetch(TOKEN_URL);
    const data = await res.json();
    if (data.response_code === 0) {
      return data.token;
    }
    return null;
  } catch (e) {
    console.warn("Could not fetch session token", e);
    return null;
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchGameData = async (selectedCategories: TriviaCategory[]): Promise<CategoryColumn[]> => {
  try {
    const columns: CategoryColumn[] = [];
    const token = await getSessionToken();

    // Fetch questions for each selected category sequentially
    for (const cat of selectedCategories) {
      let attempts = 0;
      let success = false;
      let data: any = null;

      // 1. Fetch Loop with Retry for Rate Limits
      while (attempts < 3 && !success) {
        try {
          // Fetch 15 questions to ensure we have enough distribution
          let url = `${BASE_URL}?amount=15&category=${cat.id}&type=multiple`;
          if (token) url += `&token=${token}`;

          const res = await fetch(url);
          
          // Handle HTTP 429
          if (res.status === 429) {
            console.warn(`Hit HTTP 429 for ${cat.name}, waiting...`);
            await wait(2000);
            attempts++;
            continue;
          }

          data = await res.json();

          // Handle API Logic Rate Limit (Code 5)
          if (data.response_code === 5) {
            console.warn(`Hit API Code 5 (Rate Limit) for ${cat.name}, waiting...`);
            await wait(2000);
            attempts++;
            continue;
          }

          if (data.response_code !== 0) {
            console.warn(`Skipping category ${cat.name} due to API error code ${data.response_code}`);
            break; // Fatal error for this category (e.g. not enough questions), stop retrying
          }

          // If we got here, we have data
          success = true;

        } catch (err) {
          console.error(`Network error fetching ${cat.name}`, err);
          attempts++;
          await wait(1000);
        }
      }

      if (!success || !data) {
        continue; 
      }
      
      // 2. Process Data
      let pool = data.results as any[];

      // Bucket questions by difficulty
      const easy = pool.filter(q => q.difficulty === 'easy');
      const medium = pool.filter(q => q.difficulty === 'medium');
      const hard = pool.filter(q => q.difficulty === 'hard');

      const selectedQuestions: ProcessedQuestion[] = [];
      const values = [200, 400, 600, 800, 1000];

      for (let i = 0; i < 5; i++) {
        let qRaw;
        const targetDiff = getDifficultyForIndex(i);
        
        if (targetDiff === Difficulty.EASY && easy.length > 0) qRaw = easy.pop();
        else if (targetDiff === Difficulty.MEDIUM && medium.length > 0) qRaw = medium.pop();
        else if (targetDiff === Difficulty.HARD && hard.length > 0) qRaw = hard.pop();
        else {
          // Fallbacks if exact difficulty missing
          qRaw = medium.pop() || easy.pop() || hard.pop();
        }

        if (!qRaw) break;

        const processed: ProcessedQuestion = {
          category: decodeHtml(qRaw.category),
          type: qRaw.type,
          difficulty: qRaw.difficulty,
          question: decodeHtml(qRaw.question),
          correct_answer: decodeHtml(qRaw.correct_answer),
          incorrect_answers: qRaw.incorrect_answers.map(decodeHtml),
          all_answers: shuffleArray([decodeHtml(qRaw.correct_answer), ...qRaw.incorrect_answers.map(decodeHtml)]),
          id: `${cat.id}-${i}`,
          isAnswered: false,
          pointValue: values[i]
        };
        
        selectedQuestions.push(processed);
      }

      // Only add column if we successfully got 5 questions
      if (selectedQuestions.length === 5) {
        columns.push({
          title: cat.name, // Use our local clean name
          questions: selectedQuestions
        });
      }
      
      // 3. Mandatory Delay between categories to respect API terms
      await wait(1500);
    }

    return columns;

  } catch (error) {
    console.error("Failed to fetch trivia data", error);
    return [];
  }
};