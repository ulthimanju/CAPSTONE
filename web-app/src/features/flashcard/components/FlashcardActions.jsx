import {
  Button,
} from "@/components/ui";

import {
  flashcardFooterVariants,
} from "./Flashcard.variants";

export function FlashcardActions({
  revealed,

  onReveal,

  onPrevious,

  onNext,

  onDifficulty,
}) {
  return (
    <div className={flashcardFooterVariants()}>
      <Button
        variant="ghost"
        onClick={onPrevious}
      >
        Previous
      </Button>

      {!revealed ? (
        <Button
          onClick={onReveal}
        >
          Reveal Answer
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onDifficulty("easy")
            }
          >
            Easy
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onDifficulty("medium")
            }
          >
            Medium
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onDifficulty("hard")
            }
          >
            Hard
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        onClick={onNext}
      >
        Next
      </Button>
    </div>
  );
}