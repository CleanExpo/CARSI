'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: QuizOption[];
  order_index: number;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  pass_percentage: number;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  questions: QuizQuestion[];
}

interface QuizPlayerProps {
  quiz: Quiz;
  onSubmit: (answers: Record<string, number>) => void;
}

export function QuizPlayer({ quiz, onSubmit }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function handleSelect(questionId: string, optionIdx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{quiz.title}</h2>
        <p className="text-muted-foreground text-sm">
          Passing score: {quiz.pass_percentage}% &nbsp;|&nbsp; Attempts allowed:{' '}
          {quiz.attempts_allowed}
        </p>
      </div>

      {quiz.questions.map((q, qIdx) => (
        <fieldset key={q.id} className="space-y-3">
          <legend className="text-base font-medium">
            <span className="text-muted-foreground mr-1">{qIdx + 1}.</span> {q.question_text}
          </legend>
          {q.options.map((opt, idx) => (
            <label
              key={idx}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3"
            >
              <input
                type="radio"
                name={q.id}
                value={idx}
                checked={answers[q.id] === idx}
                onChange={() => handleSelect(q.id, idx)}
              />
              {opt.text}
            </label>
          ))}
        </fieldset>
      ))}

      <Button onClick={handleSubmit}>Submit Quiz</Button>
    </div>
  );
}
