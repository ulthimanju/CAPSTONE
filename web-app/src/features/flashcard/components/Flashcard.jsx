import { useState } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui";

import {
  flashcardVariants,
} from "./Flashcard.variants";

import { FlashcardActions } from "./FlashcardActions";
import { FlashcardFace } from "./FlashcardFace";

export function Flashcard({
  flashcard,

  onPrevious,

  onNext,

  onDifficulty,
}) {
  const [revealed, setRevealed] =
    useState(false);

  return (
    <Card className={flashcardVariants()}>
      <CardContent>
        <FlashcardFace
          revealed={revealed}
          flashcard={flashcard}
        />

        <FlashcardActions
          revealed={revealed}
          onReveal={() =>
            setRevealed(v => !v)
          }
          onPrevious={onPrevious}
          onNext={onNext}
          onDifficulty={onDifficulty}
        />
      </CardContent>
    </Card>
  );
}