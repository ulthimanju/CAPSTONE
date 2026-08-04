import { useState } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui";

import { quizCardVariants } from "./QuizCard.variants";

import { QuizQuestion } from "./QuizQuestion";
import { QuizOptions } from "./QuizOptions";
import { QuizActions } from "./QuizActions";

export function QuizCard({
  question,

  onNext,

  onSubmit,
}) {
  const [selectedAnswer, setSelectedAnswer] =
    useState(null);

  const [submitted, setSubmitted] =
    useState(false);

  function handleSubmit() {
    setSubmitted(true);

    onSubmit?.(
      question,
      selectedAnswer
    );
  }

  return (
    <Card className={quizCardVariants()}>
      <CardContent>
        <QuizQuestion
          question={question}
        />

        <QuizOptions
          question={question}
          submitted={submitted}
          selectedAnswer={selectedAnswer}
          onSelect={setSelectedAnswer}
        />

        <QuizActions
          submitted={submitted}
          explanation={question.explanation}
          onSubmit={handleSubmit}
          onNext={onNext}
        />
      </CardContent>
    </Card>
  );
}