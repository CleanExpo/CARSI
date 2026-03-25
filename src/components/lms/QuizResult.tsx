import { Button } from '@/components/ui/button';

interface QuizResultData {
  quiz_id: string;
  score_percentage: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
}

interface QuizResultProps {
  result: QuizResultData;
  onRetry: () => void;
}

export function QuizResult({ result, onRetry }: QuizResultProps) {
  const { score_percentage, passed, correct_count, total_questions } = result;

  return (
    <div className="space-y-4 text-center">
      <p className="text-5xl font-bold">{score_percentage}%</p>

      <p className={`text-xl font-semibold ${passed ? 'text-green-600' : 'text-destructive'}`}>
        {passed ? 'Passed' : 'Failed'}
      </p>

      <p className="text-muted-foreground">
        {correct_count} / {total_questions} correct
      </p>

      {!passed && (
        <Button variant="outline" onClick={onRetry}>
          Retry Quiz
        </Button>
      )}
    </div>
  );
}
