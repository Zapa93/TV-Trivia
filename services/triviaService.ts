import { CategoryColumn, ProcessedQuestion, Difficulty } from '../types';
import { decodeHtml, shuffleArray } from '../utils/helpers';

const BASE_URL = 'https://opentdb.com/api.php';
const CATEGORY_LIST_URL = 'https://opentdb.com/api_category.php';

interface ApiCategory {
  id: number;
  name: string;
}

// Map point values to difficulties conceptually
const getDifficultyForIndex = (index: number): Difficulty => {
  if (index <= 1) return Difficulty.EASY; // $200, $400
  if (index <= 3) return Difficulty.MEDIUM; // $600, $800
  return Difficulty.HARD; // $1000
};

export const fetchGameData = async (): Promise<CategoryColumn[]> => {
  try {
    // 1. Fetch all categories
    const catRes = await fetch(CATEGORY_LIST_URL);
    const catData = await catRes.json();
    const allCategories: ApiCategory[] = catData.trivia_categories;

    // 2. Shuffle and pick 6 distinct categories
    const selectedCategories = shuffleArray(allCategories).slice(0, 6);

    const columns: CategoryColumn[] = [];

    // 3. For each category, fetch questions
    // Note: To avoid rate limits and ensuring distribution, we might need multiple calls or one big call.
    // Strategy: Fetch 12 questions of mixed difficulty per category, sort them, and pick 5.
    
    // We will do these sequentially to be nice to the API (OpenTDB can 429 if spammed)
    for (const cat of selectedCategories) {
      // Fetch 15 questions to ensure we have enough distribution (OpenTDB doesn't guarantee exact difficulty counts in mixed mode perfectly sometimes)
      const url = `${BASE_URL}?amount=15&category=${cat.id}&type=multiple`;
      
      const res = await fetch(url);
      
      // Handle Rate Limiting (Wait 5 seconds if hit, simple retry logic)
      if (res.status === 429) {
         await new Promise(resolve => setTimeout(resolve, 5000));
         // Retry once
         const retryRes = await fetch(url);
         if (!retryRes.ok) throw new Error('API Retry failed');
      }
      
      const data = await res.json();
      
      if (data.response_code !== 0) {
        console.warn(`Skipping category ${cat.name} due to API error code ${data.response_code}`);
        continue; // Skip bad category
      }
      
      let pool = data.results as any[];

      // Bucket questions by difficulty
      const easy = pool.filter(q => q.difficulty === 'easy');
      const medium = pool.filter(q => q.difficulty === 'medium');
      const hard = pool.filter(q => q.difficulty === 'hard');

      const selectedQuestions: ProcessedQuestion[] = [];
      const values = [200, 400, 600, 800, 1000];

      // We need 5 questions. We try to fill slots 0-1 with easy, 2-3 with medium, 4 with hard.
      // Fallback: If not enough specific difficulty, take from others.
      
      for (let i = 0; i < 5; i++) {
        let qRaw;
        const targetDiff = getDifficultyForIndex(i);
        
        if (targetDiff === Difficulty.EASY && easy.length > 0) qRaw = easy.pop();
        else if (targetDiff === Difficulty.MEDIUM && medium.length > 0) qRaw = medium.pop();
        else if (targetDiff === Difficulty.HARD && hard.length > 0) qRaw = hard.pop();
        else {
          // Fallbacks
          qRaw = medium.pop() || easy.pop() || hard.pop();
        }

        if (!qRaw) break; // Should not happen given we fetched 15

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
          title: decodeHtml(cat.name).split(':').pop()?.trim() || cat.name, // Remove "Entertainment: " prefix
          questions: selectedQuestions
        });
      }
      
      // Delay slightly between categories
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return columns.slice(0, 6); // Ensure max 6

  } catch (error) {
    console.error("Failed to fetch trivia data", error);
    return [];
  }
};
