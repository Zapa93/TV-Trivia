import { CategoryColumn, ProcessedQuestion, Difficulty, TriviaCategory } from '../types';
import { decodeHtml, shuffleArray } from '../utils/helpers';

const BASE_URL = 'https://opentdb.com/api.php';

// Map point values to difficulties conceptually
const getDifficultyForIndex = (index: number): Difficulty => {
  if (index <= 1) return Difficulty.EASY; // $200, $400
  if (index <= 3) return Difficulty.MEDIUM; // $600, $800
  return Difficulty.HARD; // $1000
};

export const fetchGameData = async (selectedCategories: TriviaCategory[]): Promise<CategoryColumn[]> => {
  try {
    const columns: CategoryColumn[] = [];

    // Fetch questions for each selected category sequentially
    for (const cat of selectedCategories) {
      // Fetch 15 questions to ensure we have enough distribution
      const url = `${BASE_URL}?amount=15&category=${cat.id}&type=multiple`;
      
      const res = await fetch(url);
      
      // Handle Rate Limiting (Wait 5 seconds if hit)
      if (res.status === 429) {
         await new Promise(resolve => setTimeout(resolve, 5000));
         const retryRes = await fetch(url);
         if (!retryRes.ok) throw new Error('API Retry failed');
      }
      
      const data = await res.json();
      
      if (data.response_code !== 0) {
        console.warn(`Skipping category ${cat.name} due to API error code ${data.response_code}`);
        continue;
      }
      
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
          // Fallbacks
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
      
      // Delay slightly between categories to be nice to API
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return columns;

  } catch (error) {
    console.error("Failed to fetch trivia data", error);
    return [];
  }
};