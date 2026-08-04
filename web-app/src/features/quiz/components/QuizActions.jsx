import {
  Button,
  Typography,
} from "@/components/ui";

import { quizFooterVariants } from "./QuizCard.variants";

export function QuizActions({
  submitted,

  explanation,

  onSubmit,

  onNext,
}) {
  return (
    <div className={quizFooterVariants()}>
      {submitted ? (
        <>
          <Typography
            variant="body-small"
            color="muted"
          >
            {explanation}
          </Typography>

          <Button
            onClick={onNext}
          >
            Next Question
          </Button>
        </>
      ) : (
        <Button
          onClick={onSubmit}
        >
          Submit Answer
        </Button>
      )}
    </div>
  );
}