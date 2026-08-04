import { cn } from "@/lib/cn";

import {
  Radio,
  Typography,
} from "@/components/ui";

import {
  quizOptionVariants,
  quizOptionsVariants,
} from "./QuizCard.variants";

export function QuizOptions({
  question,

  submitted,

  selectedAnswer,

  onSelect,
}) {
  return (
    <div className={quizOptionsVariants()}>
      {question.options.map(
        (option, index) => {
          let state = "default";

          if (submitted) {
            if (
              index ===
              question.correctAnswer
            ) {
              state = "correct";
            } else if (
              index ===
              selectedAnswer
            ) {
              state = "incorrect";
            }
          } else if (
            index === selectedAnswer
          ) {
            state = "selected";
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() =>
                !submitted &&
                onSelect(index)
              }
              className={cn(
                quizOptionVariants({
                  state,
                })
              )}
            >
              <Radio
                checked={
                  selectedAnswer === index
                }
                readOnly
              />

              <Typography>
                {option}
              </Typography>
            </button>
          );
        }
      )}
    </div>
  );
}